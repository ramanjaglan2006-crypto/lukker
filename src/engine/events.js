// Game Event System — event types + emitter for engine → UI communication

// ─── Event Type Constants ───────────────────────────────────────────
export const EventTypes = {
  // Game lifecycle
  GAME_CREATED:              'GAME_CREATED',
  GAME_STARTED:              'GAME_STARTED',
  GAME_FINISHED:             'GAME_FINISHED',

  // Player lifecycle
  PLAYER_JOINED:             'PLAYER_JOINED',
  PLAYER_FINISHED:           'PLAYER_FINISHED',

  // Turn lifecycle
  TURN_STARTED:              'TURN_STARTED',
  TURN_COMPLETED:            'TURN_COMPLETED',

  // Bankroll
  BANKROLL_SET:              'BANKROLL_SET',

  // Poker phase
  POKER_STARTED:             'POKER_STARTED',
  POKER_RESOLVED:            'POKER_RESOLVED',
  POKER_WON:                 'POKER_WON',
  POKER_FOLDED:              'POKER_FOLDED',
  POKER_LOST:                'POKER_LOST',

  // Direction choice
  DIRECTION_CHOSEN:          'DIRECTION_CHOSEN',
  TARGET_SELECTED:           'TARGET_SELECTED',

  // Movement tier
  MOVEMENT_TIER_RESOLVED:    'MOVEMENT_TIER_RESOLVED',

  // Player choice (Tier 4/5)
  PLAYER_CHOICE_REQUIRED:    'PLAYER_CHOICE_REQUIRED',
  PLAYER_CHOICE_SUBMITTED:   'PLAYER_CHOICE_SUBMITTED',

  // Movement components
  COMPONENTS_CREATED:        'COMPONENTS_CREATED',
  COMPONENT_ASSIGNED:        'COMPONENT_ASSIGNED',
  MOVEMENT_SELECTION_STARTED:'MOVEMENT_SELECTION_STARTED',

  // Piece actions
  PIECE_SELECTED:            'PIECE_SELECTED',
  MOVEMENT_ALLOCATED:        'MOVEMENT_ALLOCATED',
  PIECE_MOVE_STARTED:        'PIECE_MOVE_STARTED',
  PIECE_STEP:                'PIECE_STEP',
  PIECE_MOVE_COMPLETED:      'PIECE_MOVE_COMPLETED',

  // Backward movement
  PIECE_MOVED_BACKWARD:      'PIECE_MOVED_BACKWARD',
  PIECE_PUSHED_TO_YARD:      'PIECE_PUSHED_TO_YARD',

  // Board interactions
  PIECE_CAPTURED:            'PIECE_CAPTURED',
  PIECE_RETURNED_HOME:       'PIECE_RETURNED_HOME',
  BLOCK_CREATED:             'BLOCK_CREATED',
  PIECE_ENTERED_HOME_COLUMN: 'PIECE_ENTERED_HOME_COLUMN',
  PIECE_FINISHED:            'PIECE_FINISHED',

  // Phase transitions
  PHASE_CHANGED:             'PHASE_CHANGED',

  // Errors
  INVALID_MOVE:              'INVALID_MOVE',
  NO_LEGAL_MOVES:            'NO_LEGAL_MOVES',
};

// ─── Event Factory ──────────────────────────────────────────────────
export function createEvent(type, payload = {}) {
  return {
    type,
    payload,
    timestamp: Date.now(),
  };
}

// ─── Event Emitter ──────────────────────────────────────────────────
export class EventEmitter {
  constructor() {
    this._handlers = {};
  }

  /**
   * Register a handler for an event type.
   * @param {string} type — one of EventTypes
   * @param {Function} handler — callback(event)
   * @returns {Function} unsubscribe function
   */
  on(type, handler) {
    if (!this._handlers[type]) {
      this._handlers[type] = [];
    }
    this._handlers[type].push(handler);

    // Return unsubscribe function
    return () => this.off(type, handler);
  }

  /**
   * Remove a handler for an event type.
   */
  off(type, handler) {
    if (!this._handlers[type]) return;
    this._handlers[type] = this._handlers[type].filter(h => h !== handler);
  }

  /**
   * Emit an event to all registered handlers.
   * @param {string} type
   * @param {Object} payload
   */
  emit(type, payload = {}) {
    const event = createEvent(type, payload);

    // Call specific handlers
    if (this._handlers[type]) {
      this._handlers[type].forEach(handler => {
        try {
          handler(event);
        } catch (err) {
          console.error(`[EventEmitter] Error in handler for ${type}:`, err);
        }
      });
    }

    // Call wildcard handlers (listen to everything)
    if (this._handlers['*']) {
      this._handlers['*'].forEach(handler => {
        try {
          handler(event);
        } catch (err) {
          console.error(`[EventEmitter] Error in wildcard handler:`, err);
        }
      });
    }

    return event;
  }

  /**
   * Remove all handlers.
   */
  removeAll() {
    this._handlers = {};
  }
}
