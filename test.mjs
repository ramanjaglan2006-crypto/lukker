import { getAllLegalMoves } from './src/engine/movement.js';

const gameState = {
  players: {
    red: { pieces: [{ id: 'red-0', position: 11, status: 'ACTIVE' }, { id: 'red-1', position: 11, status: 'ACTIVE' }, { id: 'red-2', position: 11, status: 'ACTIVE' }, { id: 'red-3', position: 8, status: 'ACTIVE' }] },
    green: { pieces: [{ id: 'green-0', position: -1 }, { id: 'green-1', position: -1 }, { id: 'green-2', position: 25 }, { id: 'green-3', position: -1 }] },
    yellow: { pieces: [{ id: 'yellow-0', position: -1 }] },
    blue: { pieces: [{ id: 'blue-0', position: -1 }] }
  },
  turnOrder: ['red', 'green', 'yellow', 'blue']
};

console.log('Legal moves for red with 6:');
console.log(getAllLegalMoves(gameState, 'red', 6));
