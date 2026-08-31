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

  const renderOpponent = (pId, index, total) => {
    const pConfig = PLAYER_CONFIGS[pId];
    const pState = pokerPlayers[pId];
    if (!pState) return null;

    const isActor = currentPokerActor === pId;
    
    // Position opponents along the top arc based on index
    // 1 opponent: Center Top
    // 2 opponents: Top Left, Top Right
    // 3 opponents: Top Left, Top Center, Top Right
    let positionClass = "";
    if (total === 1) {
      positionClass = "absolute top-4 left-1/2 -translate-x-1/2";
    } else if (total === 2) {
      positionClass = index === 0 ? "absolute top-8 left-8" : "absolute top-8 right-8";
    } else if (total === 3) {
      if (index === 0) positionClass = "absolute top-12 left-6";
      if (index === 1) positionClass = "absolute top-4 left-1/2 -translate-x-1/2";
      if (index === 2) positionClass = "absolute top-12 right-6";
    }

    return (
      <div key={pId} className={`flex flex-col items-center z-20 ${positionClass} ${pState.hasFolded ? 'opacity-40 grayscale' : ''}`}>
        
        {/* Avatar Circle */}
        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 ${isActor ? 'border-yellow-400 shadow-[0_0_20px_#FDD835]' : 'border-slate-800'} flex items-center justify-center overflow-hidden bg-slate-900 relative`}>
            <div className="w-full h-full flex items-center justify-center font-bold text-white text-lg" style={{backgroundColor: pConfig.color}}>
                {pConfig.name.charAt(0)}
            </div>
            {/* Gloss */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/30" />
        </div>
        
        {/* Name & Bankroll */}
        <div className="flex flex-col items-center -mt-2 z-30">
          <span className="text-white font-bold text-[10px] sm:text-xs bg-black/80 px-3 py-0.5 rounded-full shadow border border-slate-700 whitespace-nowrap">
            {pConfig.name.split(' ')[0]}
          </span>
          <span className="text-yellow-400 font-black text-[10px] sm:text-xs drop-shadow-md">
            ${pState.bankroll}
          </span>
        </div>

        {/* Tiny Face-down cards overlapping avatar */}
        <div className="flex -space-x-3 -mt-6 sm:-mt-8 z-10 pointer-events-none drop-shadow-xl">
          {pState.holeCards.map((card, idx) => (
              <div key={idx} className={`w-7 h-10 sm:w-9 sm:h-12 rounded border border-white/20 bg-blue-900 shadow flex items-center justify-center transform ${idx === 0 ? '-rotate-12' : 'rotate-12'}`}>
                {/* Decorative back pattern */}
                <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-700 to-blue-900 opacity-50"></div>
              </div>
          ))}
        </div>

        {/* Current Bet Chip placed slightly forward on the table */}
        {pState.currentBet > 0 && (
          <div className="absolute -bottom-10 sm:-bottom-12 w-8 h-8 rounded-full border-4 border-dashed border-red-500 bg-white flex items-center justify-center shadow-lg transform scale-90">
             <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-black text-[9px] drop-shadow">${pState.currentBet}</span>
             </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col p-2 bg-[#0D1321] overflow-hidden">
      
      {/* 1. THE OVAL POKER TABLE (Top & Middle) */}
      <div className="flex-1 w-full relative bg-gradient-to-b from-[#0f4f22] to-[#0a3817] rounded-[100px] sm:rounded-[140px] border-[12px] sm:border-[20px] border-[#131C31] shadow-[inset_0_0_80px_rgba(0,0,0,0.9),0_20px_40px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center mt-2 overflow-visible">
        
        {/* Felt Inner Line */}
        <div className="absolute inset-4 sm:inset-6 rounded-[90px] sm:rounded-[120px] border-2 border-emerald-700/30 pointer-events-none" />

        {/* Table Pot Information (Center Top) */}
        <div className="absolute top-1/4 sm:top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center bg-black/40 px-6 py-2 rounded-full border border-emerald-900/50 shadow-inner z-10">
           <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">Total Pot</span>
           <span className="text-2xl font-black text-yellow-400 drop-shadow-[0_0_10px_#FDD835]">${pot}</span>
        </div>

        {/* OPPONENTS */}
        {opponents.map((pId, idx) => renderOpponent(pId, idx, opponents.length))}

        {/* COMMUNITY CARDS DEAD CENTER */}
        <div className="z-20 transform scale-90 sm:scale-100">
           <CommunityCards 
            phase={phase} 
            communityCards={communityCards} 
            pot={0} // Hide pot in CommunityCards since we render it above
          />
        </div>

        {/* LOCAL PLAYER CARDS & BET (Bottom Edge) */}
        {localPlayerState && (
          <div className="absolute -bottom-8 sm:-bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center z-30">
            
            {/* Player's current Bet chip pushed onto table */}
            {localPlayerState.currentBet > 0 && (
              <div className="mb-2 w-10 h-10 rounded-full border-4 border-dashed border-blue-500 bg-white flex items-center justify-center shadow-2xl transform">
                <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center">
                    <span className="text-white font-black text-[11px] drop-shadow">${localPlayerState.currentBet}</span>
                </div>
              </div>
            )}

            {/* Face Up Cards */}
            <div className="flex gap-2 group mb-1">
              {localPlayerState.holeCards.map((card, idx) => (
                <div
                  key={idx}
                  className={`w-14 h-20 sm:w-20 sm:h-28 rounded-lg flex items-center justify-center text-xl sm:text-3xl font-black bg-white shadow-[0_10px_25px_rgba(0,0,0,0.8)] border border-slate-200 transform transition-transform duration-300 ${idx === 0 ? '-rotate-6 translate-y-2' : 'rotate-6 translate-y-2'} group-hover:translate-y-0 group-hover:scale-110 ${getCardColor(card)}`}
                >
                  {formatCard(card)}
                </div>
              ))}
            </div>

            {/* Local Player Info Pill */}
            <div className="flex items-center gap-3 bg-[#131C31] border-2 border-slate-700 px-5 py-1.5 rounded-full shadow-xl">
               <span className="text-sm font-bold text-white tracking-wide">{localPlayerConfig.name} (You)</span>
               <div className="h-4 w-[1px] bg-slate-600" />
               <span className="text-sm font-black text-yellow-400">${localPlayerState.bankroll}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. ACTION CONTROLS (Bottom Panel) */}
      <div className="w-full shrink-0 mt-12 sm:mt-16 z-40">
        {actorState && !actorState.hasFolded && !actorState.isAllIn && phase !== Phase.POKER_SHOWDOWN ? (
          <div className="w-full bg-[#131C31] border-t-2 border-[#1E293B] rounded-2xl p-4 flex flex-col items-center gap-3 shadow-2xl relative">
            
            <div className="absolute -top-4 bg-[#0D1321] px-4 py-1 border border-slate-700 rounded-full shadow-lg">
              <span className="text-xs font-black uppercase tracking-widest animate-pulse" style={{ color: actorConfig.color }}>
                {isLocalPlayerTurn ? 'YOUR TURN TO ACT' : `WAITING FOR ${actorConfig.name}...`}
              </span>
            </div>
            
            {isLocalPlayerTurn && (
              <div className="flex flex-wrap justify-center gap-2 w-full pt-2">
                <button
                  onClick={() => submitPokerAction('FOLD')}
                  className="flex-1 min-w-[20%] py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wide bg-gradient-to-b from-slate-700 to-slate-900 border border-slate-600 text-slate-300 hover:text-white transition-all shadow-lg active:scale-95"
                >
                  Fold
                </button>
                
                {canCheck ? (
                  <button
                    onClick={() => submitPokerAction('CHECK')}
                    className="flex-1 min-w-[20%] py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wide bg-gradient-to-b from-blue-600 to-blue-800 border border-blue-500 text-white hover:brightness-110 transition-all shadow-lg active:scale-95"
                  >
                    Check
                  </button>
                ) : (
                  <button
                    disabled={actorState.bankroll < toCall}
                    onClick={() => submitPokerAction('CALL')}
                    className={`flex-1 min-w-[20%] py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wide transition-all shadow-lg active:scale-95 ${
                      actorState.bankroll >= toCall 
                        ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 border border-emerald-400 text-white hover:brightness-110'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                    }`}
                  >
                    Call ${toCall}
                  </button>
                )}

                <button
                  disabled={actorState.bankroll <= toCall}
                  onClick={() => {
                    const raiseAmount = canCheck ? 1 : toCall + 1;
                    submitPokerAction(canCheck ? 'BET' : 'RAISE', raiseAmount);
                  }}
                  className={`flex-1 min-w-[30%] py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wide transition-all shadow-lg active:scale-95 ${
                    actorState.bankroll > toCall
                      ? 'bg-gradient-to-b from-purple-600 to-purple-800 border border-purple-500 text-white hover:brightness-110'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                  }`}
                >
                  {canCheck ? 'Bet $1' : `Raise to $${toCall + 1}`}
                </button>

                <button
                  disabled={actorState.bankroll === 0}
                  onClick={() => submitPokerAction('ALL_IN')}
                  className={`flex-1 min-w-[15%] py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wide transition-all shadow-lg active:scale-95 ${
                    actorState.bankroll > 0
                      ? 'bg-gradient-to-b from-amber-500 to-orange-600 border border-amber-400 text-white hover:brightness-110'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                  }`}
                >
                  All-In
                </button>
              </div>
            )}
          </div>
        ) : (
           <div className="h-16" /> // spacer when no action active
        )}
      </div>
    </div>
  );
}
