import { getPublished, getSettings } from "@/lib/store";
import { escapeHtml, siteUrl } from "@/lib/util";

export const revalidate = 300;

export async function GET() {
  const [pub, s] = await Promise.all([getPublished(), getSettings()]);
  const cutoff = Date.now() - 2 * 24 * 3600 * 1000;
  const recent = pub.filter((a) => new Date(a.publishAt).getTime() >= cutoff).slice(0, 1000);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${recent
  .map(
    (a) => `<url><loc>${siteUrl()}/berita/${a.slug}</loc><news:news><news:publication><news:name>${escapeHtml(s.siteName)}</news:name><news:language>id</news:language></news:publication><news:publication_date>${a.publishAt}</news:publication_date><news:title>${escapeHtml(a.title)}</news:title></news:news></url>`,
  )
  .join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
