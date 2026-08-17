import { evaluateBestHand, HandRank } from './pokerCore.js';

export function getBotAction(gameState, playerId) {
  const pState = gameState.pokerPlayers[playerId];
  const toCall = gameState.currentBetToMatch - pState.currentBet;
  const isPreFlop = gameState.communityCards.length === 0;
  
  if (isPreFlop) {
    if (toCall === 0) return { action: 'CHECK' };
    if (toCall <= 1) return { action: 'CALL' };
    // Call bigger bets ~50% of the time preflop
    if (Math.random() < 0.5) return { action: 'CALL' };
    return { action: 'FOLD' };
  }
  
  const bestHand = evaluateBestHand(pState.holeCards, gameState.communityCards);
  const rank = bestHand ? bestHand.rank : HandRank.HIGH_CARD;

  if (toCall === 0) {
    if (rank >= HandRank.ONE_PAIR && Math.random() < 0.6 && pState.bankroll > 0) {
      return { action: 'BET', amount: Math.min(pState.bankroll, Math.random() < 0.5 ? 1 : 2) };
    }
    return { action: 'CHECK' };
  } else {
    if (rank >= HandRank.ONE_PAIR) {
      if (rank >= HandRank.TWO_PAIR && pState.bankroll > toCall && Math.random() < 0.4) {
        return { action: 'RAISE', amount: Math.min(pState.bankroll, toCall + 1) };
      }
      return { action: 'CALL' };
    } else {
      if (toCall <= 1 && Math.random() < 0.3) return { action: 'CALL' };
      return { action: 'FOLD' };
    }
  }
}
