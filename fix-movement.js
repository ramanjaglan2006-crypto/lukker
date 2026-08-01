import fs from 'fs';
const path = 'src/engine/movement.js';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/console\.log\("INVALID MOVE:", reason, pieceId, steps\); return invalid\(/g, 'return invalid(');
fs.writeFileSync(path, content);
console.log('Fixed movement.js');
