import React from 'react';
import { PLAYER_CONFIGS } from '../utils/ludoPaths';

/**
 * PlayerInfoBar Component - Matches Section 5 & 8 of spec image
 * - Top and bottom player info cards
 * - Player color avatar, Name, "Home: X / 4" count
 * - "YOUR TURN" badge above active player bar
 */
export default function PlayerInfoBar({
  playerColor,
  homeCount = 0,
  isActive = false,
  isWinner = false,
  isBot = false,
  position = 'top' // 'top' or 'bottom'
}) {
  const config = PLAYER_CONFIGS[playerColor];

  return (
    <div className="relative flex flex-col items-center select-none w-full max-w-[280px]">
      {/* Current Turn Badge - Section 8 Spec */}
      {isActive && (
        <div className="absolute -top-4 z-20 animate-pulse-glow">
          <div className="bg-[#FDD835] text-black font-black text-xs px-3 py-0.5 rounded-full shadow-[0_0_15px_#FDD835] border-2 border-white tracking-wider uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span>
            YOUR TURN
          </div>
        </div>
      )}

      {/* Main Info Card */}
      <div
        className={`w-full bg-[#131C31] rounded-2xl p-2.5 sm:p-3 flex items-center justify-between border-2 transition-all duration-300 ${
          isActive
            ? 'border-[#FDD835] shadow-[0_0_20px_rgba(253,216,53,0.4)] scale-102'
            : 'border-slate-700/60 shadow-lg'
        }`}
      >
        {/* Left: Player Color Avatar */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white flex items-center justify-center shadow-md relative overflow-hidden"
            style={{ backgroundColor: config.color }}
          >
            {/* Gloss specular overlay */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/30 rounded-t-full" />
            {isBot && (
              <span className="text-[10px] font-bold bg-black/60 px-1 rounded text-white">
                BOT
              </span>
            )}
          </div>

          {/* Name & Home Subtext */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm sm:text-base text-white tracking-wide">
                {config.name}
              </span>
              {isWinner && (
                <span className="text-xs bg-yellow-400 text-black px-1.5 py-0.5 rounded font-extrabold">
                  👑 WINNER
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Home: <strong className="text-white font-bold">{homeCount}</strong> / 4
            </span>
          </div>
        </div>

        {/* Right: Score Counter Badge */}
        <div className="bg-[#0D1321] border border-slate-700 rounded-xl px-2.5 py-1 text-right">
          <span className="text-xs text-slate-400 block leading-none">Home</span>
          <span className="text-base sm:text-lg font-black" style={{ color: config.color }}>
            {homeCount} / 4
          </span>
        </div>
      </div>
    </div>
  );
}
