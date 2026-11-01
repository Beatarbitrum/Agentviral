import { getIndex, getPublished } from "@/lib/store";
import { STATIC_PAGES } from "@/lib/pages";
import { escapeHtml, siteUrl } from "@/lib/util";

export const revalidate = 600;

export async function GET() {
  const [pub, idx] = await Promise.all([getPublished(), getIndex()]);
  const u = siteUrl();
  const now = new Date().toISOString();
  const urls: { loc: string; lastmod: string; freq: string; pri: string }[] = [
    { loc: u, lastmod: pub[0]?.updatedAt || now, freq: "hourly", pri: "1.0" },
    ...idx.categories.map((c) => ({ loc: `${u}/kategori/${c.slug}`, lastmod: pub.find((a) => a.category === c.slug)?.publishAt || now, freq: "hourly", pri: "0.8" })),
    ...pub.map((a) => ({ loc: `${u}/berita/${a.slug}`, lastmod: a.updatedAt, freq: "daily", pri: "0.7" })),
    ...idx.tags.filter((t) => pub.some((a) => a.tags.includes(t.slug))).map((t) => ({ loc: `${u}/tag/${t.slug}`, lastmod: now, freq: "daily", pri: "0.4" })),
    ...Object.keys(STATIC_PAGES).map((p) => ({ loc: `${u}/${p}`, lastmod: now, freq: "monthly", pri: "0.3" })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((x) => `<url><loc>${escapeHtml(x.loc)}</loc><lastmod>${x.lastmod}</lastmod><changefreq>${x.freq}</changefreq><priority>${x.pri}</priority></url>`).join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
