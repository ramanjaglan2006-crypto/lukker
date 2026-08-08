import React from 'react';
import { PLAYER_CONFIGS, SAFE_CELLS, ARROW_CELLS, getTokenCoordinates } from '../utils/ludoPaths';
import TokenPin from './TokenPin';

/**
 * LudoBoard Component - Exact replica of Ludo King Board (Section 2 & 6 of Spec)
 * Features 15x15 CSS grid, 4 corner bases, 4 center triangles, star safe cells, direction arrows,
 * and token stacking renderer.
 */
export default function LudoBoard({
  tokens = { red: [-1,-1,-1,-1], green: [-1,-1,-1,-1], yellow: [-1,-1,-1,-1], blue: [-1,-1,-1,-1] },
  currentPlayer = 'red',
  movableTokens = [],
  onTokenClick
}) {
  // Cell background color helper for 15x15 grid
  const getCellBgColor = (r, c) => {
    // 1. Red Start Cell [6, 1]
    if (r === 6 && c === 1) return '#E53935';
    // Red Home Stretch [7, 1..5]
    if (r === 7 && c >= 1 && c <= 5) return '#E53935';

    // 2. Green Start Cell [1, 8]
    if (r === 1 && c === 8) return '#43A047';
    // Green Home Stretch [1..5, 7]
    if (r >= 1 && r <= 5 && c === 7) return '#43A047';

    // 3. Yellow Start Cell [8, 13]
    if (r === 8 && c === 13) return '#FDD835';
    // Yellow Home Stretch [7, 9..13]
    if (r === 7 && c >= 9 && c <= 13) return '#FDD835';

    // 4. Blue Start Cell [13, 6]
    if (r === 13 && c === 6) return '#1E88E5';
    // Blue Home Stretch [9..13, 7]
    if (r >= 9 && r <= 13 && c === 7) return '#1E88E5';

    return '#FFFFFF';
  };

  // Helper to render Star Icon SVG on Safe Cells
  const renderStar = (r, c) => {
    const safeCell = SAFE_CELLS.find(sc => sc.r === r && sc.c === c);
    if (!safeCell) return null;

    const starColors = {
      red: '#E53935',
      green: '#43A047',
      yellow: '#FDD835',
      blue: '#1E88E5'
    };

    const color = starColors[safeCell.color] || '#FDD835';

    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 drop-shadow">
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill={color}
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
      </svg>
    );
  };

  // Helper to render Arrow Icons on Entry Cells
  const renderArrow = (r, c) => {
    const arrow = ARROW_CELLS.find(ac => ac.r === r && ac.c === c);
    if (!arrow) return null;

    const rotation = {
      right: 'rotate-0',
      down: 'rotate-90',
      left: 'rotate-180',
      up: '-rotate-90'
    }[arrow.direction];

    return (
      <span
        className={`text-xl sm:text-2xl font-black transform ${rotation} leading-none drop-shadow`}
        style={{ color: arrow.color }}
      >
        ➔
      </span>
    );
  };

  // Map tokens on track to cell grid coordinates
  const getTokensAtCell = (r, c) => {
    const list = [];
    Object.keys(tokens).forEach(player => {
      tokens[player].forEach((step, tokenIdx) => {
        if (step >= 0) {
          const coords = getTokenCoordinates(player, step);
          if (coords && coords.r === r && coords.c === c) {
            list.push({ player, tokenIdx });
          }
        }
      });
    });
    return list;
  };

  // Render Corner Home Base (6x6 area)
  const renderHomeBase = (playerKey, rowStart, colStart) => {
    const config = PLAYER_CONFIGS[playerKey];
    const playerTokens = tokens[playerKey];

    return (
      <div
        className="relative rounded-2xl p-2 sm:p-3 flex items-center justify-center border-4 border-white shadow-inner"
        style={{
          gridRow: `${rowStart} / span 6`,
          gridColumn: `${colStart} / span 6`,
          backgroundColor: config.color
        }}
      >
        {/* Inner White Box - sized to make outer colored border frame wider */}
        <div className="w-[82%] h-[82%] aspect-square bg-white rounded-2xl p-1.5 sm:p-2.5 grid grid-cols-2 grid-rows-2 gap-1 sm:gap-2 border-2 border-slate-200 shadow-md">
          {[0, 1, 2, 3].map(slotIdx => {
            const tokenInSlot = playerTokens[slotIdx] === -1;
            const isMovable = currentPlayer === playerKey && movableTokens.includes(slotIdx);

            return (
              <div key={slotIdx} className="flex items-center justify-center p-0.5">
                <div
                  className="w-[34px] h-[34px] max-w-[34px] max-h-[34px] aspect-square rounded-full border-2 border-black/20 flex items-center justify-center shadow-inner relative"
                  style={{
                    backgroundColor: config.color,
                    boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)'
                  }}
                >
                  {/* Gloss effect inside slot */}
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/40 rounded-t-full pointer-events-none" />

                  {tokenInSlot && (
                    <TokenPin
                      color={config.color}
                      size={44}
                      state={isMovable ? 'movable' : 'normal'}
                      onClick={() => isMovable && onTokenClick(slotIdx)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[620px] aspect-square bg-white rounded-3xl p-2 sm:p-3 board-shadow select-none relative">
      {/* 15x15 Grid Layout */}
      <div className="ludo-grid border-2 border-[#E0E0E0] rounded-2xl overflow-hidden bg-[#FFFFFF]">
        {/* Corner Bases */}
        {renderHomeBase('red', 1, 1)}
        {renderHomeBase('green', 1, 10)}
        {renderHomeBase('blue', 10, 1)}
        {renderHomeBase('yellow', 10, 10)}

        {/* Center 3x3 Triangles (Rows 6..8, Cols 6..8) */}
        <div
          className="relative w-full h-full border-2 border-[#E0E0E0]"
          style={{ gridRow: '7 / span 3', gridColumn: '7 / span 3' }}
        >
          {/* Red Left Triangle */}
          <div className="absolute inset-0 triangle-red" />
          {/* Green Top Triangle */}
          <div className="absolute inset-0 triangle-green" />
          {/* Yellow Right Triangle */}
          <div className="absolute inset-0 triangle-yellow" />
          {/* Blue Bottom Triangle */}
          <div className="absolute inset-0 triangle-blue" />

          {/* Center Trophy / Logo */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/90 border-2 border-slate-800 flex items-center justify-center shadow-md">
              <span className="text-xs sm:text-sm font-black text-amber-500">👑</span>
            </div>
          </div>
        </div>

        {/* Render 15x15 Track Cells */}
        {Array.from({ length: 15 }).map((_, r) =>
          Array.from({ length: 15 }).map((_, c) => {
            // Skip home bases and center area
            if ((r < 6 && c < 6) || (r < 6 && c >= 9) || (r >= 9 && c < 6) || (r >= 9 && c >= 9)) return null;
            if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return null;

            const bgColor = getCellBgColor(r, c);
            const tokensHere = getTokensAtCell(r, c);

            return (
              <div
                key={`${r}-${c}`}
                className="relative border border-[#E0E0E0] flex items-center justify-center overflow-visible"
                style={{
                  gridRow: `${r + 1}`,
                  gridColumn: `${c + 1}`,
                  backgroundColor: bgColor
                }}
              >
                {/* Render Safe Stars or Start Arrows */}
                {renderStar(r, c)}
                {renderArrow(r, c)}

                {/* Render Tokens occupying this cell */}
                {tokensHere.length > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    {tokensHere.map(({ player, tokenIdx }, idx) => {
                      const isCurrent = currentPlayer === player;
                      const isMovable = isCurrent && movableTokens.includes(tokenIdx);

                      return (
                        <div
                          key={`${player}-${tokenIdx}`}
                          className="absolute"
                          style={{
                            transform: tokensHere.length > 1
                              ? `translate(${(idx - (tokensHere.length - 1) / 2) * 8}px, ${(idx - (tokensHere.length - 1) / 2) * -4}px)`
                              : 'none'
                          }}
                        >
                          <TokenPin
                            color={PLAYER_CONFIGS[player].color}
                            state={isMovable ? 'movable' : 'normal'}
                            badgeCount={tokensHere.length > 2 && idx === 0 ? tokensHere.length : 0}
                            onClick={() => isMovable && onTokenClick(tokenIdx)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
