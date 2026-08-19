// Win Condition — detection and ranking management

import { FINISH_POSITION } from './board.js';

/**
 * Check if a player has won (all 4 pieces reached FINISHED position).
 * @param {Object} gameState
 * @param {string} playerId
 * @returns {boolean}
 */
export function checkWin(gameState, playerId) {
  const player = gameState.players[playerId];
  if (!player) return false;

  return player.pieces.every(piece => piece.position === FINISH_POSITION);
}

/**
 * Count how many pieces a player has finished.
 * @param {Object} gameState
 * @param {string} playerId
 * @returns {number}
 */
export function getFinishedCount(gameState, playerId) {
  const player = gameState.players[playerId];
  if (!player) return 0;

  return player.pieces.filter(piece => piece.position === FINISH_POSITION).length;
}

/**
 * Update rankings when a player finishes.
 * Returns a new game state with updated rankings.
 * @param {Object} gameState
 * @param {string} playerId
 * @returns {Object} updated game state
 */
export function updateRankings(gameState, playerId) {
  const newState = JSON.parse(JSON.stringify(gameState));
  const player = newState.players[playerId];

  if (player.hasFinished) return newState; // Already ranked

  const rank = newState.rankings.length + 1;
  const now = Date.now();

  player.hasFinished = true;
  player.finishRank = rank;
  player.finishTime = now;
  player.piecesFinished = 4;

  newState.rankings.push({
    playerId,
    rank,
    finishTime: now,
  });

  // Set winner if this is the first player to finish
  if (rank === 1) {
    newState.winner = playerId;
  }

  return newState;
}

/**
 * Check if the entire game is over.
 * Game is over when all players have finished or only one player remains unfinished.
 * @param {Object} gameState
 * @returns {boolean}
 */
export function isGameOver(gameState) {
  const unfinishedPlayers = gameState.turnOrder.filter(
    color => !gameState.players[color].hasFinished
  );

  // Game over if 0 or 1 unfinished players
  return unfinishedPlayers.length <= 1;
}

/**
 * Finalize game — assign remaining ranks to unfinished players.
 * @param {Object} gameState
 * @returns {Object} updated game state
 */
export function finalizeGame(gameState) {
  let newState = JSON.parse(JSON.stringify(gameState));

  // Rank remaining unfinished players by their progress (pieces finished count)
  const unfinished = newState.turnOrder
    .filter(color => !newState.players[color].hasFinished)
    .sort((a, b) => {
      const aFinished = newState.players[a].pieces.filter(p => p.position === FINISH_POSITION).length;
      const bFinished = newState.players[b].pieces.filter(p => p.position === FINISH_POSITION).length;
      return bFinished - aFinished; // More finished pieces = better rank
    });

  unfinished.forEach(playerId => {
    newState = updateRankings(newState, playerId);
  });

  return newState;
}
