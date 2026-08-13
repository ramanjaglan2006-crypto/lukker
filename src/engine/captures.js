// Captures & Blocks — capture detection, block formation, safe-square immunity

import { arePiecesOnSameCell, isSafeStep, getTokenCoordinates, isSafeCell } from './board.js';

/**
 * Check if moving a piece to a destination step would capture any opponent pieces.
 * @param {Object} gameState
 * @param {string} movingPlayerColor — color of the moving player
 * @param {number} destinationStep — the destination step of the moving piece
 * @returns {{ captured: boolean, capturedPieces: Array<{playerId, pieceId, pieceIndex}> }}
 */
export function checkCapture(gameState, movingPlayerColor, destinationStep) {
  const result = { captured: false, capturedPieces: [] };

  // Cannot capture in home column or finish (player-specific areas)
  if (destinationStep >= 51) {
    return result;
  }

  // Cannot capture on safe squares
  if (isSafeStep(movingPlayerColor, destinationStep)) {
    return result;
  }

  // Check all opponent pieces
  for (const playerId of Object.keys(gameState.players)) {
    if (playerId === movingPlayerColor) continue;
    if (!gameState.turnOrder.includes(playerId)) continue;

    const player = gameState.players[playerId];
    player.pieces.forEach((piece, idx) => {
      // Only active pieces on main track can be captured (0..50)
      if (piece.position < 0 || piece.position > 50) return;

      // Check if they're on the same physical cell
      if (arePiecesOnSameCell(movingPlayerColor, destinationStep, playerId, piece.position)) {
        // Check if the opponent piece is part of a block (2+ same-color pieces on same cell)
        const blockCheck = checkBlock(gameState, playerId, piece.position);
        if (blockCheck.isBlock) {
          // Cannot capture a blocked piece — the attacker bounces back
          return;
        }

        result.captured = true;
        result.capturedPieces.push({
          playerId,
          pieceId: piece.id,
          pieceIndex: idx,
        });
      }
    });
  }

  return result;
}

/**
 * Check if a square has a block (2+ pieces of the same color).
 * @param {Object} gameState
 * @param {string} playerColor — the color to check for blocking
 * @param {number} step — the step position to check (player-relative)
 * @returns {{ isBlock: boolean, blockingPieces: Array<{pieceId, pieceIndex}> }}
 */
export function checkBlock(gameState, playerColor, step) {
  const result = { isBlock: false, blockingPieces: [] };

  if (step < 0 || step > 50) return result; // Blocks only matter on main track

  const player = gameState.players[playerColor];
  if (!player) return result;

  const coords = getTokenCoordinates(playerColor, step);
  if (!coords) return result;

  // Find all pieces of this player at the same grid cell
  player.pieces.forEach((piece, idx) => {
    if (piece.position < 0 || piece.position > 50) return;

    const pieceCoords = getTokenCoordinates(playerColor, piece.position);
    if (pieceCoords && pieceCoords.r === coords.r && pieceCoords.c === coords.c) {
      result.blockingPieces.push({ pieceId: piece.id, pieceIndex: idx });
    }
  });

  result.isBlock = result.blockingPieces.length >= 2;
  return result;
}

/**
 * Check if a square has a block (2+ pieces of the same color) from ANY player.
 * A block creates a barrier that no token can pass or land on (even the player's own).
 * @param {Object} gameState
 * @param {string} movingPlayerColor — the player trying to move
 * @param {number} destinationStep — the step the player wants to land on
 * @returns {{ blocked: boolean, blockingPlayer: string|null }}
 */
export function isSquareBlocked(gameState, movingPlayerColor, destinationStep) {
  if (destinationStep < 0 || destinationStep > 50) {
    return { blocked: false, blockingPlayer: null };
  }

  const movingCoords = getTokenCoordinates(movingPlayerColor, destinationStep);
  if (!movingCoords) return { blocked: false, blockingPlayer: null };

  // Check every player's tokens to see if they form a block at this coordinate
  for (const playerId of Object.keys(gameState.players)) {
    if (!gameState.turnOrder.includes(playerId)) continue;

    const player = gameState.players[playerId];
    let countAtCell = 0;
    
    player.pieces.forEach(piece => {
      if (piece.position < 0 || piece.position > 50) return;
      const pieceCoords = getTokenCoordinates(playerId, piece.position);
      if (pieceCoords && pieceCoords.r === movingCoords.r && pieceCoords.c === movingCoords.c) {
        countAtCell++;
      }
    });

    if (countAtCell >= 2) {
      return { blocked: true, blockingPlayer: playerId };
    }
  }

  return { blocked: false, blockingPlayer: null };
}

/**
 * Check if a piece passes through any blocks during its movement.
 * Examines each intermediate step along the path (exclusive of destination).
 * @param {Object} gameState
 * @param {string} movingPlayerColor
 * @param {number} fromStep — starting step
 * @param {number} toStep — destination step
 * @returns {{ passesBlock: boolean, blockedAtStep: number|null, blockingPlayer: string|null }}
 */
export function checkPathForBlocks(gameState, movingPlayerColor, fromStep, toStep) {
  // Only check intermediate main track steps (fromStep + 1 to toStep - 1)
  // We evaluate traversal (passing over), NOT landing. Landing is evaluated separately.
  const maxIntermediate = Math.min(toStep - 1, 50);
  
  for (let step = fromStep + 1; step <= maxIntermediate; step++) {
    const blockCheck = isSquareBlocked(gameState, movingPlayerColor, step);
    if (blockCheck.blocked) {
      return {
        passesBlock: true,
        blockedAtStep: step,
        blockingPlayer: blockCheck.blockingPlayer,
      };
    }
  }

  return { passesBlock: false, blockedAtStep: null, blockingPlayer: null };
}

/**
 * Check if the final destination square is blocked.
 * @param {Object} gameState
 * @param {string} movingPlayerColor
 * @param {number} destinationStep
 * @returns {{ blocked: boolean, blockingPlayer: string|null }}
 */
export function checkDestinationBlock(gameState, movingPlayerColor, destinationStep) {
  return isSquareBlocked(gameState, movingPlayerColor, destinationStep);
}

/**
 * Execute a capture: return captured piece to yard.
 * Returns a new game state (immutable update).
 * @param {Object} gameState
 * @param {string} capturedPieceId — e.g., "blue-2"
 * @returns {Object} updated game state
 */
export function executeCapture(gameState, capturedPieceId) {
  const [color] = capturedPieceId.split('-');
  const pieceIndex = parseInt(capturedPieceId.split('-')[1], 10);

  const newState = JSON.parse(JSON.stringify(gameState));
  const piece = newState.players[color].pieces[pieceIndex];

  piece.position = -1;
  piece.status = 'YARD';

  return newState;
}

/**
 * Check if a specific square is safe for a given player.
 * @param {string} playerColor
 * @param {number} step
 * @returns {boolean}
 */
export function isSquareSafe(playerColor, step) {
  return isSafeStep(playerColor, step);
}
