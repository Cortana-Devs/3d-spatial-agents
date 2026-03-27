const fs = require('fs');

let content = fs.readFileSync('src/components/World/WorldBuilder.tsx', 'utf8');

fs.writeFileSync('src/components/World/WorldBuilder.tsx', content, 'utf8');
