import React from 'react';
import { PLAYER_CONFIGS } from '../utils/ludoPaths';

export default function PlayerInfoBar({
  playerColor,
  isActive = false,
  isWinner = false,
  isBot = false,
}) {
  const config = PLAYER_CONFIGS[playerColor];

  return (
    <div className="relative flex flex-col items-center select-none w-auto">
      {/* Current Turn Badge */}
      {isActive && (
        <div className="absolute -top-3 z-20 animate-pulse-glow">
          <div className="bg-[#FDD835] text-black font-black text-[10px] px-2 py-0.5 rounded-full shadow-[0_0_10px_#FDD835] border border-white tracking-wider uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span>
            TURN
          </div>
        </div>
      )}

      {/* Main Info Card */}
      <div
        className={`bg-[#131C31] rounded-full px-3 py-1.5 flex items-center gap-2 border-2 transition-all duration-300 ${
          isActive
            ? 'border-[#FDD835] shadow-[0_0_15px_rgba(253,216,53,0.4)] scale-105'
            : 'border-slate-700/60 shadow-lg'
        }`}
      >
        <div
          className="w-4 h-4 rounded-full border border-white flex items-center justify-center shadow-md relative overflow-hidden"
          style={{ backgroundColor: config.color }}
        >
          {/* Gloss overlay */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/30 rounded-t-full" />
        </div>

        <span className="font-bold text-sm text-white tracking-wide whitespace-nowrap">
          {config.name} {isBot && '(Bot)'} {isWinner && '👑'}
        </span>
      </div>
    </div>
  );
}
