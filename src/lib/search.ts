export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

/**
 * Perform a web search using Serper (Google Search API).
 * Requires SERPER_API_KEY in environment.
 */
export async function performWebSearch(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    console.warn("SERPER_API_KEY not found. Search will return no results.");
    return [
      {
        title: "Search API Key Missing",
        link: "#",
        snippet: "Please add SERPER_API_KEY to your .env file to enable web search functionality.",
      },
    ];
  }

  try {
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
  } catch (error) {
    console.error("Web Search Error:", error);
    return [];
  }
}
