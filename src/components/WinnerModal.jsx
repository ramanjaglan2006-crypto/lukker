import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { PLAYER_CONFIGS } from '../utils/ludoPaths';

export default function WinnerModal({ winner, onRestart }) {
  useEffect(() => {
    if (winner) {
      // Fire confetti burst
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [winner]);

  if (!winner) return null;

  const config = PLAYER_CONFIGS[winner];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#131C31] border-4 border-[#FDD835] rounded-3xl p-6 max-w-sm w-full text-center shadow-[0_0_50px_rgba(253,216,53,0.5)] animate-bounce-subtle">
        <div className="text-6xl mb-2">👑</div>
        <h2 className="text-2xl font-black text-white mb-1">VICTORY!</h2>
        <p className="text-lg font-bold mb-4" style={{ color: config.color }}>
          {config.name} Wins the Game!
        </p>

        <div className="bg-[#0D1321] rounded-2xl p-4 mb-6 border border-slate-700">
          <span className="text-xs text-slate-400 block mb-1">All 4 tokens reached Home Center</span>
          <span className="text-xl font-black text-yellow-400">4 / 4 HOME</span>
        </div>

        <button
          onClick={onRestart}
          className="w-full py-3 px-6 rounded-2xl bg-[#FDD835] hover:bg-yellow-300 text-black font-black text-base shadow-lg transition-all"
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}
