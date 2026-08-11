// Movement Tier Test — verifies all test cases from Master Prompt §30
//
// Run: node src/engine/__tests__/movementTier.test.js
//
// Tests:
//   - Bankroll is always 6 (conceptual)
//   - Tier 1: winnings 1–6 → exact movement
//   - Tier 2: winnings 7–11 → 6 + remainder
//   - Tier 3: winnings 12–17 → 6 + 6 + remainder
//   - Tier 4: winnings 18–23 → 6 + 6 + PLAYER_CHOICE, max 18
//   - Tier 5: winnings 24 → 3 choices, each ≤ 6, max 18
//   - Rejection cases: 4 allocations, single > 6, total > 18
//   - 24 ≠ 24 movement
//   - 10 is valid

import { getMovementTier, validatePlayerChoices, resolvePlayerChoices } from '../movementTier.js';
import { decomposeWinnings } from '../movementPool.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

function assertArrayEqual(actual, expected, message) {
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  assert(match, `${message} → [${actual}] ${match ? '===' : '!=='} [${expected}]`);
}

// ─── Tier 1: Winnings 1–6 ───────────────────────────────────────
console.log('\n── Tier 1: Winnings 1–6 (exact movement) ──');

for (let w = 1; w <= 6; w++) {
  const tier = getMovementTier(w);
  assert(tier.tier === 1, `Win ${w} → tier 1`);
  assertArrayEqual(tier.moves, [w], `Win ${w} → [${w}]`);
  assert(!tier.hasPlayerChoice, `Win ${w} → no player choice`);
  assert(tier.maxTotalMovement === w, `Win ${w} → max movement = ${w}`);
}

// ─── Tier 2: Winnings 7–11 ──────────────────────────────────────
console.log('\n── Tier 2: Winnings 7–11 (6 + remainder) ──');

const tier2Expected = {
  7:  [6, 1],
  8:  [6, 2],
  9:  [6, 3],
  10: [6, 4],
  11: [6, 5],
};

for (const [w, expected] of Object.entries(tier2Expected)) {
  const tier = getMovementTier(Number(w));
  assert(tier.tier === 2, `Win ${w} → tier 2`);
  assertArrayEqual(tier.moves, expected, `Win ${w} → [${expected}]`);
  assert(!tier.hasPlayerChoice, `Win ${w} → no player choice`);
  assert(tier.maxTotalMovement === Number(w), `Win ${w} → max movement = ${w}`);
}

// ─── Special: 10 is valid ─────────────────────────────────────
console.log('\n── Special: 10 is a valid poker result ──');
const tier10 = getMovementTier(10);
assert(tier10.tier === 2, 'Win 10 → tier 2 (NOT rejected)');
assertArrayEqual(tier10.moves, [6, 4], 'Win 10 → [6, 4]');

// ─── Tier 3: Winnings 12–17 ────────────────────────────────────
console.log('\n── Tier 3: Winnings 12–17 (6 + 6 + remainder) ──');

const tier3Expected = {
  12: [6, 6],
  13: [6, 6, 1],
  14: [6, 6, 2],
  15: [6, 6, 3],
  16: [6, 6, 4],
  17: [6, 6, 5],
};

for (const [w, expected] of Object.entries(tier3Expected)) {
  const tier = getMovementTier(Number(w));
  assert(tier.tier === 3, `Win ${w} → tier 3`);
  assertArrayEqual(tier.moves, expected, `Win ${w} → [${expected}]`);
  assert(!tier.hasPlayerChoice, `Win ${w} → no player choice`);
  assert(tier.maxTotalMovement === Number(w), `Win ${w} → max movement = ${w}`);
}

// ─── Tier 4: Winnings 18–23 ────────────────────────────────────
console.log('\n── Tier 4: Winnings 18–23 (6 + 6 + PLAYER_CHOICE) ──');

for (let w = 18; w <= 23; w++) {
  const tier = getMovementTier(w);
  assert(tier.tier === 4, `Win ${w} → tier 4`);
  assertArrayEqual(tier.moves, [6, 6, 'PLAYER_CHOICE'], `Win ${w} → [6, 6, PLAYER_CHOICE]`);
  assert(tier.hasPlayerChoice, `Win ${w} → has player choice`);
  assertArrayEqual(tier.playerChoiceIndices, [2], `Win ${w} → choice at index 2`);
  assert(tier.maxTotalMovement === 18, `Win ${w} → max movement = 18 (NOT ${w})`);
}

// Tier 4 validation
console.log('\n── Tier 4: Player choice validation ──');
assert(validatePlayerChoices(4, [6]).valid, 'Tier 4: [6] is valid');
assert(validatePlayerChoices(4, [1]).valid, 'Tier 4: [1] is valid');
assert(validatePlayerChoices(4, [3]).valid, 'Tier 4: [3] is valid');
assert(!validatePlayerChoices(4, [7]).valid, 'Tier 4: [7] rejected (> 6)');
assert(!validatePlayerChoices(4, [0]).valid, 'Tier 4: [0] rejected (< 1)');
assert(!validatePlayerChoices(4, [3, 3]).valid, 'Tier 4: [3,3] rejected (2 choices instead of 1)');

// Tier 4 resolution
console.log('\n── Tier 4: Choice resolution ──');
const tier4Moves = [6, 6, 'PLAYER_CHOICE'];
const resolved4 = resolvePlayerChoices(tier4Moves, [2], [5]);
assertArrayEqual(resolved4, [6, 6, 5], 'Tier 4: resolve [5] → [6, 6, 5]');

// ─── Tier 5: Winnings = 24 ────────────────────────────────────
console.log('\n── Tier 5: Winnings = 24 (3 strategic choices) ──');

const tier24 = getMovementTier(24);
assert(tier24.tier === 5, 'Win 24 → tier 5');
assertArrayEqual(tier24.moves, ['PLAYER_CHOICE', 'PLAYER_CHOICE', 'PLAYER_CHOICE'], 'Win 24 → 3 PLAYER_CHOICE');
assert(tier24.hasPlayerChoice, 'Win 24 → has player choice');
assertArrayEqual(tier24.playerChoiceIndices, [0, 1, 2], 'Win 24 → choices at all 3 indices');
assert(tier24.maxTotalMovement === 18, 'Win 24 → max movement = 18 (NOT 24!)');
assert(tier24.maxPerMove === 6, 'Win 24 → max per move = 6');

// ─── 24 ≠ 24 movement ────────────────────────────────────────
console.log('\n── CRITICAL: 24 winnings ≠ 24 movement ──');
assert(tier24.maxTotalMovement === 18, '24 winnings → max 18 movement (NOT 24)');
assert(tier24.moves.length === 3, '24 winnings → exactly 3 movement choices (NOT 4)');

// ─── Tier 5 validation ──────────────────────────────────────
console.log('\n── Tier 5: Player choice validation ──');
assert(validatePlayerChoices(5, [6, 6, 6]).valid, '[6,6,6] = 18 → valid');
assert(validatePlayerChoices(5, [6, 6, 5]).valid, '[6,6,5] = 17 → valid');
assert(validatePlayerChoices(5, [6, 5, 4]).valid, '[6,5,4] = 15 → valid');
assert(validatePlayerChoices(5, [6, 4, 2]).valid, '[6,4,2] = 12 → valid');
assert(validatePlayerChoices(5, [2, 3, 1]).valid, '[2,3,1] = 6 → valid');
assert(validatePlayerChoices(5, [4, 4, 4]).valid, '[4,4,4] = 12 → valid');
assert(validatePlayerChoices(5, [1, 1, 1]).valid, '[1,1,1] = 3 → valid');

// Rejections
console.log('\n── Tier 5: Rejection cases ──');
assert(!validatePlayerChoices(5, [4, 4, 4, 3]).valid, '[4,4,4,3] rejected → 4 choices (must be exactly 3)');
assert(!validatePlayerChoices(5, [7, 6, 5]).valid, '[7,6,5] rejected → 7 > 6');
assert(!validatePlayerChoices(5, [6, 6]).valid, '[6,6] rejected → only 2 choices (must be 3)');
assert(!validatePlayerChoices(5, [0, 6, 6]).valid, '[0,6,6] rejected → 0 < 1');

// Tier 5 resolution
console.log('\n── Tier 5: Choice resolution ──');
const tier5Moves = ['PLAYER_CHOICE', 'PLAYER_CHOICE', 'PLAYER_CHOICE'];
const resolved5a = resolvePlayerChoices(tier5Moves, [0, 1, 2], [6, 6, 6]);
assertArrayEqual(resolved5a, [6, 6, 6], 'Resolve [6,6,6] → [6, 6, 6]');

const resolved5b = resolvePlayerChoices(tier5Moves, [0, 1, 2], [2, 3, 1]);
assertArrayEqual(resolved5b, [2, 3, 1], 'Resolve [2,3,1] → [2, 3, 1]');

// ─── decomposeWinnings integration ──────────────────────────
console.log('\n── decomposeWinnings() integration ──');

const d1 = decomposeWinnings(5);
assert(d1.tier === 1, 'decompose(5) → tier 1');
assertArrayEqual(d1.components, [5], 'decompose(5) → [5]');
assert(!d1.hasPlayerChoice, 'decompose(5) → no player choice');

const d10 = decomposeWinnings(10);
assert(d10.tier === 2, 'decompose(10) → tier 2');
assertArrayEqual(d10.components, [6, 4], 'decompose(10) → [6, 4]');

const d15 = decomposeWinnings(15);
assert(d15.tier === 3, 'decompose(15) → tier 3');
assertArrayEqual(d15.components, [6, 6, 3], 'decompose(15) → [6, 6, 3]');

const d20 = decomposeWinnings(20);
assert(d20.tier === 4, 'decompose(20) → tier 4');
assertArrayEqual(d20.components, [6, 6, 'PLAYER_CHOICE'], 'decompose(20) → [6, 6, PLAYER_CHOICE]');
assert(d20.hasPlayerChoice, 'decompose(20) → has player choice');
assert(d20.maxTotalMovement === 18, 'decompose(20) → max movement = 18');

const d24 = decomposeWinnings(24);
assert(d24.tier === 5, 'decompose(24) → tier 5');
assert(d24.hasPlayerChoice, 'decompose(24) → has player choice');
assert(d24.maxTotalMovement === 18, 'decompose(24) → max movement = 18');
assert(d24.totalComponents === 3, 'decompose(24) → exactly 3 components');

// ─── Winnings 0 / negative ──────────────────────────────────
console.log('\n── Edge cases: 0 and negative winnings ──');
const d0 = decomposeWinnings(0);
assertArrayEqual(d0.components, [], 'decompose(0) → []');
assert(d0.tier === 0, 'decompose(0) → tier 0');

const dNeg = decomposeWinnings(-5);
assertArrayEqual(dNeg.components, [], 'decompose(-5) → []');

// ─── Summary ────────────────────────────────────────────────
console.log('\n' + '═'.repeat(50));
console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.error('  ⚠️  SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('  ✅ ALL TESTS PASSED');
}
