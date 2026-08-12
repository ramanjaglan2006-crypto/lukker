// Board Topology — wraps ludoPaths.js with engine-specific helpers

import {
  PLAYERS,
  PLAYER_CONFIGS,
  MAIN_TRACK,
  SAFE_CELLS,
  ARROW_CELLS,
  getTokenCoordinates,
  isSafeCell,
} from '../utils/ludoPaths.js';

// Re-export everything from ludoPaths for convenience
export {
  PLAYERS,
  PLAYER_CONFIGS,
  MAIN_TRACK,
  SAFE_CELLS,
  ARROW_CELLS,
  getTokenCoordinates,
  isSafeCell,
};

// ─── Board Constants ────────────────────────────────────────────────
export const TRACK_LENGTH = 52;       // Main track is 52 cells (indices 0..51)
export const HOME_COLUMN_START = 51;  // Home column steps: 51, 52, 53, 54, 55
export const HOME_COLUMN_END = 55;
export const FINISH_POSITION = 56;    // Final home/finish position
export const ENTRY_STEP = 0;          // Step 0 = player's starting square on the main track

// Number of main-track steps before a piece turns into its home column
// A piece enters the track at its startIndex and must travel the full loop
// (51 steps on the main track: 0..50) before entering its home column at step 51.
export const STEPS_BEFORE_HOME = 51;

// ─── Safe Square Mapping by Player-Relative Step ────────────────────
// Pre-compute which player-relative steps land on safe squares.
// This avoids coordinate lookups during validation.

const _safeStepCache = {};

/**
 * Check if a given player-relative step is a safe square.
 * @param {string} playerColor
 * @param {number} step — player-relative step (0..50 on main track)
 * @returns {boolean}
 */
export function isSafeStep(playerColor, step) {
  const cacheKey = `${playerColor}-${step}`;
  if (_safeStepCache[cacheKey] !== undefined) {
    return _safeStepCache[cacheKey];
  }

  // Home column and finish are always safe
  if (step >= HOME_COLUMN_START) {
    _safeStepCache[cacheKey] = true;
    return true;
  }

  // Yard is not on the board
  if (step < 0) {
    _safeStepCache[cacheKey] = false;
    return false;
  }

  const coords = getTokenCoordinates(playerColor, step);
  if (!coords) {
    _safeStepCache[cacheKey] = false;
    return false;
  }

  const safe = isSafeCell(coords.r, coords.c);
  _safeStepCache[cacheKey] = safe;
  return safe;
}

/**
 * Get the absolute track index (0..51) for a player's step on the main track.
 * @param {string} playerColor
 * @param {number} step — player-relative step (0..50)
 * @returns {number} absolute track index
 */
export function getAbsoluteTrackIndex(playerColor, step) {
  if (step < 0 || step > 50) return -1;
  const config = PLAYER_CONFIGS[playerColor];
  return (config.startIndex + step) % TRACK_LENGTH;
}

/**
 * Check if a step is in the home column (51..55).
 */
export function isHomeColumn(step) {
  return step >= HOME_COLUMN_START && step <= HOME_COLUMN_END;
}

/**
 * Check if a step is the finish position (56).
 */
export function isFinished(step) {
  return step === FINISH_POSITION;
}

/**
 * Calculate distance remaining to reach finish (56).
 * @param {number} step — current position
 * @returns {number} steps remaining to finish, or -1 if in yard
 */
export function distanceToFinish(step) {
  if (step < 0) return -1;
  return FINISH_POSITION - step;
}

/**
 * Find all pieces at a given grid coordinate.
 * @param {Object} gameState
 * @param {number} row
 * @param {number} col
 * @returns {Array<{playerId, pieceId, pieceIndex, step}>}
 */
export function getOccupantsAtCell(gameState, row, col) {
  const occupants = [];
  for (const playerId of Object.keys(gameState.players)) {
    const player = gameState.players[playerId];
    player.pieces.forEach((piece, idx) => {
      if (piece.position >= 0) {
        const coords = getTokenCoordinates(playerId, piece.position);
        if (coords && coords.r === row && coords.c === col) {
          occupants.push({
            playerId,
            pieceId: piece.id,
            pieceIndex: idx,
            step: piece.position,
          });
        }
      }
    });
  }
  return occupants;
}

/**
 * Check if two pieces (potentially different players) occupy the same board cell.
 * Compares by grid coordinates, not step values (since different players at
 * different steps may occupy the same physical cell).
 * @param {string} color1
 * @param {number} step1
 * @param {string} color2
 * @param {number} step2
 * @returns {boolean}
 */
export function arePiecesOnSameCell(color1, step1, color2, step2) {
  // Both must be on the main track (0..50) for collision
  // Home column is player-specific, so no collision between different players there
  if (step1 < 0 || step2 < 0) return false;
  if (step1 > 50 || step2 > 50) return false; // Home column/finish — no cross-player collision

  const coords1 = getTokenCoordinates(color1, step1);
  const coords2 = getTokenCoordinates(color2, step2);

  if (!coords1 || !coords2) return false;

  return coords1.r === coords2.r && coords1.c === coords2.c;
}
