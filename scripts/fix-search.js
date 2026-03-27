const fs = require('fs');

let content = fs.readFileSync('src/lib/search.ts', 'utf8');

// Add a helper for fetch with timeout
const helper = `
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}
`;

if (!content.includes('fetchWithTimeout')) {
    content = content.replace('export interface SearchResult', helper + '\nexport interface SearchResult');
    content = content.replace(/await fetch\(`https:\/\/api\.search\.brave\.com/g, 'await fetchWithTimeout(`https://api.search.brave.com');
    content = content.replace(/await fetch\("https:\/\/google\.serper\.dev/g, 'await fetchWithTimeout("https://google.serper.dev');
    fs.writeFileSync('src/lib/search.ts', content, 'utf8');
}
