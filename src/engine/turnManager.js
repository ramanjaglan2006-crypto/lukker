// Turn Manager v3 — orchestrates: Bankroll → Poker → Direction → [Player Choice] → Components → Movement → Next Turn
//
// The [Player Choice] phase is new for Tiers 4 and 5, where the player must
// select movement values before component execution begins.

import { Phase, Direction, PokerResultType, BANKROLL_PER_TURN, cloneState, getNextPlayer, computePieceStatus, getCurrentComponent, allComponentsAssigned } from './gameState.js';

import { applyPokerAction, resolveShowdown } from './pokerEngine.js';
import { createDeck, shuffleDeck, dealCards } from './pokerCore.js';
import { getBotAction } from './pokerBot.js';
import { decomposeWinnings } from './movementPool.js';
import { validatePlayerChoices, resolvePlayerChoices } from './movementTier.js';
import { validateMove, validateBackwardMove, getAllLegalMoves, getAllLegalBackwardMoves, hasAnyLegalMove, hasAnyBackwardMove, getMovablePieceIndices, getBackwardMovablePieceIndices } from './movement.js';
import { checkWin, updateRankings, isGameOver, finalizeGame, getFinishedCount } from './winCondition.js';
import { FINISH_POSITION } from './board.js';
import { EventTypes } from './events.js';

// ─── Phase Transitions ─────────────────────────────────────────────

/**
 * Initialize a new game and transition to WAITING → first turn.
 */
export function initializeGame(gameState) {
  const state = cloneState(gameState);
  const events = [];

  state.phase = Phase.WAITING;
  events.push({ type: EventTypes.GAME_CREATED, payload: { gameId: state.gameId, playerCount: state.playerCount } });
  events.push({ type: EventTypes.GAME_STARTED, payload: { firstPlayer: state.currentPlayer } });

  return { state, events };
}

/**
 * Start a new turn for the current player.
 * Transitions: WAITING/TURN_COMPLETE → POKER_ROUND
 * Resets bankroll to 6 (no carryover).
 */
export function startTurn(gameState) {
  const state = cloneState(gameState);
  const events = [];

  // Fresh bankroll — RULE 1: every turn starts with exactly 6
  state.bankroll = BANKROLL_PER_TURN;
  state.phase = Phase.POKER_ROUND;

  // Clear previous turn state
  state.pokerResult = null;
  state.movementDirection = null;
  state.movementTarget = null;
  state.movementTier = null;
  state.playerChoicePhase = false;
  state.pendingPlayerChoices = [];
  state.movementComponents = [];
  state.componentAssignments = [];
  state.currentComponentIndex = 0;
  state.totalWinnings = 0;
  state.movementPool = 0;
  state.movementUsed = 0;
  state.movementAllocations = [];

  events.push({
    type: EventTypes.TURN_STARTED,
    payload: { player: state.currentPlayer, turnNumber: state.turnNumber },
  });

  events.push({
    type: EventTypes.BANKROLL_SET,
    payload: { player: state.currentPlayer, bankroll: BANKROLL_PER_TURN },
  });

  events.push({
    type: EventTypes.POKER_STARTED,
    payload: { player: state.currentPlayer, bankroll: BANKROLL_PER_TURN },
  });

  return { state, events };
}

/**
 * Starts the interactive poker round (Blinds, Deal, Pre-Flop).
 * Transitions: WAITING / TURN_COMPLETE → POKER_PRE_FLOP
 */
export function startPokerRound(gameState) {
  const state = cloneState(gameState);
  const events = [];

  // Reset Poker state for the round
  state.activePokerPlayers = [...state.turnOrder];
  state.pot = 0;
  state.communityCards = [];
  state.deck = shuffleDeck(createDeck());
  state.currentBetToMatch = 0;
  state.tiedPokerWinners = [];
  state.currentTieIndex = 0;
  
  // Reset players
  state.turnOrder.forEach(playerId => {
    state.pokerPlayers[playerId] = {
      holeCards: [],
      bankroll: BANKROLL_PER_TURN, // RULE: Exactly 6
      currentBet: 0,
      hasFolded: false,
      isAllIn: false,
      hasActed: false
    };
  });

  // Deal Hole Cards
  state.activePokerPlayers.forEach(playerId => {
    state.pokerPlayers[playerId].holeCards = dealCards(state.deck, 2);
  });

  // Blinds & Pre-flop
  const numPlayers = state.turnOrder.length;
  const dealerIdx = (state.turnNumber - 1) % numPlayers;
  const sbIdx = (dealerIdx + 1) % numPlayers;
  const bbIdx = (dealerIdx + 2) % numPlayers;
  
  const sbPlayer = state.turnOrder[sbIdx];
  const bbPlayer = state.turnOrder[bbIdx];
  
  state.dealerButton = dealerIdx;

  state.currentPokerActor = sbPlayer;
  applyPokerAction(state, sbPlayer, 'BET', 1);
  
  state.currentPokerActor = bbPlayer;
  applyPokerAction(state, bbPlayer, 'RAISE', 2); // effectively posts BB=2

  // Determine who acts first (UTG - player after BB)
  const utgIdx = (bbIdx + 1) % numPlayers;
  state.currentPokerActor = state.turnOrder[utgIdx];
  
  // Clear acted status because blinds were forced, real action starts now
  state.activePokerPlayers.forEach(p => state.pokerPlayers[p].hasActed = false);

  state.phase = Phase.POKER_PRE_FLOP;

  events.push({
    type: EventTypes.POKER_STARTED,
    payload: { player: state.currentPlayer }
  });

  return { state, events };
}

/**
 * Checks if the current betting round is complete.
 */
function isBettingRoundComplete(state) {
  let allActed = true;
  let allMatched = true;
  let activeCount = 0;

  for (const playerId of state.activePokerPlayers) {
    const pState = state.pokerPlayers[playerId];
    if (pState.hasFolded) continue;
    
    activeCount++;

    if (pState.isAllIn) continue;
    
    if (!pState.hasActed) {
      allActed = false;
    }
    if (pState.currentBet !== state.currentBetToMatch) {
      allMatched = false;
    }
  }

  // If only 1 person hasn't folded, betting ends immediately
  if (activeCount <= 1) return true;

  return allActed && allMatched;
}

/**
 * Advances to the next active player.
 */
function advanceToNextPokerActor(state) {
  const numPlayers = state.turnOrder.length;
  let currentIdx = state.turnOrder.indexOf(state.currentPokerActor);
  
  for (let i = 1; i <= numPlayers; i++) {
    const nextIdx = (currentIdx + i) % numPlayers;
    const nextPlayer = state.turnOrder[nextIdx];
    const pState = state.pokerPlayers[nextPlayer];
    
    if (!pState.hasFolded && !pState.isAllIn) {
      state.currentPokerActor = nextPlayer;
      return;
    }
  }
}

/**
 * Submits a poker action for the current actor.
 */
export function submitPokerAction(gameState, action, amount = 0) {
  let state = cloneState(gameState);
  const events = [];

  const playerId = state.currentPokerActor;
  
  // Apply action
  const result = applyPokerAction(state, playerId, action, amount);
  if (!result.success) {
    events.push({ type: EventTypes.INVALID_MOVE, payload: { reason: result.error } });
    return { state, events };
  }

  // If action was successful, advance actor
  advanceToNextPokerActor(state);

  // Check if street is complete
  while (isBettingRoundComplete(state) && [Phase.POKER_PRE_FLOP, Phase.POKER_FLOP, Phase.POKER_TURN, Phase.POKER_RIVER].includes(state.phase)) {
    // Reset acting status for next street
    state.activePokerPlayers.forEach(p => state.pokerPlayers[p].hasActed = false);

    // Count how many are still active
    let activeCount = 0;
    for (const p of state.activePokerPlayers) {
      if (!state.pokerPlayers[p].hasFolded) activeCount++;
    }

    if (activeCount <= 1) {
      // Someone won by folds, skip straight to showdown
      const sdResult = resolveShowdownAndTransition(state, events);
      return { state: sdResult.state, events: sdResult.events };
    }

    // Advance to next street
    if (state.phase === Phase.POKER_PRE_FLOP) {
      dealCards(state.deck, 1); // burn
      state.communityCards.push(...dealCards(state.deck, 3));
      state.phase = Phase.POKER_FLOP;
    } else if (state.phase === Phase.POKER_FLOP) {
      dealCards(state.deck, 1);
      state.communityCards.push(...dealCards(state.deck, 1));
      state.phase = Phase.POKER_TURN;
    } else if (state.phase === Phase.POKER_TURN) {
      dealCards(state.deck, 1);
      state.communityCards.push(...dealCards(state.deck, 1));
      state.phase = Phase.POKER_RIVER;
    } else if (state.phase === Phase.POKER_RIVER) {
      const sdResult = resolveShowdownAndTransition(state, events);
      return { state: sdResult.state, events: sdResult.events };
    }

    // Reset current actor for new street to first non-button active player (Small Blind equivalent)
    let nextActorFound = false;
    const dealerIdx = state.dealerButton;
    const numPlayers = state.turnOrder.length;
    for (let i = 1; i <= numPlayers; i++) {
      const nextIdx = (dealerIdx + i) % numPlayers;
      const nextPlayer = state.turnOrder[nextIdx];
      const pState = state.pokerPlayers[nextPlayer];
      if (!pState.hasFolded && !pState.isAllIn) {
        state.currentPokerActor = nextPlayer;
        nextActorFound = true;
        break;
      }
    }
    
    if (nextActorFound) {
      break; // Stop auto-advancing, we have an actor
    } else {
      state.currentPokerActor = null; // Loop will naturally continue to next street
    }
  }

  // Auto-bot progression for VS_BOT mode
  // If the next actor is a bot, let it act (recursively or via next tick)
  // For now, returning the state allows the hook to fire an effect to call the bot.

  return { state, events };
}

/**
 * Resolves the showdown and sets up the Ludo movement phase for the winner(s).
 */
function resolveShowdownAndTransition(state, events) {
  state.phase = Phase.POKER_SHOWDOWN;
  const winners = resolveShowdown(state);
  
  if (winners.length === 0 || winners.every(w => w.winnings === 0)) {
    // Everyone folded or won 0 (should rarely happen in strict rules unless all folded to BB who then won nothing?)
    state.pokerResult = { result: PokerResultType.LOSS, winnings: 0 };
    events.push({ type: EventTypes.POKER_LOST, payload: { player: state.currentPlayer } });
    return completeTurn(state);
  }

  // Setup tied winners for Ludo resolution
  state.tiedPokerWinners = winners.filter(w => w.winnings > 0);
  state.currentTieIndex = 0;
  
  const firstWinner = state.tiedPokerWinners[0];
  state.currentPlayer = firstWinner.playerId;
  state.totalWinnings = firstWinner.winnings;
  state.movementPool = firstWinner.winnings; 
  
  events.push({
    type: EventTypes.POKER_WON,
    payload: { player: state.currentPlayer, winnings: state.totalWinnings }
  });

  state.phase = Phase.DIRECTION_CHOICE;
  return { state, events };
}

/**
 * Winner chooses direction: FORWARD (own pieces) or BACKWARD (opponent).
 * Transitions: DIRECTION_CHOICE → MOVEMENT_SELECTION
 *
 * @param {Object} gameState
 * @param {string} direction — 'FORWARD' | 'BACKWARD'
 * @param {string|null} targetPlayerId — required for BACKWARD (which opponent to push)
 */
export function chooseDirection(gameState, direction, targetPlayerId = null) {
  const state = cloneState(gameState);
  const events = [];

  if (state.phase !== Phase.DIRECTION_CHOICE) {
    return {
      state,
      events: [{ type: EventTypes.INVALID_MOVE, payload: { reason: 'Not in direction choice phase' } }],
    };
  }

  // Validate direction
  if (direction !== Direction.FORWARD && direction !== Direction.BACKWARD) {
    return {
      state,
      events: [{ type: EventTypes.INVALID_MOVE, payload: { reason: `Invalid direction: ${direction}` } }],
    };
  }

  // For BACKWARD, must specify a valid opponent
  if (direction === Direction.BACKWARD) {
    if (!targetPlayerId) {
      return {
        state,
        events: [{ type: EventTypes.INVALID_MOVE, payload: { reason: 'Must specify target player for backward movement' } }],
      };
    }
    if (targetPlayerId === state.currentPlayer) {
      return {
        state,
        events: [{ type: EventTypes.INVALID_MOVE, payload: { reason: 'Cannot target yourself for backward movement' } }],
      };
    }
    if (!state.players[targetPlayerId] || state.players[targetPlayerId].hasFinished) {
      return {
        state,
        events: [{ type: EventTypes.INVALID_MOVE, payload: { reason: `Invalid target player: ${targetPlayerId}` } }],
      };
    }
  }

  // Set direction
  state.movementDirection = direction;
  state.movementTarget = direction === Direction.FORWARD ? state.currentPlayer : targetPlayerId;

  events.push({
    type: EventTypes.DIRECTION_CHOSEN,
    payload: {
      player: state.currentPlayer,
      direction,
      target: state.movementTarget,
    },
  });

  if (direction === Direction.BACKWARD) {
    events.push({
      type: EventTypes.TARGET_SELECTED,
      payload: { player: state.currentPlayer, target: targetPlayerId },
    });
  }

  // Decompose winnings into components using the 5-tier system
  const decomposition = decomposeWinnings(state.totalWinnings);
  state.movementTier = decomposition.tier;
  state.currentComponentIndex = 0;
  state.componentAssignments = [];

  events.push({
    type: EventTypes.MOVEMENT_TIER_RESOLVED,
    payload: {
      player: state.currentPlayer,
      tier: decomposition.tier,
      winnings: state.totalWinnings,
      maxTotalMovement: decomposition.maxTotalMovement,
      hasPlayerChoice: decomposition.hasPlayerChoice,
    },
  });

  // ─── Tier 4/5: Route to PLAYER_CHOICE phase ───────────────
  if (decomposition.hasPlayerChoice) {
    state.playerChoicePhase = true;
    state.pendingPlayerChoices = decomposition.playerChoiceIndices;
    // Store raw components with PLAYER_CHOICE placeholders
    state.movementComponents = decomposition.components;
    state.phase = Phase.PLAYER_CHOICE;

    events.push({
      type: EventTypes.PLAYER_CHOICE_REQUIRED,
      payload: {
        player: state.currentPlayer,
        tier: decomposition.tier,
        playerChoiceIndices: decomposition.playerChoiceIndices,
        maxPerMove: decomposition.maxPerMove,
        maxTotalMovement: decomposition.maxTotalMovement,
      },
    });

    return { state, events };
  }

  // ─── Tiers 1–3: Proceed directly to MOVEMENT_SELECTION ────
  state.movementComponents = decomposition.components;

  events.push({
    type: EventTypes.COMPONENTS_CREATED,
    payload: {
      player: state.currentPlayer,
      winnings: state.totalWinnings,
      components: decomposition.components,
      totalComponents: decomposition.totalComponents,
    },
  });

  // Check if any legal moves exist for the first component
  const firstComponent = decomposition.components[0];
  let hasLegal;

  if (direction === Direction.FORWARD) {
    hasLegal = hasAnyLegalMove(state, state.currentPlayer, firstComponent);
  } else {
    hasLegal = hasAnyBackwardMove(state, targetPlayerId, firstComponent);
  }

  if (!hasLegal && decomposition.components.length === 1) {
    // No legal moves at all — skip turn
    events.push({
      type: EventTypes.NO_LEGAL_MOVES,
      payload: { player: state.currentPlayer },
    });
    const turnResult = completeTurn(state);
    return {
      state: turnResult.state,
      events: [...events, ...turnResult.events],
    };
  }

  state.phase = Phase.MOVEMENT_SELECTION;

  events.push({
    type: EventTypes.MOVEMENT_SELECTION_STARTED,
    payload: {
      player: state.currentPlayer,
      direction,
      component: firstComponent,
      componentIndex: 0,
      totalComponents: decomposition.totalComponents,
    },
  });

  return { state, events };
}

/**
 * Submit player's movement value choices for Tier 4 or Tier 5.
 * Transitions: PLAYER_CHOICE → MOVEMENT_SELECTION
 *
 * Tier 4: choices = [number] (one value, 1–6, for the third movement)
 * Tier 5: choices = [number, number, number] (three values, each 1–6)
 *
 * @param {Object} gameState
 * @param {number[]} choices — player's chosen movement values
 * @returns {{ state: Object, events: Array }}
 */
export function submitPlayerChoices(gameState, choices) {
  const state = cloneState(gameState);
  const events = [];

  // 1. Validate phase
  if (state.phase !== Phase.PLAYER_CHOICE) {
    return {
      state,
      events: [{ type: EventTypes.INVALID_MOVE, payload: { reason: 'Not in player choice phase' } }],
    };
  }

  // 2. Validate tier
  const tier = state.movementTier;
  if (tier !== 4 && tier !== 5) {
    return {
      state,
      events: [{ type: EventTypes.INVALID_MOVE, payload: { reason: `Player choice only for Tier 4/5, got tier ${tier}` } }],
    };
  }

  // 3. Validate the choices
  const validation = validatePlayerChoices(tier, choices);
  if (!validation.valid) {
    return {
      state,
      events: [{ type: EventTypes.INVALID_MOVE, payload: { reason: validation.reason } }],
    };
  }

  // 4. Resolve PLAYER_CHOICE placeholders into concrete numbers
  const resolvedComponents = resolvePlayerChoices(
    state.movementComponents,
    state.pendingPlayerChoices,
    choices
  );

  state.movementComponents = resolvedComponents;
  state.playerChoicePhase = false;
  state.pendingPlayerChoices = [];

  events.push({
    type: EventTypes.PLAYER_CHOICE_SUBMITTED,
    payload: {
      player: state.currentPlayer,
      tier,
      choices,
      resolvedComponents,
    },
  });

  events.push({
    type: EventTypes.COMPONENTS_CREATED,
    payload: {
      player: state.currentPlayer,
      winnings: state.totalWinnings,
      components: resolvedComponents,
      totalComponents: resolvedComponents.length,
    },
  });

  // 5. Check if any legal moves exist for the first component
  const firstComponent = resolvedComponents[0];
  const isForward = state.movementDirection === Direction.FORWARD;
  let hasLegal;

  if (isForward) {
    hasLegal = hasAnyLegalMove(state, state.currentPlayer, firstComponent);
  } else {
    hasLegal = hasAnyBackwardMove(state, state.movementTarget, firstComponent);
  }

  if (!hasLegal && resolvedComponents.length === 1) {
    events.push({
      type: EventTypes.NO_LEGAL_MOVES,
      payload: { player: state.currentPlayer },
    });
    const turnResult = completeTurn(state);
    return {
      state: turnResult.state,
      events: [...events, ...turnResult.events],
    };
  }

  // 6. Transition to MOVEMENT_SELECTION
  state.phase = Phase.MOVEMENT_SELECTION;

  events.push({
    type: EventTypes.MOVEMENT_SELECTION_STARTED,
    payload: {
      player: state.currentPlayer,
      direction: state.movementDirection,
      component: firstComponent,
      componentIndex: 0,
      totalComponents: resolvedComponents.length,
    },
  });

  return { state, events };
}

/**
 * Execute a component allocation: assign the current component to a piece and move it.
 * Handles forward movement (own pieces) or backward movement (opponent's pieces).
 *
 * @param {Object} gameState
 * @param {string} pieceId — e.g., "red-2" (forward) or "blue-1" (backward)
 * @returns {{ state: Object, events: Array, moveResult: Object }}
 */
export function executeComponentAllocation(gameState, pieceId) {
  const state = cloneState(gameState);
  const events = [];

  // 1. Validate phase
  if (state.phase !== Phase.MOVEMENT_SELECTION) {
    return {
      state,
      events: [{ type: EventTypes.INVALID_MOVE, payload: { reason: 'Not in movement selection phase' } }],
      moveResult: { valid: false, reason: 'WRONG_PHASE' },
    };
  }

  // 2. Get current component
  const currentComp = getCurrentComponent(state);
  if (!currentComp) {
    return {
      state,
      events: [{ type: EventTypes.INVALID_MOVE, payload: { reason: 'All components already assigned' } }],
      moveResult: { valid: false, reason: 'NO_COMPONENTS' },
    };
  }

  const componentValue = currentComp.value;
  const componentIndex = currentComp.index;
  const isForward = state.movementDirection === Direction.FORWARD;

  // 3. Validate the move
  let validation;
  if (isForward) {
    validation = validateMove(state, state.currentPlayer, pieceId, componentValue);
  } else {
    validation = validateBackwardMove(state, state.movementTarget, pieceId, componentValue);
  }

  if (!validation.valid) {
    return {
      state,
      events: [{ type: EventTypes.INVALID_MOVE, payload: { reason: validation.reason, message: validation.message, pieceId, steps: componentValue } }],
      moveResult: validation,
    };
  }

  // 4. Transition to execution
  state.phase = Phase.MOVEMENT_EXECUTION;

  // 5. Get piece reference
  const [color] = pieceId.split('-');
  const pieceIndex = parseInt(pieceId.split('-')[1], 10);
  const piece = state.players[color].pieces[pieceIndex];
  const fromPosition = piece.position;

  events.push({
    type: EventTypes.COMPONENT_ASSIGNED,
    payload: {
      player: state.currentPlayer,
      componentIndex,
      componentValue,
      pieceId,
      direction: state.movementDirection,
    },
  });

  events.push({
    type: EventTypes.PIECE_MOVE_STARTED,
    payload: { pieceId, from: fromPosition, to: validation.resultingPosition, steps: componentValue },
  });

  // 6. Emit step events for animation
  if (isForward) {
    if (fromPosition === -1) {
      // Entry from yard
      events.push({
        type: EventTypes.PIECE_STEP,
        payload: { pieceId, step: 0, stepNumber: 1, totalSteps: 1 },
      });
    } else {
      for (let s = 1; s <= componentValue; s++) {
        events.push({
          type: EventTypes.PIECE_STEP,
          payload: { pieceId, step: fromPosition + s, stepNumber: s, totalSteps: componentValue },
        });
      }
    }
  } else {
    // Backward animation
    const actualSteps = fromPosition === -1 ? 0 : Math.min(componentValue, fromPosition);
    for (let s = 1; s <= actualSteps; s++) {
      events.push({
        type: EventTypes.PIECE_STEP,
        payload: { pieceId, step: fromPosition - s, stepNumber: s, totalSteps: actualSteps },
      });
    }
  }

  // 7. Update piece position
  piece.position = validation.resultingPosition;
  piece.status = computePieceStatus(validation.resultingPosition);

  events.push({
    type: EventTypes.PIECE_MOVE_COMPLETED,
    payload: { pieceId, position: validation.resultingPosition },
  });

  // 8. Handle forward-specific effects
  if (isForward) {
    // Captures
    if (validation.captures && validation.captures.length > 0) {
      for (const captured of validation.captures) {
        const capPiece = state.players[captured.playerId].pieces[captured.pieceIndex];
        capPiece.position = -1;
        capPiece.status = 'YARD';

        events.push({
          type: EventTypes.PIECE_CAPTURED,
          payload: { capturingPiece: pieceId, capturedPiece: captured.pieceId, capturedPlayer: captured.playerId },
        });
        events.push({
          type: EventTypes.PIECE_RETURNED_HOME,
          payload: { pieceId: captured.pieceId, player: captured.playerId },
        });
      }
    }

    // Block creation
    if (validation.createsBlock) {
      events.push({ type: EventTypes.BLOCK_CREATED, payload: { player: state.currentPlayer, position: validation.resultingPosition } });
    }

    // Home column entry
    if (validation.entersHomeColumn) {
      events.push({ type: EventTypes.PIECE_ENTERED_HOME_COLUMN, payload: { pieceId, player: state.currentPlayer } });
    }

    // Piece finishing
    if (validation.reachesHome) {
      const finishedCount = getFinishedCount(state, state.currentPlayer);
      state.players[state.currentPlayer].piecesFinished = finishedCount;

      events.push({ type: EventTypes.PIECE_FINISHED, payload: { pieceId, player: state.currentPlayer, piecesFinished: finishedCount } });
    }

    // Win condition
    if (checkWin(state, state.currentPlayer)) {
      const rankedState = updateRankings(state, state.currentPlayer);
      Object.assign(state, rankedState);

      events.push({ type: EventTypes.PLAYER_FINISHED, payload: { player: state.currentPlayer, rank: state.players[state.currentPlayer].finishRank } });

      if (isGameOver(state)) {
        const finalState = finalizeGame(state);
        Object.assign(state, finalState);
        state.phase = Phase.GAME_OVER;
        events.push({ type: EventTypes.GAME_FINISHED, payload: { winner: state.winner, rankings: state.rankings } });
        return { state, events, moveResult: validation };
      }
    }
  } else {
    // Backward-specific effects
    if (validation.pushedToYard) {
      events.push({
        type: EventTypes.PIECE_PUSHED_TO_YARD,
        payload: { pieceId, player: state.movementTarget },
      });
    } else {
      events.push({
        type: EventTypes.PIECE_MOVED_BACKWARD,
        payload: { pieceId, from: fromPosition, to: validation.resultingPosition, steps: componentValue },
      });
    }
  }

  // 9. Update component tracking
  state.componentAssignments.push({ componentIndex, pieceId, steps: componentValue, executed: true });
  state.currentComponentIndex = componentIndex + 1;
  state.movementUsed += componentValue;
  state.movementAllocations.push({ pieceId, steps: componentValue });

  // 10. Check if more components remain
  if (state.currentComponentIndex < state.movementComponents.length) {
    const nextComponentValue = state.movementComponents[state.currentComponentIndex];

    // Check if next component has any legal moves
    let nextHasLegal;
    if (isForward) {
      nextHasLegal = hasAnyLegalMove(state, state.currentPlayer, nextComponentValue);
    } else {
      nextHasLegal = hasAnyBackwardMove(state, state.movementTarget, nextComponentValue);
    }

    if (nextHasLegal) {
      state.phase = Phase.MOVEMENT_SELECTION;

      events.push({
        type: EventTypes.MOVEMENT_SELECTION_STARTED,
        payload: {
          player: state.currentPlayer,
          direction: state.movementDirection,
          component: nextComponentValue,
          componentIndex: state.currentComponentIndex,
          totalComponents: state.movementComponents.length,
        },
      });
    } else {
      // Skip this component — no legal moves
      events.push({
        type: EventTypes.NO_LEGAL_MOVES,
        payload: { player: state.currentPlayer, component: nextComponentValue, componentIndex: state.currentComponentIndex },
      });

      // Skip remaining components that have no legal moves
      let skipped = state.currentComponentIndex;
      while (skipped < state.movementComponents.length) {
        const val = state.movementComponents[skipped];
        let canMove;
        if (isForward) {
          canMove = hasAnyLegalMove(state, state.currentPlayer, val);
        } else {
          canMove = hasAnyBackwardMove(state, state.movementTarget, val);
        }
        if (canMove) break;
        skipped++;
      }

      if (skipped < state.movementComponents.length) {
        state.currentComponentIndex = skipped;
        state.phase = Phase.MOVEMENT_SELECTION;
        events.push({
          type: EventTypes.MOVEMENT_SELECTION_STARTED,
          payload: {
            player: state.currentPlayer,
            direction: state.movementDirection,
            component: state.movementComponents[skipped],
            componentIndex: skipped,
            totalComponents: state.movementComponents.length,
          },
        });
      } else {
        // All remaining components have no legal moves — end turn
        const turnResult = completeTurn(state);
        Object.assign(state, turnResult.state);
        events.push(...turnResult.events);
      }
    }
  } else {
    // All components used — complete turn
    const turnResult = completeTurn(state);
    Object.assign(state, turnResult.state);
    events.push(...turnResult.events);
  }

  return { state, events, moveResult: validation };
}

/**
 * Complete the current turn (or the current tied player's move) and advance.
 */
export function completeTurn(gameState) {
  const state = cloneState(gameState);
  const events = [];

  const prevPlayer = state.currentPlayer;

  events.push({
    type: EventTypes.TURN_COMPLETED,
    payload: {
      player: prevPlayer,
      turnNumber: state.turnNumber,
      totalWinnings: state.totalWinnings,
      movementUsed: state.movementUsed,
      componentsUsed: state.componentAssignments.length,
      totalComponents: state.movementComponents.length,
    },
  });

  // Clear tracking for the movement phase that just ended
  state.movementDirection = null;
  state.movementTarget = null;
  state.movementTier = null;
  state.playerChoicePhase = false;
  state.pendingPlayerChoices = [];
  state.movementComponents = [];
  state.componentAssignments = [];
  state.currentComponentIndex = 0;
  state.totalWinnings = 0;
  state.movementPool = 0;
  state.movementUsed = 0;
  state.movementAllocations = [];

  // ─── TIE RESOLUTION (Independent movement opportunity) ───
  if (state.tiedPokerWinners && state.currentTieIndex + 1 < state.tiedPokerWinners.length) {
    // Advance to the NEXT tied winner
    state.currentTieIndex += 1;
    const nextWinner = state.tiedPokerWinners[state.currentTieIndex];
    
    state.currentPlayer = nextWinner.playerId;
    state.totalWinnings = nextWinner.winnings;
    state.movementPool = nextWinner.winnings; // Legacy compat
    
    events.push({
      type: EventTypes.POKER_WON,
      payload: { player: state.currentPlayer, winnings: state.totalWinnings, description: "Poker Tie Resolution" }
    });

    state.phase = Phase.DIRECTION_CHOICE;
    return { state, events };
  }

  // No more tied winners. End the Ludo turn and advance to the next Ludo player.
  state.tiedPokerWinners = [];
  state.currentTieIndex = 0;

  // Restore the *actual* Ludo player whose turn it was (in case it got swapped for tie handling)
  // Wait, `turnNumber` corresponds to the Ludo turn.
  const actualLudoPlayer = state.turnOrder[(state.turnNumber - 1) % state.turnOrder.length];
  state.currentPlayer = actualLudoPlayer;

  // Find next player
  const nextPlayer = getNextPlayer(state);

  if (!nextPlayer || state.phase === Phase.GAME_OVER) {
    state.phase = Phase.GAME_OVER;
    if (!state.winner) {
      const finalState = finalizeGame(state);
      Object.assign(state, finalState);
    }
    events.push({ type: EventTypes.GAME_FINISHED, payload: { winner: state.winner, rankings: state.rankings } });
    return { state, events };
  }

  // Advance to next player — fresh state, no carryover (RULE 1)
  state.currentPlayer = nextPlayer;
  state.turnNumber += 1;
  state.phase = Phase.TURN_COMPLETE;
  
  // Ensure bankroll resets to 6
  state.bankroll = BANKROLL_PER_TURN;

  return { state, events };
}

/**
 * Force-skip the current component (forfeit it).
 * Used when the player wants to skip a component that has legal moves.
 */
export function skipComponent(gameState) {
  const state = cloneState(gameState);
  const events = [];

  if (state.phase !== Phase.MOVEMENT_SELECTION) {
    return { state, events };
  }

  const currentComp = getCurrentComponent(state);
  if (!currentComp) {
    return completeTurn(state);
  }

  // Skip this component
  state.currentComponentIndex = currentComp.index + 1;

  if (state.currentComponentIndex < state.movementComponents.length) {
    const nextVal = state.movementComponents[state.currentComponentIndex];
    const isForward = state.movementDirection === Direction.FORWARD;

    let hasLegal;
    if (isForward) {
      hasLegal = hasAnyLegalMove(state, state.currentPlayer, nextVal);
    } else {
      hasLegal = hasAnyBackwardMove(state, state.movementTarget, nextVal);
    }

    if (hasLegal) {
      state.phase = Phase.MOVEMENT_SELECTION;
      events.push({
        type: EventTypes.MOVEMENT_SELECTION_STARTED,
        payload: {
          player: state.currentPlayer,
          direction: state.movementDirection,
          component: nextVal,
          componentIndex: state.currentComponentIndex,
          totalComponents: state.movementComponents.length,
        },
      });
      return { state, events };
    }
  }

  return completeTurn(state);
}

/**
 * End movement phase early — forfeit all remaining components.
 */
export function endMovementPhase(gameState) {
  if (gameState.phase !== Phase.MOVEMENT_SELECTION) {
    return { state: gameState, events: [] };
  }
  return completeTurn(gameState);
}

/**
 * Get a summary of the current turn state for the frontend.
 */
export function getTurnSummary(gameState) {
  const currentComp = getCurrentComponent(gameState);
  const isForward = gameState.movementDirection === Direction.FORWARD;

  let movablePieces = [];
  if (gameState.phase === Phase.MOVEMENT_SELECTION && currentComp) {
    if (isForward) {
      movablePieces = getMovablePieceIndices(gameState, gameState.currentPlayer, currentComp.value);
    } else {
      movablePieces = getBackwardMovablePieceIndices(gameState, gameState.movementTarget, currentComp.value);
    }
  }

  return {
    currentPlayer: gameState.currentPlayer,
    turnNumber: gameState.turnNumber,
    phase: gameState.phase,
    bankroll: gameState.bankroll,
    pokerResult: gameState.pokerResult,
    totalWinnings: gameState.totalWinnings,
    movementDirection: gameState.movementDirection,
    movementTarget: gameState.movementTarget,
    movementComponents: gameState.movementComponents,
    currentComponent: currentComp,
    componentAssignments: gameState.componentAssignments,
    movablePieces,
  };
}
