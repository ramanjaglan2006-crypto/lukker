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

  // Determine which cards to show for community cards
  const displayCommunityCards = [...communityCards];
  while (displayCommunityCards.length < 5) {
    displayCommunityCards.push(null);
  }

  // Format cards
  const formatCard = (card) => {
    if (!card) return '🂠';
    return `${card.rank}${card.suit}`;
  };

  const getCardColor = (card) => {
    if (!card) return 'text-slate-600';
    return (card.suit === '♥' || card.suit === '♦') ? 'text-red-600' : 'text-slate-900';
  };

  return (
    <div className="w-full bg-[#131C31] border border-slate-800 rounded-2xl p-4 flex flex-col items-center gap-4 shadow-xl mt-4">
      {/* Header */}
      <div className="flex w-full justify-between items-center border-b border-slate-800 pb-2">
        <span className="text-yellow-400 font-bold uppercase tracking-wider text-sm">
          🃏 Poker: {phase.replace('POKER_', '').replace('_', ' ')}
        </span>
        <span className="text-emerald-400 font-black text-sm">
          POT: {pot}
        </span>
      </div>

      {/* Community Cards */}
      <div className="flex gap-2">
        {displayCommunityCards.map((card, idx) => (
          <div
            key={idx}
            className={`w-12 h-16 rounded flex items-center justify-center text-lg font-black bg-white shadow ${getCardColor(card)}`}
          >
            {formatCard(card)}
          </div>
        ))}
      </div>

      {/* Player Hands */}
      <div className="w-full flex justify-around mt-2">
        {activePokerPlayers.map(pId => {
          const pConfig = PLAYER_CONFIGS[pId];
          const pState = pokerPlayers[pId];
          const isActor = currentPokerActor === pId;
          const isLocal = playerMode === 'VS_BOT' ? pId === 'red' : pId === currentPokerActor; // Only show face up if it's the current overarching player
          
          return (
            <div key={pId} className={`flex flex-col items-center gap-1 ${pState.hasFolded ? 'opacity-30' : ''}`}>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pConfig.color }} />
                <span className="text-xs font-bold text-slate-300">
                  {pConfig.name.split(' ')[0]}
                </span>
              </div>
              <div className="flex gap-1">
                {pState.holeCards.map((card, idx) => (
                  <div
                    key={idx}
                    className={`w-8 h-12 rounded flex items-center justify-center text-sm font-black bg-white shadow ${
                      isLocal || phase === Phase.POKER_SHOWDOWN ? getCardColor(card) : 'text-slate-600'
                    }`}
                  >
                    {isLocal || phase === Phase.POKER_SHOWDOWN ? formatCard(card) : '🂠'}
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-slate-400">Bet: {pState.currentBet} | Bank: {pState.bankroll}</span>
              {pState.hasFolded && <span className="text-[10px] text-red-400 font-bold uppercase">Folded</span>}
              {pState.isAllIn && <span className="text-[10px] text-yellow-400 font-bold uppercase">All-In</span>}
            </div>
          );
        })}
      </div>

      {/* Action Controls */}
      {actorState && !actorState.hasFolded && !actorState.isAllIn && phase !== Phase.POKER_SHOWDOWN && (
        <div className="w-full flex flex-col items-center gap-2 mt-2 pt-2 border-t border-slate-800">
          <span className="text-xs font-bold" style={{ color: actorConfig.color }}>
            {actorConfig.name}'s Turn to Act
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => submitPokerAction('FOLD')}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-red-900/50 border border-red-500/40 text-red-300 hover:bg-red-800 transition-all"
            >
              Fold
            </button>
            
            {canCheck ? (
              <button
                onClick={() => submitPokerAction('CHECK')}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-700 border border-slate-500 text-slate-300 hover:bg-slate-600 transition-all"
              >
                Check
              </button>
            ) : (
              <button
                disabled={actorState.bankroll < toCall}
                onClick={() => submitPokerAction('CALL')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  actorState.bankroll >= toCall 
                    ? 'bg-blue-600 border border-blue-400 text-white hover:bg-blue-500'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                Call ({toCall})
              </button>
            )}

            <button
              disabled={actorState.bankroll <= toCall}
              onClick={() => {
                const raiseAmount = canCheck ? 1 : toCall + 1;
                submitPokerAction(canCheck ? 'BET' : 'RAISE', raiseAmount);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                actorState.bankroll > toCall
                  ? 'bg-emerald-600 border border-emerald-400 text-white hover:bg-emerald-500'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {canCheck ? 'Bet (1)' : `Raise (+1)`}
            </button>

            <button
              disabled={actorState.bankroll === 0}
              onClick={() => submitPokerAction('ALL_IN')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                actorState.bankroll > 0
                  ? 'bg-yellow-500 border border-yellow-400 text-black hover:bg-yellow-400'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              All-In ({actorState.bankroll})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
