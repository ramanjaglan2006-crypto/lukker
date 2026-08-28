import { createGameState } from './src/engine/gameState.js';
import { getMovablePieceIndices } from './src/engine/movement.js';
import { PlayerColors } from './src/engine/gameState.js';

const state = createGameState(4);

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
state.currentPlayer = 'red';

// Red tokens at 11
state.players['red'].pieces[0].position = 11;
state.players['red'].pieces[0].status = 'ACTIVE';

state.players['red'].pieces[1].position = 11;
state.players['red'].pieces[1].status = 'ACTIVE';

// Red token at 8
state.players['red'].pieces[2].position = 8;
state.players['red'].pieces[2].status = 'ACTIVE';

// Red token at yard
state.players['red'].pieces[3].position = -1;
state.players['red'].pieces[3].status = 'YARD';

const movableTokens = getMovablePieceIndices(state, 'red', 6);
console.log("Movable tokens:", movableTokens);

// Simulate tokens format mapping
const tokensFormat = {};
Object.keys(state.players).forEach(p => {
  tokensFormat[p] = state.players[p].pieces.map(pc => pc.position);
});
console.log("Tokens format:", tokensFormat);

const tokensHere = [];
tokensFormat['red'].forEach((step, tokenIdx) => {
  if (step === 11) {
    tokensHere.push({ player: 'red', tokenIdx });
  }
});
console.log("Tokens at 11:", tokensHere);

tokensHere.forEach(({ player, tokenIdx }) => {
  const isCurrent = state.currentPlayer === player;
  const isMovable = isCurrent && movableTokens.includes(tokenIdx);
  console.log(`Token ${tokenIdx} is movable:`, isMovable);
});
