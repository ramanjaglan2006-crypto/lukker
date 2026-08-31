import React from 'react';
import { PLAYER_CONFIGS } from '../utils/ludoPaths';
import { Phase } from '../engine/gameState';
import CommunityCards from './CommunityCards';

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

  // Local player logic
  const localPlayerId = playerMode === 'VS_BOT' ? 'red' : currentPokerActor;
  const isLocalPlayerTurn = playerMode === 'VS_BOT' ? currentPokerActor === 'red' : true; 
  
  // Split players into opponents and local player
  const opponents = activePokerPlayers.filter(pId => pId !== localPlayerId);
  const localPlayerState = pokerPlayers[localPlayerId];
  const localPlayerConfig = PLAYER_CONFIGS[localPlayerId];

  const formatCard = (card) => {
    if (!card) return '🂠';
    return `${card.rank}${card.suit}`;
  };

  const getCardColor = (card) => {
    if (!card) return 'text-slate-600';
    return (card.suit === '♥' || card.suit === '♦') ? 'text-red-600' : 'text-slate-900';
  };

  const renderPlayerStatus = (pId, isLocal) => {
    const pConfig = PLAYER_CONFIGS[pId];
    const pState = pokerPlayers[pId];
    if (!pState) return null;

    const isActor = currentPokerActor === pId;
    const reveal = isLocal || phase === Phase.POKER_SHOWDOWN;

    return (
      <div key={pId} className={`flex items-center justify-between p-2 rounded-xl bg-[#0D1321] border ${isActor ? 'border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]' : 'border-slate-800'} ${pState.hasFolded ? 'opacity-40 grayscale' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: pConfig.color }} />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white">{pConfig.name.split(' ')[0]}</span>
            <span className="text-[10px] text-slate-400">Bank: ${pState.bankroll}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[10px] text-slate-400">Bet</span>
            <span className="text-xs font-bold text-emerald-400">${pState.currentBet}</span>
          </div>
          
          <div className="flex gap-1">
            {pState.holeCards.map((card, idx) => (
              <div
                key={idx}
                className={`w-6 h-9 rounded flex items-center justify-center text-xs font-black bg-white shadow ${
                  reveal ? getCardColor(card) : 'text-slate-400 bg-slate-200'
                }`}
              >
                {reveal ? formatCard(card) : '🂠'}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 overflow-y-auto overflow-x-hidden p-2 custom-scrollbar">
      
      {/* 1. OPPONENT STATUSES (Top) */}
      <div className="flex flex-col gap-2 mt-2">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1">Table</span>
        {opponents.map(pId => renderPlayerStatus(pId, false))}
      </div>

      <div className="flex-1"></div>

      {/* 2. COMMUNITY CARDS (Middle) */}
      <CommunityCards 
        phase={phase} 
        communityCards={communityCards} 
        pot={pot} 
      />

      <div className="flex-1"></div>

      {/* 3. LOCAL PLAYER HOLE CARDS & INFO (Bottom-Middle) */}
      {localPlayerState && (
        <div className="flex flex-col items-center gap-2 mt-4 p-3 bg-[#0D1321] rounded-2xl border border-slate-700">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Your Hand</span>
          <div className="flex gap-2 group">
            {localPlayerState.holeCards.map((card, idx) => (
              <div
                key={idx}
                className={`w-12 h-16 sm:w-16 sm:h-24 rounded-lg flex items-center justify-center text-lg sm:text-2xl font-black bg-white shadow-xl transition-transform duration-300 transform group-hover:-translate-y-2 ${getCardColor(card)}`}
              >
                {formatCard(card)}
              </div>
            ))}
          </div>
          <div className="flex justify-between w-full mt-2 px-2">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-500 uppercase">Bankroll</span>
              <span className="text-sm font-bold text-yellow-400">${localPlayerState.bankroll}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-500 uppercase">Current Bet</span>
              <span className="text-sm font-bold text-emerald-400">${localPlayerState.currentBet}</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. ACTION CONTROLS (Bottom) */}
      {actorState && !actorState.hasFolded && !actorState.isAllIn && phase !== Phase.POKER_SHOWDOWN && (
        <div className="w-full bg-[#131C31] border border-slate-700 rounded-2xl p-4 flex flex-col items-center gap-3 shadow-2xl relative">
          
          <div className="absolute -top-3 bg-[#131C31] px-3 border border-slate-700 rounded-full">
            <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse" style={{ color: actorConfig.color }}>
              {isLocalPlayerTurn ? 'YOUR TURN' : `${actorConfig.name}'s TURN`}
            </span>
          </div>
          
          {isLocalPlayerTurn ? (
            <div className="flex flex-wrap justify-center gap-2 w-full pt-1">
              <button
                onClick={() => submitPokerAction('FOLD')}
                className="flex-1 min-w-[30%] py-2 rounded-lg text-xs font-bold bg-red-900/50 border border-red-500/40 text-red-300 hover:bg-red-800 transition-all shadow-md"
              >
                FOLD
              </button>
              
              {canCheck ? (
                <button
                  onClick={() => submitPokerAction('CHECK')}
                  className="flex-1 min-w-[30%] py-2 rounded-lg text-xs font-bold bg-slate-700 border border-slate-500 text-slate-300 hover:bg-slate-600 transition-all shadow-md"
                >
                  CHECK
                </button>
              ) : (
                <button
                  disabled={actorState.bankroll < toCall}
                  onClick={() => submitPokerAction('CALL')}
                  className={`flex-1 min-w-[30%] py-2 rounded-lg text-xs font-bold transition-all shadow-md ${
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
                className={`flex-1 min-w-[45%] py-2 rounded-lg text-xs font-bold transition-all shadow-md ${
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
                className={`flex-1 min-w-[45%] py-2 rounded-lg text-xs font-bold transition-all shadow-md ${
                  actorState.bankroll > 0
                    ? 'bg-yellow-500 border border-yellow-400 text-black hover:bg-yellow-400'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                ALL-IN ({actorState.bankroll})
              </button>
            </div>
          ) : (
            <div className="py-4 w-full flex items-center justify-center">
              <span className="text-xs text-slate-400 animate-pulse font-medium">Waiting for {actorConfig.name}...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
