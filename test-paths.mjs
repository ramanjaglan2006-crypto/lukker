import { MAIN_TRACK } from './src/utils/ludoPaths.js';

MAIN_TRACK.forEach((pos, idx) => {
  if (pos[0] === 0 && pos[1] === 7) {
    console.log(`Found [0, 7] at MAIN_TRACK index ${idx}`);
  }
});
