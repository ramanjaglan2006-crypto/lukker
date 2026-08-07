import React from 'react';
import { PLAYER_CONFIGS } from '../utils/ludoPaths';

/**
 * DiceRoller Component - Interactive Ludo King style dice
 * Features 3D cubic face with dot pips, rolling spin animation, and turn prompts
 */
export default function DiceRoller({
  diceValue = 1,
  isRolling = false,
  canRoll = true,
  currentPlayer = 'red',
  onRoll,
  lastRollWasSix = false
}) {
  const playerConfig = PLAYER_CONFIGS[currentPlayer];

  // Helper to render dot pips for dice face 1..6
  const renderPips = (val) => {
    const dots = [];
    // Positions for 3x3 grid inside dice face
    const positions = {
      1: [[1, 1]],
      2: [[0, 0], [2, 2]],
      3: [[0, 0], [1, 1], [2, 2]],
      4: [[0, 0], [0, 2], [2, 0], [2, 2]],
      5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
      6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]]
    };

    const activeCoords = positions[val] || positions[1];

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const isPip = activeCoords.some(([pr, pc]) => pr === r && pc === c);
        dots.push(
          <div key={`${r}-${c}`} className="flex items-center justify-center">
            {isPip && (
              <div
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-900 shadow-inner"
                style={{
                  backgroundColor: val === 1 ? playerConfig.color : '#1E293B'
                }}
              />
            )}
          </div>
        );
      }
    }
    return dots;
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div className="relative">
        {/* Glow Ring for current player */}
        <div
          className={`absolute -inset-2 rounded-2xl opacity-75 blur-md transition-all duration-300 ${
            canRoll ? 'animate-pulse' : 'opacity-20'
          }`}
          style={{ backgroundColor: playerConfig.color }}
        />

        {/* Dice Body Button */}
        <button
          disabled={!canRoll || isRolling}
          onClick={onRoll}
          className={`relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-white via-slate-100 to-slate-300 rounded-2xl border-4 border-white shadow-[0_8px_20px_rgba(0,0,0,0.5)] flex items-center justify-center p-2.5 transition-transform duration-200 ${
            canRoll && !isRolling ? 'hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-yellow-400' : 'cursor-not-allowed opacity-90'
          } ${isRolling ? 'animate-spin' : ''}`}
        >
          {/* Dice face pips */}
          <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-0.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-inner">
            {renderPips(diceValue)}
          </div>
        </button>
      </div>

      {/* Helper text prompt */}
      <div className="text-center min-h-[24px]">
        {isRolling ? (
          <span className="text-xs font-bold text-yellow-400 animate-pulse uppercase tracking-wider">
            Rolling...
          </span>
        ) : canRoll ? (
          <button
            onClick={onRoll}
            className="text-xs font-extrabold px-3 py-1 bg-yellow-400 text-black rounded-full shadow-md hover:bg-yellow-300 uppercase tracking-wider transition-all"
          >
            Roll Dice!
          </button>
        ) : lastRollWasSix ? (
          <span className="text-xs font-black text-[#FDD835] bg-red-600/80 px-2 py-0.5 rounded-full border border-yellow-300 animate-bounce">
            🎉 ROLLED 6! BONUS ROLL!
          </span>
        ) : (
          <span className="text-xs text-slate-400 font-medium">
            Select token to move
          </span>
        )}
      </div>
    </div>
  );
}
