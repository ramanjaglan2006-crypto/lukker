// Movement Validation Engine — validates forward + backward moves, generates legal moves

import { FINISH_POSITION, isHomeColumn, isFinished, distanceToFinish, getTokenCoordinates, isSafeStep } from './board.js';
import { checkCapture, checkDestinationBlock, checkPathForBlocks, checkBlock } from './captures.js';
import { computePieceStatus, getPieceById } from './gameState.js';

// ─── Backward Movement Config ───────────────────────────────────────
// Open questions from the plan — defaults chosen, all configurable.
export const BACKWARD_RULES = {
  canPushToYard: true,          // If backward goes below 0, piece returns to yard
  homeColumnImmune: true,       // Pieces in home column (51–55) cannot be moved backward
  safeSquareImmune: true,       // Pieces on safe squares are immune to backward movement
  blockImmune: true,            // Pieces in a block (2+ same-color) are immune
};

// ─── Forward Move Validation ────────────────────────────────────────

/**
 * Validate a forward move: can a specific piece move forward by a given number of steps?
 * Used when direction = FORWARD (moving own pieces).
 *
 * @param {Object} gameState — authoritative game state
 * @param {string} playerId — the player attempting the move
 * @param {string} pieceId — e.g., "red-2"
 * @param {number} steps — number of steps to move
 * @returns {Object} validation result
 */
export function validateMove(gameState, playerId, pieceId, steps) {
  // 1. Basic validation
  if (steps <= 0) {
    return invalid('INVALID_STEP_COUNT', 'Steps must be positive');
  }

  // 2. Verify ownership
  const [pieceColor] = pieceId.split('-');
  if (pieceColor !== playerId) {
    return invalid('NOT_OWNER', 'Player does not own this piece');
  }

  // 3. Get the piece
  const piece = getPieceById(gameState, pieceId);
  if (!piece) {
    return invalid('PIECE_NOT_FOUND', `Piece ${pieceId} not found`);
  }

  // 4. Piece in YARD — can only enter with exactly 6
  if (piece.position === -1) {
    if (steps !== 6) {
      return invalid('ENTRY_REQUIRES_SIX', 'A piece can only leave the yard with a movement allocation of exactly 6');
    }
    // Entry move: yard (-1) → starting square (0)
    // Check if starting square is blocked by a block
    const blockCheck = checkDestinationBlock(gameState, playerId, 0);
    if (blockCheck.blocked) {
      return invalid('ENTRY_BLOCKED', 'Starting square is blocked by a block');
    }

    // Check for captures at starting square
    const captureCheck = checkCapture(gameState, playerId, 0);

    return {
      valid: true,
      reason: null,
      resultingPosition: 0,
      isEntry: true,
      captures: captureCheck.capturedPieces,
      createsBlock: wouldCreateBlock(gameState, playerId, 0, pieceId),
      reachesHome: false,
      entersHomeColumn: false,
    };
  }

  // 5. Piece already finished — cannot move
  if (piece.position === FINISH_POSITION) {
    return invalid('ALREADY_FINISHED', 'Piece has already reached home');
  }

  // 6. Calculate destination
  const destination = piece.position + steps;

  // 7. Check home overshoot
  if (destination > FINISH_POSITION) {
    return invalid('MOVE_EXCEEDS_HOME_DISTANCE',
      `Moving ${steps} from position ${piece.position} would overshoot home (need exactly ${distanceToFinish(piece.position)})`
    );
  }

  // 8. Check for opponent blocks along the path (main track only)
  if (piece.position <= 50 && destination <= 50) {
    // Entirely on main track
    const pathBlock = checkPathForBlocks(gameState, playerId, piece.position, destination);
    if (pathBlock.passesBlock) {
      return invalid('PATH_BLOCKED',
        `Path is blocked by ${pathBlock.blockingPlayer} at step ${pathBlock.blockedAtStep}`
      );
    }
  } else if (piece.position <= 50 && destination > 50) {
    // Transitioning from main track to home column
    // Check main track portion only (up to step 50)
    const pathBlock = checkPathForBlocks(gameState, playerId, piece.position, 50);
    if (pathBlock.passesBlock) {
      return invalid('PATH_BLOCKED',
        `Path is blocked by ${pathBlock.blockingPlayer} at step ${pathBlock.blockedAtStep}`
      );
    }
  }
  // If piece is already in home column (51+), no opponent blocks to check

  // 9. Check block at destination (main track only)
  if (destination <= 50) {
    const destBlock = checkDestinationBlock(gameState, playerId, destination);
    if (destBlock.blocked) {
      return invalid('DESTINATION_BLOCKED',
        `Destination is blocked by ${destBlock.blockingPlayer}`
      );
    }
  }

  // 10. Check captures at destination
  const captureCheck = destination <= 50
    ? checkCapture(gameState, playerId, destination)
    : { captured: false, capturedPieces: [] };

  // 11. Determine special conditions
  const reachesHome = destination === FINISH_POSITION;
  const entersHomeColumn = piece.position <= 50 && destination >= 51 && destination < FINISH_POSITION;

  return {
    valid: true,
    reason: null,
    resultingPosition: destination,
    isEntry: false,
    captures: captureCheck.capturedPieces,
    createsBlock: wouldCreateBlock(gameState, playerId, destination, pieceId),
    reachesHome,
    entersHomeColumn,
  };
}

// ─── Backward Move Validation ───────────────────────────────────────

/**
 * Validate a backward move: can a specific opponent piece be pushed backward by steps?
 * Used when direction = BACKWARD (winner pushes opponent's pieces back).
 *
 * @param {Object} gameState
 * @param {string} targetPlayerId — the opponent whose piece is being pushed
 * @param {string} pieceId — e.g., "blue-2"
 * @param {number} steps — steps to push backward
 * @returns {Object} validation result
 */
export function validateBackwardMove(gameState, targetPlayerId, pieceId, steps) {
  if (steps <= 0) {
    return invalid('INVALID_STEP_COUNT', 'Steps must be positive');
  }

  // Verify ownership matches target
  const [pieceColor] = pieceId.split('-');
  if (pieceColor !== targetPlayerId) {
    return invalid('NOT_TARGET_PIECE', 'Piece does not belong to the target player');
  }

  const piece = getPieceById(gameState, pieceId);
  if (!piece) {
    return invalid('PIECE_NOT_FOUND', `Piece ${pieceId} not found`);
  }

  // Can't push a piece that's already in the yard
  if (piece.position === -1) {
    return invalid('ALREADY_IN_YARD', 'Piece is already in the yard');
  }

  // Can't push a finished piece
  if (piece.position === FINISH_POSITION) {
    return invalid('ALREADY_FINISHED', 'Cannot push a finished piece backward');
  }

  // Home column immunity check
  if (BACKWARD_RULES.homeColumnImmune && piece.position >= 51) {
    return invalid('HOME_COLUMN_IMMUNE', 'Pieces in the home column are immune to backward movement');
  }

  // Safe square immunity check
  if (BACKWARD_RULES.safeSquareImmune) {
    if (isSafeStep(targetPlayerId, piece.position)) {
      return invalid('SAFE_SQUARE_IMMUNE', 'Pieces on safe squares are immune to backward movement');
    }
  }

  // Block immunity check
  if (BACKWARD_RULES.blockImmune) {
    const blockCheck = checkBlock(gameState, targetPlayerId, piece.position);
    if (blockCheck.isBlock) {
      return invalid('BLOCK_IMMUNE', 'Pieces in a block are immune to backward movement');
    }
  }

  // Calculate resulting position
  let resultingPosition = piece.position - steps;

  // Handle going below 0
  if (resultingPosition < 0) {
    if (BACKWARD_RULES.canPushToYard) {
      resultingPosition = -1; // Pushed back to yard
    } else {
      resultingPosition = 0; // Clamp at starting square
    }
  }

  return {
    valid: true,
    reason: null,
    resultingPosition,
    isEntry: false,
    captures: [],
    createsBlock: false,
    reachesHome: false,
    entersHomeColumn: false,
    pushedToYard: resultingPosition === -1,
  };
}

// ─── Legal Move Generation (Forward) ────────────────────────────────

/**
 * Generate all legal forward moves for a player given a specific component value.
 *
 * @param {Object} gameState
 * @param {string} playerId
 * @param {number} componentValue — the exact steps from this component
 * @returns {Array<Object>} list of legal moves
 */
export function getAllLegalMoves(gameState, playerId, componentValue) {
  const player = gameState.players[playerId];
  if (!player) return [];

  const legalMoves = [];

  player.pieces.forEach((piece, idx) => {
    // Skip finished pieces
    if (piece.position === FINISH_POSITION) return;

    if (piece.position === -1) {
      // YARD: can only enter with exactly 6
      if (componentValue === 6) {
        const validation = validateMove(gameState, playerId, piece.id, 6);
        if (validation.valid) {
          legalMoves.push({
            pieceId: piece.id,
            pieceIndex: idx,
            steps: 6,
            from: -1,
            to: 0,
            isEntry: true,
            captures: validation.captures,
            createsBlock: validation.createsBlock,
            reachesHome: false,
            entersHomeColumn: false,
          });
        }
      }
    } else {
      // ACTIVE / HOME_COLUMN: move exactly componentValue steps
      const validation = validateMove(gameState, playerId, piece.id, componentValue);
      if (validation.valid) {
        legalMoves.push({
          pieceId: piece.id,
          pieceIndex: idx,
          steps: componentValue,
          from: piece.position,
          to: validation.resultingPosition,
          isEntry: false,
          captures: validation.captures,
          createsBlock: validation.createsBlock,
          reachesHome: validation.reachesHome,
          entersHomeColumn: validation.entersHomeColumn,
        });
      }
    }
  });

  return legalMoves;
}

// ─── Legal Move Generation (Backward) ───────────────────────────────

/**
 * Generate all legal backward moves for an opponent's pieces.
 *
 * @param {Object} gameState
 * @param {string} targetPlayerId — opponent whose pieces can be pushed
 * @param {number} componentValue — steps to push backward
 * @returns {Array<Object>} list of legal backward moves
 */
export function getAllLegalBackwardMoves(gameState, targetPlayerId, componentValue) {
  const player = gameState.players[targetPlayerId];
  if (!player) return [];

  const legalMoves = [];

  player.pieces.forEach((piece, idx) => {
    const validation = validateBackwardMove(gameState, targetPlayerId, piece.id, componentValue);
    if (validation.valid) {
      legalMoves.push({
        pieceId: piece.id,
        pieceIndex: idx,
        steps: componentValue,
        from: piece.position,
        to: validation.resultingPosition,
        isBackward: true,
        pushedToYard: validation.pushedToYard,
      });
    }
  });

  return legalMoves;
}

/**
 * Check if a player has ANY legal forward moves with a given component value.
 */
export function hasAnyLegalMove(gameState, playerId, componentValue) {
  return getAllLegalMoves(gameState, playerId, componentValue).length > 0;
}

/**
 * Check if any backward moves exist for a target player.
 */
export function hasAnyBackwardMove(gameState, targetPlayerId, componentValue) {
  return getAllLegalBackwardMoves(gameState, targetPlayerId, componentValue).length > 0;
}

/**
 * Get all pieces that can be moved forward (have at least one legal move).
 * Returns indices (0..3) matching the format the existing frontend expects.
 */
export function getMovablePieceIndices(gameState, playerId, componentValue) {
  const moves = getAllLegalMoves(gameState, playerId, componentValue);
  const indices = new Set(moves.map(m => m.pieceIndex));
  return Array.from(indices).sort();
}

/**
 * Get all opponent pieces that can be pushed backward.
 */
export function getBackwardMovablePieceIndices(gameState, targetPlayerId, componentValue) {
  const moves = getAllLegalBackwardMoves(gameState, targetPlayerId, componentValue);
  const indices = new Set(moves.map(m => m.pieceIndex));
  return Array.from(indices).sort();
}

/**
 * Get all legal step values for a specific piece (forward movement).
 * In the component system, there's only one legal step: the component value itself.
 * But we keep this function for compatibility with the token click handler.
 */
export function getLegalStepsForPiece(gameState, playerId, pieceId, componentValue) {
  const piece = getPieceById(gameState, pieceId);
  if (!piece) return [];

  if (piece.position === FINISH_POSITION) return [];

  if (piece.position === -1) {
    if (componentValue === 6) {
      const v = validateMove(gameState, playerId, pieceId, 6);
      if (v.valid) return [6];
    }
    return [];
  }

  // Active piece: can only move exactly the component value
  const v = validateMove(gameState, playerId, pieceId, componentValue);
  if (v.valid) return [componentValue];
  return [];
}

// ─── Internal Helpers ───────────────────────────────────────────────

function invalid(reason, message) {
  return {
    valid: false,
    reason,
    message,
    resultingPosition: null,
    isEntry: false,
    captures: [],
    createsBlock: false,
    reachesHome: false,
    entersHomeColumn: false,
  };
}

/**
 * Check if placing a piece at a destination would create a block (2+ same-color pieces).
 */
function wouldCreateBlock(gameState, playerColor, destinationStep, movingPieceId) {
  if (destinationStep < 0 || destinationStep > 50) return false;

  const player = gameState.players[playerColor];
  const destCoords = getTokenCoordinates(playerColor, destinationStep);
  if (!destCoords) return false;

  let count = 0;

  player.pieces.forEach(piece => {
    if (piece.id === movingPieceId) return; // Don't count the moving piece at its current position
    if (piece.position < 0 || piece.position > 50) return;

    const pieceCoords = getTokenCoordinates(playerColor, piece.position);
    if (pieceCoords && destCoords.r === pieceCoords.r && destCoords.c === pieceCoords.c) {
      count++;
    }
  });

  return count >= 1; // If 1 other piece is already there, placing this one creates a block (2 total)
}
