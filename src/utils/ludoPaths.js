// Ludo 15x15 Grid Layout and Player Path Definitions

export const PLAYERS = ['red', 'green', 'yellow', 'blue'];

export const PLAYER_CONFIGS = {
  red: {
    id: 'red',
    name: 'Red Player',
    color: '#E53935',
    bgClass: 'bg-ludo-red',
    borderClass: 'border-ludo-red',
    glowClass: 'shadow-glow-red',
    startIndex: 0,
    homePath: [
      [7, 1], [7, 2], [7, 3], [7, 4], [7, 5]
    ],
    homeCenter: [7, 6],
    baseSlots: [
      [1.5, 1.5], [1.5, 3.5], [3.5, 1.5], [3.5, 3.5]
    ]
  },
  green: {
    id: 'green',
    name: 'Green Player',
    color: '#43A047',
    bgClass: 'bg-ludo-green',
    borderClass: 'border-ludo-green',
    glowClass: 'shadow-glow-green',
    startIndex: 13,
    homePath: [
      [1, 7], [2, 7], [3, 7], [4, 7], [5, 7]
    ],
    homeCenter: [6, 7],
    baseSlots: [
      [1.5, 10.5], [1.5, 12.5], [3.5, 10.5], [3.5, 12.5]
    ]
  },
  yellow: {
    id: 'yellow',
    name: 'Yellow Player',
    color: '#FDD835',
    bgClass: 'bg-ludo-yellow',
    borderClass: 'border-ludo-yellow',
    glowClass: 'shadow-glow-yellow',
    startIndex: 26,
    homePath: [
      [7, 13], [7, 12], [7, 11], [7, 10], [7, 9]
    ],
    homeCenter: [7, 8],
    baseSlots: [
      [10.5, 10.5], [10.5, 12.5], [12.5, 10.5], [12.5, 12.5]
    ]
  },
  blue: {
    id: 'blue',
    name: 'Blue Player',
    color: '#1E88E5',
    bgClass: 'bg-ludo-blue',
    borderClass: 'border-ludo-blue',
    glowClass: 'shadow-glow-blue',
    startIndex: 39,
    homePath: [
      [13, 7], [12, 7], [11, 7], [10, 7], [9, 7]
    ],
    homeCenter: [8, 7],
    baseSlots: [
      [10.5, 1.5], [10.5, 3.5], [12.5, 1.5], [12.5, 3.5]
    ]
  }
};

// 52-cell main common track loop
export const MAIN_TRACK = [
  [6, 1],  [6, 2],  [6, 3],  [6, 4],  [6, 5],   // 0-4
  [5, 6],  [4, 6],  [3, 6],  [2, 6],  [1, 6],  [0, 6], // 5-10
  [0, 7],  // 11 (Green Arrow)
  [0, 8],  [1, 8],  [2, 8],  [3, 8],  [4, 8],  [5, 8], // 12-17
  [6, 9],  [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], // 18-23
  [7, 14], // 24 (Yellow Arrow)
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],  // 25-30
  [9, 8],  [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], // 31-36
  [14, 7], // 37 (Blue Arrow)
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],  // 38-43
  [8, 5],  [8, 4],  [8, 3],  [8, 2],  [8, 1],  [8, 0],  // 44-49
  [7, 0]   // 50 (Red Arrow)
  , [6, 0] // 51
];

// List of safe cells (cannot capture tokens here)
export const SAFE_CELLS = [
  { r: 6, c: 1, color: 'red', type: 'start' },
  { r: 8, c: 2, color: 'red', type: 'safe' },
  { r: 1, c: 8, color: 'green', type: 'start' },
  { r: 2, c: 6, color: 'green', type: 'safe' },
  { r: 8, c: 13, color: 'yellow', type: 'start' },
  { r: 6, c: 12, color: 'yellow', type: 'safe' },
  { r: 13, c: 6, color: 'blue', type: 'start' },
  { r: 12, c: 8, color: 'blue', type: 'safe' }
];

// Arrow indicators on entry cells
export const ARROW_CELLS = [
  { r: 7, c: 0, direction: 'right', color: '#E53935' },
  { r: 0, c: 7, direction: 'down', color: '#43A047' },
  { r: 7, c: 14, direction: 'left', color: '#FDD835' },
  { r: 14, c: 7, direction: 'up', color: '#1E88E5' }
];

// Helper to get exact [row, col] position for a player token at a given step (0 to 56)
export function getTokenCoordinates(playerColor, step) {
  if (step === -1) {
    // In Home Base - caller handles base slot position
    return null;
  }
  
  const config = PLAYER_CONFIGS[playerColor];
  
  // Outer 52 track loop
  if (step < 51) {
    const trackIdx = (config.startIndex + step) % 52;
    const [r, c] = MAIN_TRACK[trackIdx];
    return { r, c };
  }
  
  // Home stretch (5 steps: 51..55)
  if (step >= 51 && step < 56) {
    const homeIdx = step - 51;
    const [r, c] = config.homePath[homeIdx];
    return { r, c };
  }
  
  // Step 56: Home Center Triangle
  if (step === 56) {
    const [r, c] = config.homeCenter;
    return { r, c };
  }
  
  return null;
}

// Check if a given [r, c] coordinate is safe
export function isSafeCell(r, c) {
  return SAFE_CELLS.some(sc => sc.r === r && sc.c === c);
}
