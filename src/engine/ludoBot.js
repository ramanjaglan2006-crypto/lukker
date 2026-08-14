import { Phase, Direction } from './gameState.js';
import { getAllLegalMoves, getAllLegalBackwardMoves } from './movement.js';

/**
 * Returns the best action for the bot depending on the current phase.
 * 
 * Returns an object depending on phase:
 * DIRECTION_CHOICE: { action: 'CHOOSE_DIRECTION', direction: 'FORWARD' }
 * PLAYER_CHOICE: { action: 'SUBMIT_CHOICES', choices: [6, 6, 6] }
 * MOVEMENT_SELECTION: { action: 'EXECUTE_COMPONENT', pieceId: 'blue-1' } or { action: 'SKIP_COMPONENT' }
 */
export function getBotMovementAction(gameState) {
  const phase = gameState.phase;
  const playerId = gameState.currentPlayer;

  if (phase === Phase.DIRECTION_CHOICE) {
    // For now, always choose FORWARD to progress their own pieces
    return { action: 'CHOOSE_DIRECTION', direction: Direction.FORWARD, targetPlayerId: null };
  }

  if (phase === Phase.PLAYER_CHOICE) {
    // Maximize movement: pick 6 for all available choices
    const numChoices = gameState.pendingPlayerChoices.length;
    const choices = new Array(numChoices).fill(6);
    return { action: 'SUBMIT_CHOICES', choices };
  }

  if (phase === Phase.MOVEMENT_SELECTION) {
    const componentValue = gameState.movementComponents[gameState.currentComponentIndex];
    const isForward = gameState.movementDirection === Direction.FORWARD;
    
    let legalMoves;
    if (isForward) {
      legalMoves = getAllLegalMoves(gameState, playerId, componentValue);
    } else {
      legalMoves = getAllLegalBackwardMoves(gameState, gameState.movementTarget, componentValue);
    }

    if (legalMoves.length === 0) {
      return { action: 'SKIP_COMPONENT' };
    }

    // Rank moves based on strategic priority
    // Priority: 1. Captures, 2. Enters Home, 3. Entry (out of yard), 4. Furthest progressed piece
    legalMoves.sort((a, b) => {
      // 1. Capture
      const aCaptures = a.captures && a.captures.length > 0;
      const bCaptures = b.captures && b.captures.length > 0;
      if (aCaptures && !bCaptures) return -1;
      if (!aCaptures && bCaptures) return 1;

      // 2. Enters Home (FINISH)
      if (a.reachesHome && !b.reachesHome) return -1;
      if (!a.reachesHome && b.reachesHome) return 1;

      // 3. Entry out of yard
      if (a.isEntry && !b.isEntry) return -1;
      if (!a.isEntry && b.isEntry) return 1;

      // 4. Furthest progressed
      return b.from - a.from;
    });

    return { action: 'EXECUTE_COMPONENT', pieceIndex: legalMoves[0].pieceIndex };
  }

  return null;
}
