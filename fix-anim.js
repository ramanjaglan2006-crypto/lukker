import fs from 'fs';
const path = 'src/hooks/useGameEngine.js';
let content = fs.readFileSync(path, 'utf8');

// Add a safety timeout to animation ref
content = content.replace(
  'isAnimatingRef.current = true;',
  `isAnimatingRef.current = true;
    setTimeout(() => { isAnimatingRef.current = false; }, 5000); // Safety timeout`
);

fs.writeFileSync(path, content);
console.log('Fixed animation lock');
