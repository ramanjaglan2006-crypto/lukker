import { BANKROLL_PER_TURN, PokerResultType } from './gameState.js';
import { evaluateBestHand, compareScores } from './pokerCore.js';

// Validates a poker action based on current state
export function validatePokerAction(gameState, playerId, action, amount = 0) {
  const pState = gameState.pokerPlayers[playerId];
  if (!pState) return { valid: false, reason: 'Player not found' };
  
  if (gameState.currentPokerActor !== playerId) {
    return { valid: false, reason: 'Not your turn' };
  }

  if (pState.hasFolded || pState.isAllIn) {
    return { valid: false, reason: 'Cannot act (Folded or All-In)' };
  }

  const toCall = gameState.currentBetToMatch - pState.currentBet;

  switch (action) {
    case 'CHECK':
      if (toCall > 0) return { valid: false, reason: 'Cannot check when there is a bet to call' };
      return { valid: true };
    
    case 'BET':
    case 'RAISE':
      if (amount <= toCall) return { valid: false, reason: 'Raise must be greater than current call amount' };
      if (amount > pState.bankroll) return { valid: false, reason: 'Cannot bet more than remaining bankroll' };
      return { valid: true };
    
    case 'CALL':
      if (toCall <= 0) return { valid: false, reason: 'Nothing to call, use CHECK' };
      return { valid: true };
    
    case 'FOLD':
      return { valid: true };
    
    case 'ALL_IN':
      return { valid: true };
      
    default:
      return { valid: false, reason: 'Unknown action' };
  }
}

// Applies a validated poker action
export function applyPokerAction(gameState, playerId, action, amount = 0) {
  const validation = validatePokerAction(gameState, playerId, action, amount);
  if (!validation.valid) {
    return { success: false, error: validation.reason };
  }

  const pState = gameState.pokerPlayers[playerId];
  const toCall = gameState.currentBetToMatch - pState.currentBet;
  let betAmount = 0;

  switch (action) {
    case 'CHECK':
      betAmount = 0;
      break;
    
    case 'BET':
    case 'RAISE':
      betAmount = amount;
      if (betAmount === pState.bankroll) {
        pState.isAllIn = true;
      }
      break;
    
    case 'CALL':
      betAmount = Math.min(toCall, pState.bankroll);
      if (betAmount === pState.bankroll) {
        pState.isAllIn = true;
      }
      break;
    
    case 'ALL_IN':
      betAmount = pState.bankroll;
      pState.isAllIn = true;
      break;
    
    case 'FOLD':
      pState.hasFolded = true;
      gameState.activePokerPlayers = gameState.activePokerPlayers.filter(p => p !== playerId);
      break;
  }

  if (betAmount > 0) {
    pState.bankroll -= betAmount;
    pState.currentBet += betAmount;
    gameState.pot += betAmount;
    if (pState.currentBet > gameState.currentBetToMatch) {
      gameState.currentBetToMatch = pState.currentBet;
    }
  }

  pState.hasActed = true;
  return { success: true };
}

// Resolves the showdown and distributes the pot among winners
export function resolveShowdown(gameState) {
  const activePlayers = gameState.activePokerPlayers;
  
  if (activePlayers.length === 1) {
    // Only one player left
    const winnerId = activePlayers[0];
    return [{ playerId: winnerId, winnings: gameState.pot }];
  }

  // Evaluate hands for all active players
  const playerHands = activePlayers.map(playerId => {
    const pState = gameState.pokerPlayers[playerId];
    const bestHand = evaluateBestHand(pState.holeCards, gameState.communityCards);
    return { playerId, bestHand };
  });

  // Sort players by hand score descending
  playerHands.sort((a, b) => compareScores(b.bestHand.score, a.bestHand.score));

  // Determine winners (could be ties)
  const winners = [playerHands[0]];
  for (let i = 1; i < playerHands.length; i++) {
    if (compareScores(playerHands[0].bestHand.score, playerHands[i].bestHand.score) === 0) {
      winners.push(playerHands[i]);
    } else {
      break;
    }
  }

  const pot = gameState.pot;
  // Divide pot equally, rounding down. Remainder goes nowhere according to standard, but we'll floor it.
  const winningsPerPlayer = Math.floor(pot / winners.length); 

  return winners.map(w => ({ playerId: w.playerId, winnings: winningsPerPlayer }));
}
