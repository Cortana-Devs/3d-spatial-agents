export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

/**
 * Perform a web search using Brave Search API first, 
 * with a fallback to Serper (Google Search API).
 */
export async function performWebSearch(query: string): Promise<SearchResult[]> {
  try {
    const braveResults = await fetchBraveSearch(query);
    if (braveResults && braveResults.length > 0) {
      console.log(`[Search] Brave Search succeeded for: "${query}"`);
      return braveResults;
    }
  } catch (err) {
    console.error("[Search] Brave Search Failed:", err);
  }

  console.log(`[Search] Falling back to Serper API for: "${query}"...`);

  try {
    const serperResults = await fetchSerperSearch(query);
    if (serperResults && serperResults.length > 0) {
      return serperResults;
    }
  } catch (err) {
    console.error("[Search] Serper Search Failed:", err);
  }

  // Both failed or no keys
  console.warn("[Search] API Keys missing or both services failed.");
  return [
    {
      title: "Search API Keys Missing or Failed",
      link: "#",
      snippet: "Please ensure BRAVE_SEARCH_API_KEY or SERPER_API_KEY is properly configured in your .env file to enable live search.",
    },
  ];
}

async function fetchBraveSearch(query: string): Promise<SearchResult[] | null> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
    headers: {
      "Accept": "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`Brave API error: ${response.statusText}`);
  }

  const data = await response.json();
  return (data.web?.results || []).slice(0, 5).map((item: any) => ({
    title: item.title,
    link: item.url, // Brave uses 'url'
    snippet: item.description, // Brave uses 'description'
  }));
}

async function fetchSerperSearch(query: string): Promise<SearchResult[] | null> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query }),
  });

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.statusText}`);
  }

  const data = await response.json();
  return (data.organic || []).slice(0, 5).map((item: any) => ({
    title: item.title,
    link: item.link,
    snippet: item.snippet,
  }));
}
