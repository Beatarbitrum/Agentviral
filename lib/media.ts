import "server-only";
import { putMedia } from "./blob";
import { getArticle, getSettings, saveArticle } from "./store";
import { runAll } from "./mediaProviders";
import type { MediaRef, MediaSettings, SourceLink } from "./types";

// Pencarian media otomatis untuk artikel: foto sampul, video/postingan sosial (YouTube, TikTok,
// Instagram, X, Facebook), dan tautan referensi. Semua hasil masuk ke draf untuk ditinjau editor.

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

async function getText(url: string, ms = 9000): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": UA, "accept-language": "id-ID,id;q=0.9,en;q=0.7" }, signal: AbortSignal.timeout(ms), redirect: "follow" });
  if (!res.ok) throw new Error(`${res.status}`);
  return (await res.text()).slice(0, 1_500_000);
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\\u0026/g, "&").replace(/\\\//g, "/");

function meta(html: string, prop: string): string | undefined {
  const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, "i");
  const m = html.match(re1) || html.match(re2);
  return m ? decode(m[1]).trim() : undefined;
}

const SOCIAL: RegExp[] = [
  /https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:watch\?v=|shorts\/|embed\/)[\w-]{11}/gi,
  /https?:\/\/youtu\.be\/[\w-]{11}/gi,
  /https?:\/\/(?:www\.|m\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/gi,
  /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|reels)\/[\w-]+/gi,
  /https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/\w+\/status\/\d+/gi,
  /https?:\/\/(?:www\.|m\.)?facebook\.com\/[^\s"'<>]+\/videos\/\d+/gi,
];

function normSocial(u: string): string {
  let x = u.replace("m.youtube.com", "www.youtube.com").replace("mobile.twitter.com", "x.com").replace("twitter.com", "x.com").replace("m.tiktok.com", "www.tiktok.com");
  const emb = x.match(/youtube\.com\/embed\/([\w-]{11})/);
  if (emb) x = `https://www.youtube.com/watch?v=${emb[1]}`;
  return x.replace(/^http:/, "https:");
}

function socialLinks(html: string): string[] {
  const out = new Set<string>();
  const h = decode(html);
  for (const re of SOCIAL) for (const m of h.matchAll(re)) out.add(normSocial(m[0]));
  return [...out].filter((u) => !/\/(intent|share|sharer)/.test(u));
}

export async function searchYouTube(q: string, n = 2): Promise<{ url: string; title: string }[]> {
  const recent = await ytSearch(q, n, "EgIIBA%3D%3D"); // diunggah bulan ini
  return recent.length ? recent : ytSearch(q, n);
}

async function ytSearch(q: string, n: number, sp?: string): Promise<{ url: string; title: string }[]> {
  try {
    const html = await getText(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=id&gl=ID${sp ? `&sp=${sp}` : ""}`, 9000);
    const out: { url: string; title: string }[] = [];
    const seen = new Set<string>();
    for (const m of html.matchAll(/"videoRenderer":\{"videoId":"([\w-]{11})"[\s\S]{0,1500}?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/g)) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      out.push({ url: `https://www.youtube.com/watch?v=${m[1]}`, title: JSON.parse(`"${m[2]}"`) });
      if (out.length >= n) break;
    }
    return out;
  } catch {
    return [];
  }
}

async function newsSearch(q: string): Promise<{ url: string; title: string }[]> {
  try {
    const xml = await getText(`https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&setlang=id&cc=ID`, 9000);
    const out: { url: string; title: string }[] = [];
    for (const it of xml.split("<item>").slice(1)) {
      const t = it.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "";
      let l = decode(it.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "");
      const u = l.match(/[?&]url=([^&]+)/);
      if (u) l = decodeURIComponent(u[1]);
      if (/^https?:/.test(l)) out.push({ url: l, title: decode(t).trim() });
    }
    return out;
  } catch {
    return [];
  }
}

async function commonsImage(q: string): Promise<MediaRef | null> {
  try {
    const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=5&gsrsearch=${encodeURIComponent(`${q} filetype:bitmap`)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1280`;
    const j = JSON.parse(await getText(api, 8000));
    const pages = Object.values(j.query?.pages || {}) as { title: string; index?: number; imageinfo?: { thumburl?: string; url: string; descriptionurl: string; extmetadata?: Record<string, { value: string }> }[] }[];
    pages.sort((a, b) => (a.index || 0) - (b.index || 0));
    for (const p of pages) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const artist = (ii.extmetadata?.Artist?.value || "").replace(/<[^>]+>/g, "").trim();
      const lic = ii.extmetadata?.LicenseShortName?.value || "";
      return { url: ii.thumburl || ii.url, alt: p.title.replace(/^File:|\.\w+$/g, ""), credit: `Wikimedia Commons${artist ? ` / ${artist}` : ""}${lic ? ` (${lic})` : ""}` };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Unduh gambar lalu simpan di Vercel Blob agar tidak bergantung hotlink situs lain. */
async function rehost(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, referer: new URL(url).origin + "/" }, signal: AbortSignal.timeout(10_000) });
    const type = res.headers.get("content-type") || "";
    if (!res.ok || !/^image\/(jpeg|png|webp|gif|avif)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 8_000 || buf.length > 8_000_000) return null;
    const ext = type.split("/")[1].replace("jpeg", "jpg");
    return await putMedia(`media/auto/cover.${ext}`, buf, type);
  } catch {
    return null;
  }
}

export interface FoundMedia {
  cover?: MediaRef;
  embeds: string[];
  sources: SourceLink[];
  log: string[];
}

const PLATFORM_RE: Record<string, RegExp> = {
  youtube: /(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/,
  tiktok: /tiktok\.com\/@[\w.-]+\/video\/\d+/,
  instagram: /instagram\.com\/(p|reel|reels)\/[\w-]+/,
  x: /x\.com\/\w+\/status\/\d+/,
  facebook: /facebook\.com\/.+\/videos\/\d+/,
};
const SITE: Record<string, string> = { tiktok: "tiktok.com", instagram: "instagram.com", x: "x.com", facebook: "facebook.com" };

function platformOf(u: string) {
  return Object.keys(PLATFORM_RE).find((k) => PLATFORM_RE[k].test(u));
}

export async function findMedia(input: { title: string; keyword?: string; sourceUrls?: string[] }, cfg?: MediaSettings): Promise<FoundMedia> {
  const m = cfg || (await getSettings()).media;
  const base = (input.keyword && input.keyword.length > 3 ? input.keyword : input.title).slice(0, 120);
  const q = `${base} ${m.extraKeywords || ""}`.trim();
  const blocked = (m.blockedDomains || "").split(/[,\s]+/).map((d) => d.trim().toLowerCase()).filter(Boolean);
  const okHost = (u: string) => { try { const h = new URL(u).hostname.toLowerCase(); return !blocked.some((b) => h === b || h.endsWith(`.${b}`)); } catch { return false; } };
  const log: string[] = [];
  const t0 = Date.now();
  const videos: string[] = [];
  const social: string[] = [];
  const addEmbed = (u: string) => {
    const n = normSocial(u);
    const p = platformOf(n);
    if (!p || !m.platforms[p as keyof MediaSettings["platforms"]] || !okHost(n)) return;
    if (p === "youtube") { if (!videos.includes(n) && videos.length < m.maxVideos) videos.push(n); }
    else if (!social.includes(n) && social.length < m.maxSocial) social.push(n);
  };
  const sources: SourceLink[] = [];
  let cover: MediaRef | undefined;
  const providers = m.providers || [];

  const tryCover = async (url: string, alt: string, credit: string, hotlinkOnly = false) => {
    if (cover || !okHost(url)) return;
    if (hotlinkOnly) { cover = { url, alt, credit }; return; }
    const hosted = await rehost(url);
    if (hosted) cover = { url: hosted, alt, credit };
  };
  const stockCover = async () => {
    if (cover) return;
    const photos = await runAll(providers, "photos", base, log);
    for (const p of photos.slice(0, 3)) {
      await tryCover(p.url, p.alt, p.credit, p.hotlinkOnly);
      if (cover) { log.push(`Sampul dari foto stok (${p.credit})`); return; }
    }
  };

  // 0) Foto stok dulu bila dipilih
  if (m.coverMode === "stock") await stockCover();

  // 1) Halaman sumber: og:image + postingan yang disematkan
  const srcUrls = (input.sourceUrls || []).filter((u) => /^https?:/.test(u)).slice(0, 3);
  const pages = await Promise.all(srcUrls.map(async (u) => ({ u, html: await getText(u).catch(() => "") })));
  for (const { u, html } of pages) {
    if (!html) continue;
    socialLinks(html).forEach(addEmbed);
    if (m.coverMode !== "off" && !cover) {
      const img = meta(html, "og:image") || meta(html, "twitter:image") || meta(html, "twitter:image:src");
      if (img) {
        await tryCover(new URL(img, u).toString(), meta(html, "og:title") || input.title, `Foto: ${new URL(u).hostname.replace(/^www\./, "")}`);
        if (cover) log.push(`Sampul dari halaman sumber (${new URL(u).hostname})`);
      }
    }
  }

  // 2) Pencarian paralel: YouTube, platform sosial (via penyedia API), berita terkait
  const socialPlatforms = (["tiktok", "instagram", "x", "facebook"] as const).filter((p) => m.platforms[p]);
  const [ytApi, vidApi, webApi, newsApi, ytScrape, newsFree] = await Promise.all([
    m.platforms.youtube && m.maxVideos ? runAll(providers.filter((p) => p.type === "youtube"), "videos", q, log) : Promise.resolve([]),
    m.maxSocial || m.maxVideos ? runAll(providers.filter((p) => p.type !== "youtube"), "videos", q, log) : Promise.resolve([]),
    m.maxSocial && socialPlatforms.length ? Promise.all(socialPlatforms.map((p) => runAll(providers, "web", `${q} site:${SITE[p]}`, log))).then((x) => x.flat()) : Promise.resolve([]),
    m.maxRefs ? runAll(providers, "news", q, log) : Promise.resolve([]),
    m.platforms.youtube && m.maxVideos ? searchYouTube(q, m.maxVideos) : Promise.resolve([]),
    m.maxRefs ? newsSearch(q) : Promise.resolve([]),
  ]);
  [...ytApi, ...ytScrape].forEach((v) => addEmbed(v.url));
  [...webApi, ...vidApi].forEach((v) => addEmbed(v.url));

  const srcHosts = new Set(srcUrls.map((u) => new URL(u).hostname));
  for (const r of [...newsApi, ...newsFree]) {
    if (sources.length >= m.maxRefs) break;
    let h = "";
    try { h = new URL(r.url).hostname; } catch { continue; }
    if (!okHost(r.url) || srcHosts.has(h) || /(youtube|tiktok|instagram|facebook|x\.com|twitter|wikipedia|pinterest|msn\.com)/.test(h)) continue;
    srcHosts.add(h);
    sources.push({ title: `${h.replace(/^www\./, "")}: ${r.title}`.slice(0, 160), url: r.url });
  }

  // 3) Berita terkait sering menyematkan video TikTok/Instagram/X — ambil juga dari sana
  const related = Date.now() - t0 < 30_000 ? await Promise.all(sources.map(async (s) => ({ u: s.url, html: await getText(s.url, 7000).catch(() => "") }))) : [];
  for (const { u, html } of related) {
    if (!html) continue;
    socialLinks(html).forEach(addEmbed);
    if (m.coverMode === "source" && !cover) {
      const img = meta(html, "og:image") || meta(html, "twitter:image");
      if (img) {
        const h = new URL(u).hostname.replace(/^www\./, "");
        await tryCover(new URL(img, u).toString(), input.title, `Foto: ${h}`);
        if (cover) log.push(`Sampul dari ${h}`);
      }
    }
  }

  // 4) Cadangan: foto stok, lalu Wikimedia Commons
  if (m.coverMode !== "off") await stockCover();
  if (m.coverMode !== "off" && !cover && Date.now() - t0 < 40_000) {
    const c = await commonsImage(base);
    if (c) { await tryCover(c.url, c.alt || base, c.credit || "Wikimedia Commons"); if (cover) log.push("Sampul dari Wikimedia Commons"); }
  }
  log.push(`${videos.length} video YouTube, ${social.length} postingan sosial, ${sources.length} referensi`);
  return { cover, embeds: [...videos, ...social], sources, log };
}

/** Lengkapi artikel yang sudah ada dengan media otomatis (tidak menimpa yang sudah diisi editor). */
export async function enrichArticle(id: string) {
  const a = await getArticle(id, true);
  if (!a) throw new Error("Artikel tidak ditemukan");
  const found = await findMedia({ title: a.title, keyword: a.seo?.focusKeyword, sourceUrls: a.sources.map((s) => s.url) });
  const embeds = Array.from(new Set([...(a.embeds || []), ...found.embeds]));
  const have = new Set(a.sources.map((s) => s.url));
  const sources = [...a.sources, ...found.sources.filter((s) => !have.has(s.url))];
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = a; // eslint-disable-line @typescript-eslint/no-unused-vars
  const art = await saveArticle({ ...rest, cover: a.cover?.url ? a.cover : found.cover, embeds, sources } as Parameters<typeof saveArticle>[0], id);
  return { article: art, found };
}
