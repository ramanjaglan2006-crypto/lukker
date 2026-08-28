import { createGameState } from './src/engine/gameState.js';
import { getAllLegalMoves, validateMove } from './src/engine/movement.js';
import { PlayerColors } from './src/engine/gameState.js';

const state = createGameState(4);

// Setup standard state
PlayerColors.forEach(c => {
  state.players[c] = {
    pieces: [
      { id: `${c}-0`, position: -1, status: 'YARD' },
      { id: `${c}-1`, position: -1, status: 'YARD' },
      { id: `${c}-2`, position: -1, status: 'YARD' },
      { id: `${c}-3`, position: -1, status: 'YARD' },
    ]
  };
});
state.turnOrder = PlayerColors;

// Move red to 11
state.players['red'].pieces[0].position = 11;
state.players['red'].pieces[0].status = 'ACTIVE';

state.players['red'].pieces[1].position = 11;
state.players['red'].pieces[1].status = 'ACTIVE';

// Let's also put red at 8 just to replicate the screenshot
state.players['red'].pieces[2].position = 8;
state.players['red'].pieces[2].status = 'ACTIVE';

const moves = getAllLegalMoves(state, 'red', 6);
console.log("All legal moves with 6:");
console.log(moves);

const move3 = getAllLegalMoves(state, 'red', 3);
console.log("\nAll legal moves with 3:");
console.log(move3);
