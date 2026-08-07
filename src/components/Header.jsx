import React from 'react';
import { Volume2, VolumeX, RefreshCw, Users, Bot } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export default function Header({
  playerMode = '4P',
  setPlayerMode,
  soundMuted = false,
  setSoundMuted,
  onReset
}) {
  const handleSoundToggle = () => {
    const isMuted = sounds.toggleMute();
    setSoundMuted(isMuted);
  };

  return (
    <header className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-[#131C31] border-b border-slate-800 rounded-2xl shadow-lg select-none">
      {/* Title Brand */}
      <div className="flex flex-col text-center sm:text-left">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-glow">
          LUDO GAME UI
        </h1>
        <span className="text-[11px] sm:text-xs font-extrabold tracking-widest text-slate-400 uppercase">
          LUDO KING STYLE EXACT REPLICA
        </span>
      </div>

      {/* Mode Switches & Controls */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {/* 2 Players */}
        <button
          onClick={() => setPlayerMode('2P')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            playerMode === '2P'
              ? 'bg-[#FDD835] text-black shadow-[0_0_10px_#FDD835]'
              : 'bg-[#0D1321] text-slate-300 border border-slate-700 hover:border-slate-500'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          2P
        </button>

        {/* 4 Players */}
        <button
          onClick={() => setPlayerMode('4P')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            playerMode === '4P'
              ? 'bg-[#FDD835] text-black shadow-[0_0_10px_#FDD835]'
              : 'bg-[#0D1321] text-slate-300 border border-slate-700 hover:border-slate-500'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          4P
        </button>

        {/* vs Computer */}
        <button
          onClick={() => setPlayerMode('VS_BOT')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            playerMode === 'VS_BOT'
              ? 'bg-[#FDD835] text-black shadow-[0_0_10px_#FDD835]'
              : 'bg-[#0D1321] text-slate-300 border border-slate-700 hover:border-slate-500'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          VS Computer
        </button>

        {/* Mute/Sound Toggle */}
        <button
          onClick={handleSoundToggle}
          className="p-2 rounded-xl bg-[#0D1321] text-slate-300 border border-slate-700 hover:text-white hover:border-slate-500 transition-all"
          title={soundMuted ? "Unmute Sound" : "Mute Sound"}
        >
          {soundMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-green-400" />}
        </button>

        {/* Reset Game */}
        <button
          onClick={onReset}
          className="p-2 rounded-xl bg-[#0D1321] text-slate-300 border border-slate-700 hover:text-white hover:border-slate-500 transition-all"
          title="Restart Game"
        >
          <RefreshCw className="w-4 h-4 text-amber-400" />
        </button>
      </div>
    </header>
  );
}
