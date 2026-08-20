// useGameEngine v3 — React hook for Bankroll → Poker → Direction → [Player Choice] → Components → Movement
// Backward-compatible props for frozen LudoBoard/PlayerInfoBar/WinnerModal

import { useState, useCallback, useRef, useEffect } from 'react';
import { createGameState, toTokensFormat, Phase, Direction, PokerResultType, BANKROLL_PER_TURN, getCurrentComponent } from '../engine/gameState.js';
import { initializeGame, startTurn, startPokerRound, submitPokerAction, chooseDirection, submitPlayerChoices, executeComponentAllocation, endMovementPhase, skipComponent, completeTurn, getTurnSummary } from '../engine/turnManager.js';
import { getMovablePieceIndices, getBackwardMovablePieceIndices, hasAnyLegalMove, hasAnyBackwardMove } from '../engine/movement.js';
import { getBotAction } from '../engine/pokerBot.js';
import { getBotMovementAction } from '../engine/ludoBot.js';
import { getFinishedCount } from '../engine/winCondition.js';
import { EventTypes } from '../engine/events.js';
import { PLAYER_CONFIGS } from '../utils/ludoPaths.js';
import { sounds } from '../utils/soundEffects.js';

function getPlayerCount(playerMode) {
  if (playerMode === '2P') return 2;
  if (playerMode === '3P') return 3;
  return 4;
}

export function useGameEngine({
  playerMode = '4P',
  soundEnabled = true,
}) {
  // ─── Core State ─────────────────────────────────────────────
  const [gameState, setGameState] = useState(() => {
    const initial = createGameState(getPlayerCount(playerMode));
    const { state } = initializeGame(initial);
    return state;
  });

  const [gameLog, setGameLog] = useState(['Game started! Red\'s turn.']);
  const isAnimatingRef = useRef(false);


  // ─── Log Helper ─────────────────────────────────────────────
  const addLog = useCallback((msg) => {
    setGameLog(prev => [msg, ...prev.slice(0, 29)]);
  }, []);

  // ─── Process Events → Sound + Logs ─────────────────────────
  const processEvents = useCallback((events) => {
    for (const evt of events) {
      switch (evt.type) {
        case EventTypes.TURN_STARTED:
          if (soundEnabled) sounds.playTurnChange();
          addLog(`── Turn ${evt.payload.turnNumber}: ${PLAYER_CONFIGS[evt.payload.player]?.name || evt.payload.player}'s turn ──`);
          break;

        case EventTypes.BANKROLL_SET:
          addLog(`💰 Bankroll: ${evt.payload.bankroll}`);
          break;

        case EventTypes.POKER_WON:
          addLog(`🃏 Poker WIN! Winnings: ${evt.payload.winnings}`);
          break;

        case EventTypes.POKER_FOLDED:
          addLog(`🃏 Folded — no movement this turn`);
          break;

        case EventTypes.POKER_LOST:
          addLog(`🃏 Lost — no movement this turn`);
          break;

        case EventTypes.DIRECTION_CHOSEN:
          if (evt.payload.direction === 'FORWARD') {
            addLog(`⬆️ Moving own pieces forward`);
          } else {
            addLog(`⬇️ Pushing ${PLAYER_CONFIGS[evt.payload.target]?.name}'s pieces backward!`);
          }
          break;

        case EventTypes.COMPONENTS_CREATED:
          addLog(`🎲 Components: [${evt.payload.components.join(', ')}]`);
          break;

        case EventTypes.NO_LEGAL_MOVES:
          addLog(`⚠️ No valid moves — component skipped`);
          break;

        case EventTypes.COMPONENT_ASSIGNED:
          addLog(`${evt.payload.direction === 'FORWARD' ? '➡️' : '⬅️'} ${evt.payload.pieceId}: ${evt.payload.componentValue} steps`);
          break;

        case EventTypes.PIECE_CAPTURED:
          if (soundEnabled) sounds.playCapture();
          addLog(`💥 ${evt.payload.capturingPiece} captured ${evt.payload.capturedPiece}!`);
          break;

        case EventTypes.PIECE_RETURNED_HOME:
          addLog(`↩️ ${evt.payload.pieceId} returned to yard`);
          break;

        case EventTypes.BLOCK_CREATED:
          addLog(`🛡️ Block created by ${PLAYER_CONFIGS[evt.payload.player]?.name}`);
          break;

        case EventTypes.PIECE_ENTERED_HOME_COLUMN:
          if (soundEnabled) sounds.playSafeZone();
          addLog(`🏠 ${evt.payload.pieceId} entered home column!`);
          break;

        case EventTypes.PIECE_FINISHED:
          if (soundEnabled) sounds.playSafeZone();
          addLog(`🎉 ${evt.payload.pieceId} reached Home! (${evt.payload.piecesFinished}/4)`);
          break;

        case EventTypes.PIECE_MOVED_BACKWARD:
          addLog(`⬅️ ${evt.payload.pieceId} pushed back ${evt.payload.steps} steps`);
          break;

        case EventTypes.PIECE_PUSHED_TO_YARD:
          addLog(`💀 ${evt.payload.pieceId} pushed all the way to yard!`);
          break;

        case EventTypes.PLAYER_FINISHED:
          addLog(`🏆 ${PLAYER_CONFIGS[evt.payload.player]?.name} finished ${ordinal(evt.payload.rank)}!`);
          break;

        case EventTypes.GAME_FINISHED:
          if (soundEnabled) sounds.playVictory();
          addLog(`🎊 GAME OVER! Winner: ${PLAYER_CONFIGS[evt.payload.winner]?.name}!`);
          break;

        case EventTypes.TURN_COMPLETED: {
          const unused = evt.payload.totalComponents - evt.payload.componentsUsed;
          if (unused > 0) {
            addLog(`${PLAYER_CONFIGS[evt.payload.player]?.name} forfeits ${unused} unused component(s)`);
          }
          break;
        }

        case EventTypes.MOVEMENT_TIER_RESOLVED:
          addLog(`🎰 Tier ${evt.payload.tier} (max ${evt.payload.maxTotalMovement} movement)`);
          break;

        case EventTypes.PLAYER_CHOICE_REQUIRED:
          if (evt.payload.tier === 5) {
            addLog(`✨ Tier 5! Choose all 3 movement values (1–6 each)`);
          } else {
            addLog(`🎯 Tier 4! Choose your third movement value (1–6)`);
          }
          break;

        case EventTypes.PLAYER_CHOICE_SUBMITTED:
          addLog(`✅ Choices: [${evt.payload.resolvedComponents.join(', ')}]`);
          break;

        case EventTypes.INVALID_MOVE:
          addLog(`❌ Invalid: ${evt.payload.reason || evt.payload.message}`);
          break;

        default:
          break;
      }
    }
  }, [soundEnabled, addLog]);

  // ─── Start Poker Round ──────────────────────────────────────
  const startPokerRoundAction = useCallback(() => {
    if (isAnimatingRef.current) return;
    if (gameState.phase === Phase.GAME_OVER) return;

    let state = gameState;

    // Start turn if needed
    if (state.phase === Phase.WAITING || state.phase === Phase.TURN_COMPLETE) {
      const turnResult = startTurn(state);
      state = turnResult.state;
      processEvents(turnResult.events);
    }

    // Start interactive poker round
    if (state.phase === Phase.POKER_ROUND) {
      const pokerResult = startPokerRound(state);
      state = pokerResult.state;
      processEvents(pokerResult.events);
    }

    setGameState(state);
  }, [gameState, processEvents]);

  // ─── Submit Poker Action ────────────────────────────────────
  const submitPokerActionCallback = useCallback((action, amount = 0) => {
    if (isAnimatingRef.current) return;
    
    // Only allow when it is one of the betting phases
    if (![Phase.POKER_PRE_FLOP, Phase.POKER_FLOP, Phase.POKER_TURN, Phase.POKER_RIVER].includes(gameState.phase)) return;

    const result = submitPokerAction(gameState, action, amount);
    processEvents(result.events);
    setGameState(result.state);
  }, [gameState, processEvents]);

  // ─── Bot Auto-Play ──────────────────────────────────────────
  useEffect(() => {
    // Only auto-play if it is a bot's turn
    // In VS_BOT mode, 'red' is the only human player
    if (playerMode === 'VS_BOT' && gameState.currentPokerActor && gameState.currentPokerActor !== 'red') {
      const isPokerPhase = [
        Phase.POKER_PRE_FLOP,
        Phase.POKER_FLOP,
        Phase.POKER_TURN,
        Phase.POKER_RIVER
      ].includes(gameState.phase);

      if (isPokerPhase) {
        // Use a timeout to simulate "thinking" and avoid React batching issues
        const timer = setTimeout(() => {
          const { action, amount } = getBotAction(gameState, gameState.currentPokerActor);
          submitPokerActionCallback(action, amount);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState, playerMode, submitPokerActionCallback]);


  // ─── Choose Direction ───────────────────────────────────────
  const chooseDirectionAction = useCallback((direction, targetPlayerId = null) => {
    if (isAnimatingRef.current) return;
    if (gameState.phase !== Phase.DIRECTION_CHOICE) return;

    const result = chooseDirection(gameState, direction, targetPlayerId);
    processEvents(result.events);
    setGameState(result.state);
  }, [gameState, processEvents]);

  // ─── Token Click (component-based) ─────────────────────────
  const onTokenClick = useCallback(async (tokenIdx) => {
    if (isAnimatingRef.current) return;
    if (gameState.phase !== Phase.MOVEMENT_SELECTION) return;

    const currentComp = getCurrentComponent(gameState);
    if (!currentComp) return;

    const isForward = gameState.movementDirection === Direction.FORWARD;
    const targetPlayer = isForward ? gameState.currentPlayer : gameState.movementTarget;
    const pieceId = `${targetPlayer}-${tokenIdx}`;

    isAnimatingRef.current = true;
    setTimeout(() => { isAnimatingRef.current = false; }, 5000); // Safety timeout

    // Get piece for animation
    const piece = gameState.players[targetPlayer].pieces[tokenIdx];
    const fromPosition = piece.position;
    const steps = currentComp.value;

    // Step-by-step animation
    if (isForward && fromPosition !== -1) {
      // Forward animation along the path
      for (let s = 1; s < steps; s++) {
        await new Promise(r => setTimeout(r, 160));
        if (soundEnabled) sounds.playTokenMove();
        setGameState(prev => {
          const tempState = JSON.parse(JSON.stringify(prev));
          tempState.players[targetPlayer].pieces[tokenIdx].position = fromPosition + s;
          return tempState;
        });
      }
      await new Promise(r => setTimeout(r, 160));
      if (soundEnabled) sounds.playTokenMove();
    } else if (!isForward && fromPosition > 0) {
      // Backward animation
      const actualSteps = Math.min(steps, fromPosition);
      for (let s = 1; s < actualSteps; s++) {
        await new Promise(r => setTimeout(r, 160));
        if (soundEnabled) sounds.playTokenMove();
        setGameState(prev => {
          const tempState = JSON.parse(JSON.stringify(prev));
          tempState.players[targetPlayer].pieces[tokenIdx].position = fromPosition - s;
          return tempState;
        });
      }
      await new Promise(r => setTimeout(r, 160));
      if (soundEnabled) sounds.playTokenMove();
    } else {
      // Entry or single step
      if (soundEnabled) sounds.playTokenMove();
    }

    // Execute the actual move through the engine
    const result = executeComponentAllocation(gameState, pieceId);
    processEvents(result.events);
    setGameState(result.state);

    isAnimatingRef.current = false;
  }, [gameState, soundEnabled, processEvents]);


  // ─── Skip Component ─────────────────────────────────────────
  const skipComponentAction = useCallback(() => {
    if (isAnimatingRef.current) return;
    if (gameState.phase !== Phase.MOVEMENT_SELECTION) return;

    const result = skipComponent(gameState);
    processEvents(result.events);
    setGameState(result.state);
  }, [gameState, processEvents]);

  // ─── End Movement Phase ─────────────────────────────────────
  const endMovementAction = useCallback(() => {
    if (isAnimatingRef.current) return;
    if (gameState.phase !== Phase.MOVEMENT_SELECTION) return;

    const result = endMovementPhase(gameState);
    processEvents(result.events);
    setGameState(result.state);
  }, [gameState, processEvents]);

  // ─── Submit Player Choices (Tier 4/5) ────────────────
  const submitPlayerChoicesAction = useCallback((choices) => {
    if (isAnimatingRef.current) return;
    if (gameState.phase !== Phase.PLAYER_CHOICE) return;

    const result = submitPlayerChoices(gameState, choices);
    processEvents(result.events);
    setGameState(result.state);
  }, [gameState, processEvents]);

  // ─── Reset Game ─────────────────────────────────────────────
  const resetGame = useCallback(() => {
    const initial = createGameState(getPlayerCount(playerMode));
    const { state } = initializeGame(initial);
    setGameState(state);
    setGameLog(['New Game Started!']);
    isAnimatingRef.current = false;
    if (soundEnabled) sounds.playTurnChange();
  }, [playerMode, soundEnabled]);

  // ─── Computed Values ────────────────────────────────────────
  const tokens = toTokensFormat(gameState);
  const currentComp = getCurrentComponent(gameState);
  const isForward = gameState.movementDirection === Direction.FORWARD;

  let movableTokens = [];
  if (gameState.phase === Phase.MOVEMENT_SELECTION && currentComp) {
    if (isForward) {
      movableTokens = getMovablePieceIndices(gameState, gameState.currentPlayer, currentComp.value);
    } else {
      movableTokens = getBackwardMovablePieceIndices(gameState, gameState.movementTarget, currentComp.value);
    }
  }

  const canStartPoker = (gameState.phase === Phase.WAITING || gameState.phase === Phase.TURN_COMPLETE)
    && !gameState.winner;

  // Get opponents for backward target selection
  const opponents = gameState.turnOrder
    .filter(c => c !== gameState.currentPlayer && !gameState.players[c].hasFinished);

  // ─── Bot Auto-Play (Movement) ───────────────────────────────
  useEffect(() => {
    // Only auto-play if it is a bot's turn to move
    if (playerMode === 'VS_BOT' && gameState.currentPlayer !== 'red' && !isAnimatingRef.current) {
      const isMovementPhase = [
        Phase.DIRECTION_CHOICE,
        Phase.PLAYER_CHOICE,
        Phase.MOVEMENT_SELECTION
      ].includes(gameState.phase);

      if (isMovementPhase) {
        const timer = setTimeout(() => {
          const actionData = getBotMovementAction(gameState);
          if (!actionData) return;

          if (actionData.action === 'CHOOSE_DIRECTION') {
            chooseDirectionAction(actionData.direction, actionData.targetPlayerId);
          } else if (actionData.action === 'SUBMIT_CHOICES') {
            submitPlayerChoicesAction(actionData.choices);
          } else if (actionData.action === 'EXECUTE_COMPONENT') {
            onTokenClick(actionData.pieceIndex);
          } else if (actionData.action === 'SKIP_COMPONENT') {
            skipComponentAction();
          }
        }, 1000); // 1s delay for realistic bot movement
        return () => clearTimeout(timer);
      }
    }
  }, [gameState, playerMode, chooseDirectionAction, submitPlayerChoicesAction, onTokenClick, skipComponentAction]);

  // ─── Return API ─────────────────────────────────────────────
  return {
    // Legacy-compatible props (used by existing frozen components)
    currentPlayer: gameState.currentPlayer,
    tokens,
    winner: gameState.winner,
    gameLog,
    movableTokens,
    moveToken: onTokenClick,
    resetGame,

    // Poker v2 props
    phase: gameState.phase,
    bankroll: gameState.bankroll,
    pokerResult: gameState.pokerResult,
    totalWinnings: gameState.totalWinnings,
    canStartPoker,
    startPokerRound: startPokerRoundAction,
    
    // Interactive Poker props
    pokerPlayers: gameState.pokerPlayers,
    activePokerPlayers: gameState.activePokerPlayers,
    communityCards: gameState.communityCards,
    pot: gameState.pot,
    currentPokerActor: gameState.currentPokerActor,
    currentBetToMatch: gameState.currentBetToMatch,
    submitPokerAction: submitPokerActionCallback,

    // Direction choice
    movementDirection: gameState.movementDirection,
    movementTarget: gameState.movementTarget,
    chooseDirection: chooseDirectionAction,
    opponents,

    // Component system
    movementComponents: gameState.movementComponents,
    currentComponent: currentComp,
    componentAssignments: gameState.componentAssignments,
    skipComponent: skipComponentAction,
    endMovementPhase: endMovementAction,

    // Player choice (Tier 4/5)
    playerChoicePhase: gameState.playerChoicePhase,
    pendingPlayerChoices: gameState.pendingPlayerChoices,
    movementTier: gameState.movementTier,
    submitPlayerChoices: submitPlayerChoicesAction,

    // Legacy compat
    movementPool: gameState.totalWinnings,
    movementUsed: gameState.movementUsed,
    remainingMovement: gameState.totalWinnings - gameState.movementUsed,

    // Game state
    gameState,
    turnNumber: gameState.turnNumber,
    rankings: gameState.rankings,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────
function ordinal(n) {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}
