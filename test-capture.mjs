import { createGameState, PlayerColors } from './src/engine/gameState.js';
import { checkCapture } from './src/engine/captures.js';

const state = createGameState(4);
state.players.red.pieces[0].position = 10;
state.players.green.pieces[0].position = 0; // Red 13
state.turnOrder = PlayerColors;

console.log(checkCapture(state, 'red', 13));
