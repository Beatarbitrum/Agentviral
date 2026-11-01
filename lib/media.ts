import "server-only";
import { putMedia } from "./blob";
import { getArticle, getSettings, saveArticle } from "./store";
import { runAll } from "./mediaProviders";
import { ageDays, rank, scoreText, searchQuery, tooOld, topicOf } from "./relevance";
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

export type VideoHit = { url: string; title: string; desc?: string; date?: string };

/** Pencarian YouTube tanpa API (scrape hasil pencarian): bulan ini + semua waktu, digabung. */
export async function searchYouTube(q: string, n = 10): Promise<VideoHit[]> {
  const [recent, all] = await Promise.all([ytSearch(q, n, "EgIIBA%3D%3D"), ytSearch(q, n)]);
  const seen = new Set<string>();
  return [...recent, ...all].filter((v) => (seen.has(v.url) ? false : (seen.add(v.url), true)));
}

const unq = (s: string) => { try { return JSON.parse(`"${s}"`) as string; } catch { return s; } };

async function ytSearch(q: string, n: number, sp?: string): Promise<VideoHit[]> {
  try {
    const html = await getText(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=id&gl=ID${sp ? `&sp=${sp}` : ""}`, 9000);
    const out: VideoHit[] = [];
    const seen = new Set<string>();
    for (const chunk of html.split('"videoRenderer":{"videoId":"').slice(1)) {
      const id = chunk.slice(0, 11);
      if (!/^[\w-]{11}$/.test(id) || seen.has(id)) continue;
      const c = chunk.slice(0, 12000);
      const t = c.match(/"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/);
      if (!t) continue;
      seen.add(id);
      const date = c.match(/"publishedTimeText":\{"simpleText":"([^"]*)"/)?.[1];
      const snip = c.match(/"(?:detailedMetadataSnippets|descriptionSnippet)":[\s\S]{0,40}?"runs":\[([\s\S]{0,1500}?)\]/)?.[1] || "";
      const desc = [...snip.matchAll(/"text":"((?:[^"\\]|\\.)*)"/g)].map((m) => unq(m[1])).join("");
      out.push({ url: `https://www.youtube.com/watch?v=${id}`, title: unq(t[1]), desc, date });
      if (out.length >= n) break;
    }
    return out;
  } catch {
    return [];
  }
}

/** Ambil judul/teks postingan lewat oEmbed publik (gratis, tanpa API key). */
async function oembedText(u: string): Promise<string | undefined> {
  let api = "";
  if (/youtube\.com|youtu\.be/.test(u)) api = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`;
  else if (/tiktok\.com/.test(u)) api = `https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`;
  else if (/x\.com|twitter\.com/.test(u)) api = `https://publish.twitter.com/oembed?omit_script=1&lang=id&url=${encodeURIComponent(u.replace("x.com", "twitter.com"))}`;
  if (!api) return undefined;
  try {
    const j = JSON.parse(await getText(api, 5000)) as { title?: string; author_name?: string; html?: string };
    const text = [j.title, j.html ? decode(j.html.replace(/<[^>]+>/g, " ")) : ""].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    return text || undefined;
  } catch {
    return undefined;
  }
}

async function newsSearch(q: string): Promise<VideoHit[]> {
  try {
    const xml = await getText(`https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&setlang=id&cc=ID`, 9000);
    const out: VideoHit[] = [];
    for (const it of xml.split("<item>").slice(1)) {
      const t = it.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "";
      let l = decode(it.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "");
      const u = l.match(/[?&]url=([^&]+)/);
      if (u) l = decodeURIComponent(u[1]);
      const desc = decode(it.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "").replace(/<[^>]+>/g, " ");
      const date = it.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1];
      if (/^https?:/.test(l)) out.push({ url: l, title: decode(t).trim(), desc, date });
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

type Origin = "search" | "source" | "related";
type Cand = { url: string; platform: string; text?: string; date?: string; origin: Origin; strongPage?: boolean };

export async function findMedia(input: { title: string; keyword?: string; tags?: string[]; sourceUrls?: string[] }, cfg?: MediaSettings): Promise<FoundMedia> {
  const m = cfg || (await getSettings()).media;
  const topic = topicOf(input.title, { keyword: input.keyword, tags: input.tags });
  // Kueri dibangun dari entitas kunci judul (nama diri, singkatan, angka, kata kunci utama)
  const base = searchQuery(input.title, { keyword: input.keyword, tags: input.tags }).slice(0, 120);
  const q = `${base} ${m.extraKeywords || ""}`.trim();
  const blocked = (m.blockedDomains || "").split(/[,\s]+/).map((d) => d.trim().toLowerCase()).filter(Boolean);
  const okHost = (u: string) => { try { const h = new URL(u).hostname.toLowerCase(); return !blocked.some((b) => h === b || h.endsWith(`.${b}`)); } catch { return false; } };
  const log: string[] = [`Kueri: "${q}"`];
  const t0 = Date.now();
  const cands = new Map<string, Cand>();
  const addCand = (u: string, origin: Origin, extra: Partial<Cand> = {}) => {
    const n = normSocial(u);
    const p = platformOf(n);
    if (!p || !m.platforms[p as keyof MediaSettings["platforms"]] || !okHost(n)) return;
    const prev = cands.get(n);
    if (prev) {
      // gabungkan informasi: teks dari pencarian, asal paling tepercaya
      if (!prev.text && extra.text) prev.text = extra.text;
      if (!prev.date && extra.date) prev.date = extra.date;
      if (origin === "source") prev.origin = "source";
      if (extra.strongPage) prev.strongPage = true;
      return;
    }
    cands.set(n, { url: n, platform: p, origin, ...extra });
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

  // 1) Halaman sumber artikel: og:image + postingan yang disematkan (tepercaya: artikel ditulis dari sini)
  const srcUrls = (input.sourceUrls || []).filter((u) => /^https?:/.test(u)).slice(0, 3);
  const pages = await Promise.all(srcUrls.map(async (u) => ({ u, html: await getText(u).catch(() => "") })));
  for (const { u, html } of pages) {
    if (!html) continue;
    socialLinks(html).slice(0, 8).forEach((x) => addCand(x, "source"));
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
    m.platforms.youtube && m.maxVideos ? searchYouTube(q, 10) : Promise.resolve([]),
    m.maxRefs ? newsSearch(q) : Promise.resolve([]),
  ]);
  for (const v of [...ytApi, ...ytScrape, ...webApi, ...vidApi] as VideoHit[]) addCand(v.url, "search", { text: `${v.title} ${v.desc || ""}`, date: v.date });

  // Referensi berita: hanya yang judulnya benar-benar membahas topik yang sama
  const srcHosts = new Set(srcUrls.map((u) => { try { return new URL(u).hostname; } catch { return ""; } }));
  const strongRefs = new Set<string>();
  let rejectedRefs = 0;
  for (const r of [...newsApi, ...newsFree] as VideoHit[]) {
    if (sources.length >= m.maxRefs) break;
    let h = "";
    try { h = new URL(r.url).hostname; } catch { continue; }
    if (!okHost(r.url) || srcHosts.has(h) || /(youtube|tiktok|instagram|facebook|x\.com|twitter|wikipedia|pinterest|msn\.com)/.test(h)) continue;
    const sc = scoreText(topic, `${r.title} ${r.desc || ""}`);
    if (!sc.pass) { rejectedRefs++; continue; }
    srcHosts.add(h);
    if (sc.shared >= 3 || sc.ratio >= 0.6) strongRefs.add(r.url);
    sources.push({ title: `${h.replace(/^www\./, "")}: ${r.title}`.slice(0, 160), url: r.url });
  }

  // 3) Berita terkait sering menyematkan video TikTok/Instagram/X — ambil juga dari sana
  const related = Date.now() - t0 < 30_000 ? await Promise.all(sources.map(async (s) => ({ u: s.url, html: await getText(s.url, 7000).catch(() => "") }))) : [];
  for (const { u, html } of related) {
    if (!html) continue;
    socialLinks(html).slice(0, 6).forEach((x) => addCand(x, "related", { strongPage: strongRefs.has(u) }));
    if (m.coverMode === "source" && !cover) {
      const img = meta(html, "og:image") || meta(html, "twitter:image");
      if (img) {
        const h = new URL(u).hostname.replace(/^www\./, "");
        await tryCover(new URL(img, u).toString(), input.title, `Foto: ${h}`);
        if (cover) log.push(`Sampul dari ${h}`);
      }
    }
  }

  // 4) Verifikasi: kandidat tanpa teks dicek judulnya lewat oEmbed publik (gratis)
  const noText = [...cands.values()].filter((c) => !c.text).slice(0, 12);
  if (noText.length && Date.now() - t0 < 45_000) {
    const texts = await Promise.all(noText.map((c) => oembedText(c.url)));
    noText.forEach((c, i) => { if (texts[i]) c.text = texts[i]; });
  }

  // 5) Saring ketat + urutkan (kecocokan kata kunci, lalu kebaruan)
  const accepted: { c: Cand; r: number }[] = [];
  let rejected = 0;
  for (const c of cands.values()) {
    if (c.text) {
      const sc = scoreText(topic, c.text);
      const age = ageDays(c.date);
      if (!sc.pass || tooOld(sc, age)) { rejected++; continue; }
      accepted.push({ c, r: rank(sc, age) + (c.origin === "source" ? 1 : 0) });
    } else if (c.origin === "source" || (c.origin === "related" && c.strongPage)) {
      // Tidak bisa dibaca teksnya (mis. Instagram/Facebook): hanya diterima bila disematkan
      // oleh halaman sumber artikel sendiri, atau berita terkait yang judulnya sangat cocok.
      accepted.push({ c, r: c.origin === "source" ? 1.5 : 0.5 });
    } else rejected++;
  }
  accepted.sort((a, b) => b.r - a.r);
  const videos: string[] = [];
  const social: string[] = [];
  for (const { c } of accepted) {
    if (c.platform === "youtube") { if (videos.length < m.maxVideos) videos.push(c.url); }
    else if (social.length < m.maxSocial) social.push(c.url);
  }

  // 6) Cadangan sampul: foto stok, lalu Wikimedia Commons
  if (m.coverMode !== "off") await stockCover();
  if (m.coverMode !== "off" && !cover && Date.now() - t0 < 40_000) {
    const c = await commonsImage(base);
    if (c) { await tryCover(c.url, c.alt || base, c.credit || "Wikimedia Commons"); if (cover) log.push("Sampul dari Wikimedia Commons"); }
  }
  log.push(`${videos.length} video YouTube, ${social.length} postingan sosial, ${sources.length} referensi`);
  if (rejected || rejectedRefs) log.push(`${rejected} video & ${rejectedRefs} referensi ditolak karena tidak cocok dengan judul`);
  if (!videos.length && !social.length) log.push("Tidak ada video yang cukup cocok — dibiarkan kosong");
  return { cover, embeds: [...videos, ...social], sources, log };
}

/** Lengkapi artikel yang sudah ada dengan media otomatis (tidak menimpa yang sudah diisi editor). */
export async function enrichArticle(id: string) {
  const a = await getArticle(id, true);
  if (!a) throw new Error("Artikel tidak ditemukan");
  const found = await findMedia({ title: a.title, keyword: a.seo?.focusKeyword, tags: a.tags, sourceUrls: a.sources.map((s) => s.url) });
  const embeds = Array.from(new Set([...(a.embeds || []), ...found.embeds]));
  const have = new Set(a.sources.map((s) => s.url));
  const sources = [...a.sources, ...found.sources.filter((s) => !have.has(s.url))];
  // Simpan hanya field yang berubah — artikel lain yang diedit bersamaan tidak tertimpa
  const art = await saveArticle({ cover: a.cover?.url ? a.cover : found.cover, embeds, sources }, id);
  return { article: art, found };
}
