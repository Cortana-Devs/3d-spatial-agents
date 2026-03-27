const fs = require('fs');
let content = fs.readFileSync('src/app/actions.ts', 'utf8');

// remove existing import
content = content.replace('import { after } from "next/server";\n', '');
content = content.replace('"use server";\n', '"use server";\nimport { after } from "next/server";\n');

fs.writeFileSync('src/app/actions.ts', content, 'utf8');
