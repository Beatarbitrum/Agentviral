import { getIndex, getPublished, getSettings } from "@/lib/store";
import { escapeHtml, siteUrl } from "@/lib/util";

export const revalidate = 300;

export async function GET() {
  const [pub, s, idx] = await Promise.all([getPublished(), getSettings(), getIndex()]);
  const u = siteUrl();
  const items = pub.slice(0, 50);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>${escapeHtml(s.siteName)}</title>
<link>${u}</link>
<description>${escapeHtml(s.description)}</description>
<language>id</language>
<atom:link href="${u}/rss.xml" rel="self" type="application/rss+xml"/>
<lastBuildDate>${new Date(items[0]?.publishAt || Date.now()).toUTCString()}</lastBuildDate>
${items
  .map(
    (a) => `<item><title>${escapeHtml(a.title)}</title><link>${u}/berita/${a.slug}</link><guid isPermaLink="true">${u}/berita/${a.slug}</guid><pubDate>${new Date(a.publishAt).toUTCString()}</pubDate><category>${escapeHtml(idx.categories.find((c) => c.slug === a.category)?.name || a.category)}</category><description>${escapeHtml(a.excerpt || "")}</description>${a.cover?.url ? `<media:content url="${escapeHtml(a.cover.url)}" medium="image"/>` : ""}</item>`,
  )
  .join("\n")}
</channel>
</rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
