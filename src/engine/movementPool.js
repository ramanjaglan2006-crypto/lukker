// Movement Pool v3 — 5-Tier Decomposition from Poker Winnings
//
// FINAL TIER TABLE (absolute source of truth):
//
//   Tier 1: Winnings 1–6   → [winnings]                    (exact movement)
//   Tier 2: Winnings 7–11  → [6, winnings-6]               (6 + remainder)
//   Tier 3: Winnings 12–17 → [6, 6, winnings-12]           (6 + 6 + remainder)
//   Tier 4: Winnings 18–23 → [6, 6, PLAYER_CHOICE(1–6)]    (max = 18)
//   Tier 5: Winnings 24    → [CHOICE, CHOICE, CHOICE]       (max each = 6, max total = 18)
//
// CRITICAL:
//   Maximum Ludo movement = 18
//   24 winnings ≠ 24 movement
//   Poker winnings above 18 determine the tier, NOT additional movement

import { getMovementTier, validatePlayerChoices, resolvePlayerChoices } from './movementTier.js';

// Re-export for convenience
export { getMovementTier, validatePlayerChoices, resolvePlayerChoices };

// ─── Component Decomposition ────────────────────────────────────────

/**
 * Decompose poker winnings into movement components using the 5-tier system.
 *
 * @param {number} winnings — total poker winnings (1–24)
 * @returns {{
 *   tier: number,
 *   components: Array<number|string>,
 *   totalComponents: number,
 *   hasPlayerChoice: boolean,
 *   playerChoiceIndices: number[],
 *   maxPerMove: number,
 *   maxTotalMovement: number,
 *   originalWinnings: number,
 * }}
 */
export function decomposeWinnings(winnings) {
  if (winnings <= 0) {
    return {
      tier: 0,
      components: [],
      totalComponents: 0,
      hasPlayerChoice: false,
      playerChoiceIndices: [],
      maxPerMove: 6,
      maxTotalMovement: 0,
      originalWinnings: winnings,
    };
  }

  const tierResult = getMovementTier(winnings);

  return {
    tier: tierResult.tier,
    components: tierResult.moves,
    totalComponents: tierResult.moves.length,
    hasPlayerChoice: tierResult.hasPlayerChoice,
    playerChoiceIndices: tierResult.playerChoiceIndices,
    maxPerMove: tierResult.maxPerMove,
    maxTotalMovement: tierResult.maxTotalMovement,
    originalWinnings: winnings,
  };
}

// ─── Component Pool ─────────────────────────────────────────────────

/**
 * Create a component pool from poker winnings.
 * For Tiers 1–3, components are immediately ready.
 * For Tiers 4–5, PLAYER_CHOICE placeholders must be resolved first
 * via resolvePoolChoices().
 *
 * @param {number} winnings
 * @returns {Object} pool state with components and assignment tracking
 */
export function createComponentPool(winnings) {
  const decomposition = decomposeWinnings(winnings);

  return {
    originalWinnings: winnings,
    tier: decomposition.tier,
    components: decomposition.components,
    totalComponents: decomposition.totalComponents,
    hasPlayerChoice: decomposition.hasPlayerChoice,
    playerChoiceIndices: decomposition.playerChoiceIndices,
    maxPerMove: decomposition.maxPerMove,
    maxTotalMovement: decomposition.maxTotalMovement,
    resolved: !decomposition.hasPlayerChoice, // true if no player choices needed
    assignments: [],          // [{ componentIndex, pieceId, steps, executed }]
    currentIndex: 0,          // Next component to assign
  };
}

/**
 * Resolve PLAYER_CHOICE placeholders in a component pool.
 * Call this after the player has made their choices for Tier 4/5.
 *
 * @param {Object} pool — from createComponentPool()
 * @param {number[]} choices — player's chosen values
 * @returns {Object} updated pool with resolved components
 */
export function resolvePoolChoices(pool, choices) {
  const validation = validatePlayerChoices(pool.tier, choices);
  if (!validation.valid) {
    throw new Error(`Invalid player choices: ${validation.reason}`);
  }

  const resolvedComponents = resolvePlayerChoices(
    pool.components,
    pool.playerChoiceIndices,
    choices
  );

  return {
    ...pool,
    components: resolvedComponents,
    resolved: true,
  };
}
