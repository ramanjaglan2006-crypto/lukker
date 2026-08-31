import React from 'react';
import { PLAYER_CONFIGS } from '../utils/ludoPaths';
import { Phase } from '../engine/gameState';

export default function PokerPanel({
  phase,
  currentPlayer,
  playerMode,
  pokerPlayers,
  activePokerPlayers,
  communityCards,
  pot,
  currentPokerActor,
  currentBetToMatch,
  submitPokerAction,
}) {
  const isPokerPhase = [
    Phase.POKER_PRE_FLOP,
    Phase.POKER_FLOP,
    Phase.POKER_TURN,
    Phase.POKER_RIVER,
    Phase.POKER_SHOWDOWN,
  ].includes(phase);

  if (!isPokerPhase) return null;

  const actorConfig = currentPokerActor ? PLAYER_CONFIGS[currentPokerActor] : null;
  const actorState = currentPokerActor ? pokerPlayers[currentPokerActor] : null;
  const toCall = actorState ? currentBetToMatch - actorState.currentBet : 0;
  const canCheck = toCall === 0;

  // We only show controls for the local player (which is currentPlayer if not VS_BOT, or 'red' if VS_BOT)
  const isLocalPlayerTurn = playerMode === 'VS_BOT' ? currentPokerActor === 'red' : true; // In 2P/4P local play, all turns are local.

  if (!actorState || actorState.hasFolded || actorState.isAllIn || phase === Phase.POKER_SHOWDOWN) {
    return null;
  }

  return (
    <div className="w-full bg-[#131C31] border border-slate-800 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-xl">
      <span className="text-sm font-bold" style={{ color: actorConfig.color }}>
        {actorConfig.name}'s Turn to Act
      </span>
      
      {isLocalPlayerTurn ? (
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => submitPokerAction('FOLD')}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-red-900/50 border border-red-500/40 text-red-300 hover:bg-red-800 transition-all shadow-lg"
          >
            FOLD
          </button>
          
          {canCheck ? (
            <button
              onClick={() => submitPokerAction('CHECK')}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-700 border border-slate-500 text-slate-300 hover:bg-slate-600 transition-all shadow-lg"
            >
              CHECK
            </button>
          ) : (
            <button
              disabled={actorState.bankroll < toCall}
              onClick={() => submitPokerAction('CALL')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg ${
                actorState.bankroll >= toCall 
                  ? 'bg-blue-600 border border-blue-400 text-white hover:bg-blue-500'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              CALL {toCall}
            </button>
          )}

          <button
            disabled={actorState.bankroll <= toCall}
            onClick={() => {
              const raiseAmount = canCheck ? 1 : toCall + 1;
              submitPokerAction(canCheck ? 'BET' : 'RAISE', raiseAmount);
            }}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg ${
              actorState.bankroll > toCall
                ? 'bg-emerald-600 border border-emerald-400 text-white hover:bg-emerald-500'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {canCheck ? 'BET 1' : `RAISE TO ${toCall + 1}`}
          </button>

          <button
            disabled={actorState.bankroll === 0}
            onClick={() => submitPokerAction('ALL_IN')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg ${
              actorState.bankroll > 0
                ? 'bg-yellow-500 border border-yellow-400 text-black hover:bg-yellow-400'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            ALL-IN ({actorState.bankroll})
          </button>
        </div>
      ) : (
        <span className="text-xs text-slate-400 animate-pulse mt-2">Waiting for bot...</span>
      )}
    </div>
  );
}
