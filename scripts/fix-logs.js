const fs = require('fs');

let content = fs.readFileSync('src/app/actions.ts', 'utf8');

// Add import
if (!content.includes('import { after } from "next/server";')) {
  content = 'import { after } from "next/server";\n' + content;
}

// Replace exact await logAgentInteraction block
content = content.replace(/await logAgentInteraction\(\{([\s\S]*?)\}\);/g, 'after(() => logAgentInteraction({$1}).catch(console.error));');

fs.writeFileSync('src/app/actions.ts', content, 'utf8');
