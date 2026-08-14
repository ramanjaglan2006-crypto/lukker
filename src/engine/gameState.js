// Game State — central authoritative state factory and enums

// ─── Phase Enum ─────────────────────────────────────────────────────
export const Phase = {
  WAITING:              'WAITING',
  POKER_ROUND:          'POKER_ROUND', // Legacy, keeping for compatibility initially
  POKER_BLINDS:         'POKER_BLINDS',
  POKER_DEAL:           'POKER_DEAL',
  POKER_PRE_FLOP:       'POKER_PRE_FLOP',
  POKER_FLOP:           'POKER_FLOP',
  POKER_TURN:           'POKER_TURN',
  POKER_RIVER:          'POKER_RIVER',
  POKER_SHOWDOWN:       'POKER_SHOWDOWN',
  DIRECTION_CHOICE:     'DIRECTION_CHOICE',     // Winner chooses forward/backward
  PLAYER_CHOICE:        'PLAYER_CHOICE',        // Tier 4/5: player picks movement values
  MOVEMENT_SELECTION:   'MOVEMENT_SELECTION',
  MOVEMENT_EXECUTION:   'MOVEMENT_EXECUTION',
  TURN_COMPLETE:        'TURN_COMPLETE',
  GAME_OVER:            'GAME_OVER',
};

// ─── Piece Status Enum ──────────────────────────────────────────────
export const PieceStatus = {
  YARD:        'YARD',
  ACTIVE:      'ACTIVE',
  HOME_COLUMN: 'HOME_COLUMN',
  FINISHED:    'FINISHED',
};

// ─── Poker Result Enum ──────────────────────────────────────────────
export const PokerResultType = {
  WIN:    'WIN',
  FOLD:   'FOLD',
  LOSS:   'LOSS',
};

// ─── Direction Enum ─────────────────────────────────────────────────
export const Direction = {
  FORWARD:  'FORWARD',
  BACKWARD: 'BACKWARD',
};

// ─── Bankroll Constant ──────────────────────────────────────────────
export const BANKROLL_PER_TURN = 6;

// ─── Player Colors ──────────────────────────────────────────────────
export const PlayerColors = ['red', 'green', 'yellow', 'blue'];

// ─── Turn Order by Player Count ─────────────────────────────────────
const TURN_ORDERS = {
  2: ['red', 'yellow'],
  3: ['red', 'green', 'yellow'],
  4: ['red', 'green', 'yellow', 'blue'],
};

// ─── Piece Factory ──────────────────────────────────────────────────
function createPiece(playerId, color, index) {
  return {
    id: `${color}-${index}`,
    playerId,
    color,
    index,
    status: PieceStatus.YARD,
    position: -1, // -1 = in yard, 0..50 = main track, 51..55 = home column, 56 = finished
  };
}

// ─── Player Factory ─────────────────────────────────────────────────
function createPlayer(color, index) {
  return {
    id: color,
    name: `${color.charAt(0).toUpperCase() + color.slice(1)} Player`,
    color,
    index,
    pieces: [
      createPiece(color, color, 0),
      createPiece(color, color, 1),
      createPiece(color, color, 2),
      createPiece(color, color, 3),
    ],
    piecesFinished: 0,
    hasFinished: false,
    finishRank: null,
    finishTime: null,
  };
}

// ─── Game State Factory ─────────────────────────────────────────────
let gameIdCounter = 0;

/**
 * Create a fresh game state.
 * @param {number} playerCount — 2, 3, or 4
 * @returns {Object} authoritative game state
 */
export function createGameState(playerCount = 4) {
  if (![2, 3, 4].includes(playerCount)) {
    throw new Error(`Invalid player count: ${playerCount}. Must be 2, 3, or 4.`);
  }

  const turnOrder = TURN_ORDERS[playerCount];
  const players = {};
  turnOrder.forEach((color, idx) => {
    players[color] = createPlayer(color, idx);
  });

  gameIdCounter += 1;

  return {
    gameId: `game-${gameIdCounter}-${Date.now()}`,
    playerCount,
    turnOrder,
    players,
    currentPlayer: turnOrder[0], // Red always starts
    turnNumber: 1,
    phase: Phase.WAITING,

    // ─── Bankroll (fresh 6 every turn, no carryover) ───
    bankroll: BANKROLL_PER_TURN,

    // ─── Poker state ───
    deck: [],
    communityCards: [],
    pot: 0,
    activePokerPlayers: [...turnOrder],
    dealerButton: 0,
    pokerPlayers: turnOrder.reduce((acc, playerId) => {
      acc[playerId] = {
        holeCards: [],
        bankroll: BANKROLL_PER_TURN,
        currentBet: 0,
        hasFolded: false,
        isAllIn: false,
        hasActed: false
      };
      return acc;
    }, {}),
    currentPokerActor: null, // playerId whose turn it is to act in poker
    currentBetToMatch: 0,
    
    pokerResult: null,       // { result: 'WIN'|'FOLD'|'LOSS', winnings: number } (Legacy compat)
    tiedPokerWinners: [],    // [{ playerId, winnings }] for handling ties
    currentTieIndex: 0,      // Index of the tied player currently doing their Ludo move
    lastPokerResult: null,

    // ─── Direction choice ───
    movementDirection: null, // 'FORWARD' | 'BACKWARD'
    movementTarget: null,    // playerId — self for FORWARD, opponent for BACKWARD

    // ─── Movement tier ───
    movementTier: null,            // tier number (1–5) from getMovementTier()

    // ─── Player choice (Tier 4/5) ───
    playerChoicePhase: false,      // true when waiting for player to choose movement values
    pendingPlayerChoices: [],      // indices of PLAYER_CHOICE components needing input

    // ─── Movement components ───
    movementComponents: [],        // [6, 6, 5] — decomposed from winnings (resolved)
    componentAssignments: [],      // [{ componentIndex, pieceId, executed }]
    currentComponentIndex: 0,      // which component is being assigned next
    totalWinnings: 0,              // raw poker winnings (never reduced)

    // ─── Legacy compatibility ───
    movementPool: 0,
    movementUsed: 0,
    movementAllocations: [],

    // Rankings
    rankings: [], // { playerId, rank, finishTime }
    winner: null,

    // Event log
    eventLog: [],
  };
}

// ─── State Query Helpers ────────────────────────────────────────────

/**
 * Get a flat array of all pieces for a player.
 */
export function getPlayerPieces(gameState, playerId) {
  const player = gameState.players[playerId];
  if (!player) return [];
  return player.pieces;
}

/**
 * Get a specific piece by its ID (e.g., "red-2").
 */
export function getPieceById(gameState, pieceId) {
  const [color] = pieceId.split('-');
  const player = gameState.players[color];
  if (!player) return null;
  return player.pieces.find(p => p.id === pieceId) || null;
}

/**
 * Get the status of a piece based on its position.
 */
export function computePieceStatus(position) {
  if (position === -1) return PieceStatus.YARD;
  if (position >= 0 && position <= 50) return PieceStatus.ACTIVE;
  if (position >= 51 && position <= 55) return PieceStatus.HOME_COLUMN;
  if (position === 56) return PieceStatus.FINISHED;
  return PieceStatus.YARD;
}

/**
 * Get the next player in turn order.
 */
export function getNextPlayer(gameState) {
  const { turnOrder, currentPlayer, players } = gameState;
  const currentIdx = turnOrder.indexOf(currentPlayer);

  // Find next player who hasn't finished
  for (let i = 1; i <= turnOrder.length; i++) {
    const nextIdx = (currentIdx + i) % turnOrder.length;
    const nextColor = turnOrder[nextIdx];
    if (!players[nextColor].hasFinished) {
      return nextColor;
    }
  }

  // All players finished
  return null;
}

/**
 * Get remaining movement pool for current turn.
 */
export function getRemainingMovement(gameState) {
  return gameState.movementPool - gameState.movementUsed;
}

/**
 * Get the current component being assigned.
 * Returns null if all components are assigned.
 */
export function getCurrentComponent(gameState) {
  if (gameState.currentComponentIndex >= gameState.movementComponents.length) {
    return null;
  }
  return {
    index: gameState.currentComponentIndex,
    value: gameState.movementComponents[gameState.currentComponentIndex],
  };
}

/**
 * Check if all movement components have been assigned.
 */
export function allComponentsAssigned(gameState) {
  return gameState.currentComponentIndex >= gameState.movementComponents.length;
}

/**
 * Convert engine piece state to the legacy token format expected by existing frontend.
 * Returns { red: [step, step, step, step], green: [...], ... }
 */
export function toTokensFormat(gameState) {
  const tokens = {};
  for (const color of PlayerColors) {
    if (gameState.players[color]) {
      tokens[color] = gameState.players[color].pieces.map(p => p.position);
    } else {
      tokens[color] = [-1, -1, -1, -1];
    }
  }
  return tokens;
}

/**
 * Deep clone game state for immutable updates.
 */
export function cloneState(gameState) {
  return JSON.parse(JSON.stringify(gameState));
}
