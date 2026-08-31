import React from 'react';

/**
 * TokenPin Component - Matches Section 7 (TOKEN (PIECE) DESIGN)
 * Features:
 * - 3D location drop pin style matching Ludo King
 * - White outer body contour
 * - Colored inner fill with radial depth gradient
 * - Colored circular base ring with subtle drop shadow
 * - States: normal, selected, movable, captured
 */
export default function TokenPin({
  color = '#E53935',
  state = 'normal', // 'normal' | 'selected' | 'movable' | 'captured'
  onClick,
  size = 44,
  badgeCount = 0
}) {
  const isMovable = state === 'movable';
  const isSelected = state === 'selected';
  const isCaptured = state === 'captured';

  // Dynamic formula: 1.5x in height, 0.75x in width from base size X
  const baseSize = size || 44;
  const tokenWidth = Math.round(baseSize * 0.75);
  const tokenHeight = Math.round(baseSize * 1.5);

  return (
    <div
      onClick={isMovable || isSelected ? onClick : undefined}
      className={`relative flex items-center justify-center transition-all duration-200 select-none -translate-y-[40%] ${
        isMovable ? 'token-movable cursor-pointer' : ''
      } ${isSelected ? 'scale-125 z-40 drop-shadow-[0_0_12px_#FFFFFF]' : ''} ${
        isCaptured ? 'opacity-40 scale-75' : ''
      }`}
      style={{ width: `${tokenWidth}px`, height: `${tokenHeight}px` }}
      title={isMovable ? "Click to move token" : undefined}
    >
      <svg
        viewBox="0 0 36 48"
        preserveAspectRatio="none"
        className="w-full h-full filter drop-shadow-md overflow-visible"
        style={{
          filter: isSelected
            ? `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 4px #FFFFFF)`
            : isMovable
            ? `drop-shadow(0 4px 8px rgba(0,0,0,0.5))`
            : `drop-shadow(0 2px 4px rgba(0,0,0,0.4))`
        }}
      >
        <defs>
          {/* Base Shadow & Outer Ring */}
          <radialGradient id={`baseRing-${color}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="60%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
          </radialGradient>

          {/* Inner Marker 3D Gradient */}
          <radialGradient id={`innerGrad-${color}`} cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="25%" stopColor={color} stopOpacity="1" />
            <stop offset="85%" stopColor={color} stopOpacity="0.85" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
          </radialGradient>
        </defs>

        {/* Outer Shadow Circle on Ground */}
        <ellipse
          cx="18"
          cy="43"
          rx="12"
          ry="4"
          fill="rgba(0,0,0,0.4)"
        />

        {/* Outer White Base Oval Ring */}
        <ellipse
          cx="18"
          cy="41"
          rx="13"
          ry="5.5"
          fill="#FFFFFF"
        />
        <ellipse
          cx="18"
          cy="41"
          rx="10.5"
          ry="4"
          fill={`url(#baseRing-${color})`}
        />

        {/* Outer White Pin Shape (Thick White Body Border) */}
        <path
          d="M 18 2 
             C 9 2, 2 9, 2 18 
             C 2 27, 13 38, 18 43 
             C 23 38, 34 27, 34 18 
             C 34 9, 27 2, 18 2 Z"
          fill="#FFFFFF"
        />

        {/* Inner Colored Pin Body */}
        <path
          d="M 18 4.5 
             C 10.5 4.5, 4.5 10.5, 4.5 18 
             C 4.5 25.5, 14 35.5, 18 40.5 
             C 22 35.5, 31.5 25.5, 31.5 18 
             C 31.5 10.5, 25.5 4.5, 18 4.5 Z"
          fill={`url(#innerGrad-${color})`}
        />

        {/* Top White Gloss Highlight Specular Dot */}
        <circle
          cx="13"
          cy="12"
          r="3.5"
          fill="#FFFFFF"
          opacity="0.7"
        />

        {/* Center White Core Ring/Dot */}
        <circle
          cx="18"
          cy="17"
          r="4.5"
          fill="#FFFFFF"
          opacity="0.9"
        />
        <circle
          cx="18"
          cy="17"
          r="2.5"
          fill={color}
        />
      </svg>

      {/* Multi-token badge indicator (e.g. 2, 3 stacked tokens) */}
      {badgeCount > 1 && (
        <div className="absolute -top-1 -right-1 bg-white text-black font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-black shadow">
          {badgeCount}
        </div>
      )}
    </div>
  );
}
