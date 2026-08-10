import React from 'react';
import TokenPin from './TokenPin';

export default function SideGuide({ gameLog = [] }) {
  return (
    <aside className="w-full lg:w-80 flex flex-col gap-4 select-none">
      {/* 6. BOARD CELL GUIDE */}
      <div className="bg-[#131C31] border border-slate-800 rounded-2xl p-4 shadow-lg">
        <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider mb-3">
          6. BOARD CELL GUIDE (15x15 GRID)
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 bg-[#0D1321] p-2 rounded-xl border border-slate-800">
            <div className="w-4 h-4 bg-white border border-slate-300 rounded" />
            <span className="text-slate-300 font-medium">Normal Cell</span>
          </div>
          <div className="flex items-center gap-2 bg-[#0D1321] p-2 rounded-xl border border-slate-800">
            <span className="text-red-500 font-black text-sm">★</span>
            <span className="text-slate-300 font-medium">Red Safe</span>
          </div>
          <div className="flex items-center gap-2 bg-[#0D1321] p-2 rounded-xl border border-slate-800">
            <span className="text-green-500 font-black text-sm">★</span>
            <span className="text-slate-300 font-medium">Green Safe</span>
          </div>
          <div className="flex items-center gap-2 bg-[#0D1321] p-2 rounded-xl border border-slate-800">
            <span className="text-yellow-400 font-black text-sm">★</span>
            <span className="text-slate-300 font-medium">Yellow Safe</span>
          </div>
          <div className="flex items-center gap-2 bg-[#0D1321] p-2 rounded-xl border border-slate-800 col-span-2">
            <span className="text-blue-500 font-black text-sm">★</span>
            <span className="text-slate-300 font-medium">Blue Safe</span>
          </div>
        </div>
      </div>

      {/* 12. TOKEN STATES */}
      <div className="bg-[#131C31] border border-slate-800 rounded-2xl p-4 shadow-lg">
        <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider mb-3">
          12. INTERACTION STATES (TOKENS)
        </h3>
        <div className="grid grid-cols-4 gap-2 text-center text-[10px] text-slate-300 font-semibold">
          <div className="flex flex-col items-center gap-1">
            <TokenPin color="#1E88E5" state="normal" size={22} />
            <span>Normal</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <TokenPin color="#43A047" state="selected" size={22} />
            <span>Selected</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <TokenPin color="#FDD835" state="movable" size={22} />
            <span>Movable</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <TokenPin color="#E53935" state="captured" size={22} />
            <span>Captured</span>
          </div>
        </div>
      </div>

      {/* LIVE GAME LOG */}
      <div className="bg-[#131C31] border border-slate-800 rounded-2xl p-4 shadow-lg flex-1 flex flex-col max-h-56">
        <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>📜 LIVE GAME LOG</span>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
        </h3>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs text-slate-300 font-mono">
          {gameLog.map((log, idx) => (
            <div key={idx} className="bg-[#0D1321] px-2.5 py-1 rounded-lg border border-slate-800/60">
              {log}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
