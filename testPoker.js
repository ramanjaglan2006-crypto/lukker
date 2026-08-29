import { createGameState, Phase } from './src/engine/gameState.js';
import { initializeGame, startTurn, startPokerRound, submitPokerAction, chooseDirection } from './src/engine/turnManager.js';
import { getBotAction } from './src/engine/pokerBot.js';

let { state, events } = initializeGame(createGameState(2));
console.log('Game initialized.');

let turnResult = startTurn(state);
state = turnResult.state;
console.log('Turn started. Phase:', state.phase);

let pokerResult = startPokerRound(state);
state = pokerResult.state;
console.log('Poker round started. Phase:', state.phase);

// Simulate the poker round with bots
const isPokerPhase = (phase) => [Phase.POKER_PRE_FLOP, Phase.POKER_FLOP, Phase.POKER_TURN, Phase.POKER_RIVER].includes(phase);

let actionCount = 0;
while (isPokerPhase(state.phase) && actionCount < 100) {
    const actor = state.currentPokerActor;
    if (!actor) {
        console.error('No current poker actor, but phase is', state.phase);
        break;
    }
    const { action, amount } = getBotAction(state, actor);
    console.log(`[Phase: ${state.phase}] ${actor} acts: ${action} ${amount ? amount : ''}`);
    
    let result = submitPokerAction(state, action, amount);
    state = result.state;
    // Print any events that occurred
    result.events.forEach(e => {
        if (e.type === 'POKER_WON' || e.type === 'INVALID_MOVE') {
             console.log(`Event: ${e.type}`, e.payload);
        }
    });
    actionCount++;
}

console.log('Finished Poker Round. Phase is now:', state.phase);
if (state.phase === Phase.DIRECTION_CHOICE) {
    console.log('Winnings:', state.totalWinnings);
    // test decomposition
    let dirResult = chooseDirection(state, 'FORWARD');
    state = dirResult.state;
    console.log('Movement Phase:', state.phase, state.movementComponents);
}
console.log('Simulation complete.');
