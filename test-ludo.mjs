import { createGameState, PlayerColors } from './src/engine/gameState.js';
import { validateMove } from './src/engine/movement.js';

function setupTest() {
  const state = createGameState(4);
  PlayerColors.forEach(c => {
    state.players[c] = {
      pieces: [
        { id: `${c}-0`, position: -1, status: 'YARD', hasFinished: false },
        { id: `${c}-1`, position: -1, status: 'YARD', hasFinished: false },
        { id: `${c}-2`, position: -1, status: 'YARD', hasFinished: false },
        { id: `${c}-3`, position: -1, status: 'YARD', hasFinished: false },
      ]
    };
  });
  state.turnOrder = PlayerColors;
  state.currentPlayer = 'red';
  return state;
}

const state = setupTest();
state.players.red.pieces[0].position = 10;
state.players.red.pieces[0].status = 'ACTIVE';

state.players.green.pieces[0].position = 0; // Red 13 (Green Start - Safe Square)
state.players.green.pieces[0].status = 'ACTIVE';

console.log("--- Test 1: Passing over a single opponent token ---");
const result1 = validateMove(state, 'red', 'red-0', 6);
console.log("Move red-0 by 6 steps:", {
  valid: result1.valid,
  reason: result1.reason,
  resultingPosition: result1.resultingPosition
});

console.log("\n--- Test 2: Landing on a single opponent token on a SAFE square (Green Start) ---");
const result2 = validateMove(state, 'red', 'red-0', 3);
console.log("Move red-0 by 3 steps:", {
  valid: result2.valid,
  reason: result2.reason,
  resultingPosition: result2.resultingPosition,
  captures: result2.captures
});

console.log("\n--- Test 3: Landing on a single opponent token on an UNSAFE square ---");
state.players.green.pieces[0].position = 1; // Red 14 (Unsafe Square)
const result3 = validateMove(state, 'red', 'red-0', 4);
console.log("Move red-0 by 4 steps (landing on Red 14):", {
  valid: result3.valid,
  reason: result3.reason,
  resultingPosition: result3.resultingPosition,
  captures: result3.captures
});

console.log("\n--- Test 4: Attempting to pass a block (2+ tokens of ANY color) ---");
// Put two yellow tokens at Red 12 to form a block
state.players.yellow.pieces[0].position = 38; // Red 12
state.players.yellow.pieces[0].status = 'ACTIVE';
state.players.yellow.pieces[1].position = 38; // Red 12
state.players.yellow.pieces[1].status = 'ACTIVE';

const result4 = validateMove(state, 'red', 'red-0', 6);
console.log("Move red-0 by 6 steps (should be blocked at Red 12):", {
  valid: result4.valid,
  reason: result4.reason
});
