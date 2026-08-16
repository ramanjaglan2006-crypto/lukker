// Movement Tier Resolver — pure function, no side effects
//
// FINAL TIER TABLE (Master Prompt §5–§13):
//
//   Tier 1: Winnings 1–6   → [winnings]                         (exact movement)
//   Tier 2: Winnings 7–11  → [6, winnings-6]                    (6 + remainder)
//   Tier 3: Winnings 12–17 → [6, 6, winnings-12]                (6 + 6 + remainder)
//   Tier 4: Winnings 18–23 → [6, 6, PLAYER_CHOICE(1–6)]         (6 + 6 + player picks third)
//   Tier 5: Winnings 24    → [CHOICE, CHOICE, CHOICE]            (player picks all 3, each 1–6)
//
// CRITICAL RULES:
//   - Maximum Ludo movement in one resolution = 18
//   - 24 winnings ≠ 24 movement. 24 = 3 strategic choices, max 6 each, max 18 total
//   - Winnings above 18 determine the tier, NOT the movement amount
//   - 10 is a valid poker result (Tier 2: 6 + 4)

/**
 * Resolve poker winnings into a movement tier.
 *
 * @param {number} winnings — poker winnings (1–24)
 * @returns {{
 *   tier: number,
 *   moves: Array<number|string>,
 *   hasPlayerChoice: boolean,
 *   playerChoiceIndices: number[],
 *   maxPerMove: number,
 *   maxTotalMovement: number,
 *   originalWinnings: number,
 * }}
 */
export function getMovementTier(winnings) {
  if (winnings <= 0) {
    return {
      tier: 0,
      moves: [],
      hasPlayerChoice: false,
      playerChoiceIndices: [],
      maxPerMove: 6,
      maxTotalMovement: 0,
      originalWinnings: winnings,
    };
  }

  // ─── Tier 1: Winnings 1–6 ─────────────────────────────────
  if (winnings >= 1 && winnings <= 6) {
    return {
      tier: 1,
      moves: [winnings],
      hasPlayerChoice: false,
      playerChoiceIndices: [],
      maxPerMove: 6,
      maxTotalMovement: winnings,
      originalWinnings: winnings,
    };
  }

  // ─── Tier 2: Winnings 7–11 ────────────────────────────────
  if (winnings >= 7 && winnings <= 11) {
    return {
      tier: 2,
      moves: [6, winnings - 6],
      hasPlayerChoice: false,
      playerChoiceIndices: [],
      maxPerMove: 6,
      maxTotalMovement: winnings,
      originalWinnings: winnings,
    };
  }

  // ─── Tier 3: Winnings 12–17 ───────────────────────────────
  if (winnings >= 12 && winnings <= 17) {
    const remainder = winnings - 12;
    const moves = remainder > 0 ? [6, 6, remainder] : [6, 6];
    return {
      tier: 3,
      moves,
      hasPlayerChoice: false,
      playerChoiceIndices: [],
      maxPerMove: 6,
      maxTotalMovement: winnings,
      originalWinnings: winnings,
    };
  }

  // ─── Tier 4: Winnings 18–23 ───────────────────────────────
  // Player gets 6 + 6 + player's chosen third movement (1–6)
  // Maximum total = 18, regardless of how high the winnings are
  if (winnings >= 18 && winnings <= 23) {
    return {
      tier: 4,
      moves: [6, 6, 'PLAYER_CHOICE'],
      hasPlayerChoice: true,
      playerChoiceIndices: [2],
      maxPerMove: 6,
      maxTotalMovement: 18,
      originalWinnings: winnings,
    };
  }

  // ─── Tier 5: Winnings = 24 ────────────────────────────────
  // Player chooses all 3 movement values (each 1–6)
  // Exactly 3 movements. Maximum total = 18.
  // 24 ≠ 24 movement. 24 = 3 strategic choices.
  if (winnings === 24) {
    return {
      tier: 5,
      moves: ['PLAYER_CHOICE', 'PLAYER_CHOICE', 'PLAYER_CHOICE'],
      hasPlayerChoice: true,
      playerChoiceIndices: [0, 1, 2],
      maxPerMove: 6,
      maxTotalMovement: 18,
      originalWinnings: winnings,
    };
  }

  // Beyond 24 should not occur, but handle gracefully
  // Treat as Tier 5 (max strategic freedom, capped at 18)
  return {
    tier: 5,
    moves: ['PLAYER_CHOICE', 'PLAYER_CHOICE', 'PLAYER_CHOICE'],
    hasPlayerChoice: true,
    playerChoiceIndices: [0, 1, 2],
    maxPerMove: 6,
    maxTotalMovement: 18,
    originalWinnings: winnings,
  };
}

/**
 * Validate player choices for Tier 4 or Tier 5.
 *
 * Tier 4: exactly 1 choice (the third movement), 1–6
 * Tier 5: exactly 3 choices (all movements), each 1–6, total ≤ 18
 *
 * @param {number} tier — 4 or 5
 * @param {number[]} choices — array of chosen values
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validatePlayerChoices(tier, choices) {
  if (!Array.isArray(choices)) {
    return { valid: false, reason: 'Choices must be an array' };
  }

  if (tier === 4) {
    if (choices.length !== 1) {
      return { valid: false, reason: `Tier 4 requires exactly 1 choice, got ${choices.length}` };
    }
    const val = choices[0];
    if (!Number.isInteger(val) || val < 1 || val > 6) {
      return { valid: false, reason: `Choice must be 1–6, got ${val}` };
    }
    return { valid: true };
  }

  if (tier === 5) {
    if (choices.length !== 3) {
      return { valid: false, reason: `Tier 5 requires exactly 3 choices, got ${choices.length}` };
    }
    for (let i = 0; i < choices.length; i++) {
      const val = choices[i];
      if (!Number.isInteger(val) || val < 1 || val > 6) {
        return { valid: false, reason: `Choice ${i + 1} must be 1–6, got ${val}` };
      }
    }
    const total = choices.reduce((sum, v) => sum + v, 0);
    if (total > 18) {
      return { valid: false, reason: `Total movement ${total} exceeds maximum 18` };
    }
    return { valid: true };
  }

  return { valid: false, reason: `validatePlayerChoices only applies to Tier 4 or 5, got tier ${tier}` };
}

/**
 * Resolve PLAYER_CHOICE placeholders into concrete values.
 *
 * @param {Array<number|string>} moves — from getMovementTier().moves
 * @param {number[]} playerChoiceIndices — indices that have PLAYER_CHOICE
 * @param {number[]} choices — player's chosen values (validated)
 * @returns {number[]} resolved moves array (all numbers)
 */
export function resolvePlayerChoices(moves, playerChoiceIndices, choices) {
  const resolved = [...moves];
  for (let i = 0; i < playerChoiceIndices.length; i++) {
    const idx = playerChoiceIndices[i];
    resolved[idx] = choices[i];
  }
  return resolved;
}
