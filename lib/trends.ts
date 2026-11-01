import "server-only";

export interface TrendItem {
  title: string;
  traffic: string;
  pubDate: string;
  picture?: string;
  news: { title: string; url: string; source: string }[];
}

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

const tag = (block: string, name: string) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
};

export async function fetchTrends(geo = "ID"): Promise<TrendItem[]> {
  const res = await fetch(`https://trends.google.com/trending/rss?geo=${geo}`, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; AgentviralBot/1.0)" },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google Trends menjawab ${res.status}`);
  const xml = await res.text();
  const items = xml.split(/<item>/i).slice(1).map((b) => b.split(/<\/item>/i)[0]);
  return items.map((b) => ({
    title: tag(b, "title"),
    traffic: tag(b, "ht:approx_traffic"),
    pubDate: tag(b, "pubDate"),
    picture: tag(b, "ht:picture") || undefined,
    news: b
      .split(/<ht:news_item>/i)
      .slice(1)
      .map((n) => ({ title: tag(n, "ht:news_item_title"), url: tag(n, "ht:news_item_url"), source: tag(n, "ht:news_item_source") }))
      .filter((n) => n.url),
  }));
}
