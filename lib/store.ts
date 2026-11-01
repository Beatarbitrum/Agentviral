import "server-only";
import { readDoc, writeDoc, updateDoc, deleteDoc, readViews, incrementViews } from "./blob";
import type { Article, ArticleSummary, Category, SiteIndex, Settings, ApiKeyRecord, Tag } from "./types";
import { excerptOf, readingTime, slugify } from "./util";
import { randomId } from "./crypto";

export const DEFAULT_CATEGORIES: Category[] = [
  { slug: "viral", name: "Viral", description: "Kabar viral yang ramai diperbincangkan warganet." },
  { slug: "nasional", name: "Nasional", description: "Berita nasional terkini dari berbagai daerah." },
  { slug: "teknologi", name: "Teknologi", description: "Gawai, internet, aplikasi, dan inovasi digital." },
  { slug: "hiburan", name: "Hiburan", description: "Film, musik, dan dunia hiburan." },
  { slug: "olahraga", name: "Olahraga", description: "Kabar olahraga dalam dan luar negeri." },
  { slug: "lifestyle", name: "Lifestyle", description: "Gaya hidup, kesehatan, kuliner, dan wisata." },
  { slug: "unik", name: "Unik", description: "Cerita unik dan menarik dari seluruh penjuru." },
];

export const DEFAULT_SETTINGS: Settings = {
  siteName: "Agentviral",
  tagline: "Kabar Viral Terkini, Cepat dan Terverifikasi",
  description: "Agentviral menyajikan berita viral, nasional, teknologi, hiburan, olahraga, lifestyle, dan cerita unik secara cepat dan berimbang.",
  social: {},
  tickerText: "Selamat datang di Agentviral — portal kabar viral terkini.",
  contactEmail: "redaksi@agentviral.id",
  ai: { provider: "openai", model: "auto", autoPublish: false, autoGenerate: false, autoCount: 1 },
  media: {
    autoAfterAi: true,
    coverMode: "source",
    platforms: { youtube: true, tiktok: true, instagram: true, x: true, facebook: false },
    maxVideos: 2,
    maxSocial: 3,
    maxRefs: 3,
    extraKeywords: "",
    blockedDomains: "",
    providers: [],
  },
};

const EMPTY_INDEX: SiteIndex = { articles: [], categories: DEFAULT_CATEGORIES, tags: [] };

// ---------- index ----------
export async function getIndex(fresh = false): Promise<SiteIndex> {
  const { value } = await readDoc<SiteIndex>("index.json", EMPTY_INDEX, { fresh });
  return { ...EMPTY_INDEX, ...value };
}

export function isVisible(a: { status: string; publishAt: string }, now = Date.now()) {
  return a.status !== "draft" && new Date(a.publishAt).getTime() <= now;
}

export async function getPublished(): Promise<ArticleSummary[]> {
  const idx = await getIndex();
  const now = Date.now();
  return idx.articles.filter((a) => isVisible(a, now)).sort((a, b) => +new Date(b.publishAt) - +new Date(a.publishAt));
}

function summarize(a: Article): ArticleSummary {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { body, gallery, videos, embeds, sources, ...rest } = a;
  return { ...rest, readingTime: readingTime(body), hasProof: videos.length + embeds.length > 0 };
}

// ---------- articles ----------
export async function getArticle(id: string, fresh = false): Promise<Article | null> {
  if (!/^[A-Za-z0-9]+$/.test(id)) return null;
  const { value } = await readDoc<Article | null>(`articles/${id}.json`, null, { fresh });
  return value;
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const idx = await getIndex();
  const s = idx.articles.find((a) => a.slug === slug);
  return s ? getArticle(s.id) : null;
}

export async function findArticle(idOrSlug: string): Promise<Article | null> {
  const idx = await getIndex(true);
  const s = idx.articles.find((a) => a.id === idOrSlug || a.slug === idOrSlug);
  return s ? getArticle(s.id, true) : null;
}

export type ArticleInput = Partial<Omit<Article, "id" | "createdAt" | "updatedAt">>;

function normalize(input: ArticleInput, base?: Article): Article {
  const now = new Date().toISOString();
  const title = (input.title ?? base?.title ?? "").trim();
  if (!title) throw new Error("Judul wajib diisi");
  const body = input.body ?? base?.body ?? "";
  const status = (["draft", "published", "scheduled"].includes(String(input.status)) ? input.status : base?.status ?? "draft") as Article["status"];
  let publishAt = input.publishAt ?? base?.publishAt ?? now;
  if (isNaN(new Date(publishAt).getTime())) publishAt = now;
  publishAt = new Date(publishAt).toISOString();
  const arr = <T,>(v: T[] | undefined, b: T[] | undefined) => (Array.isArray(v) ? v : b ?? []);
  return {
    id: base?.id ?? randomId(),
    slug: slugify(input.slug || base?.slug || title) || randomId(),
    title,
    subtitle: input.subtitle ?? base?.subtitle ?? "",
    excerpt: (input.excerpt ?? base?.excerpt) || excerptOf(body),
    body,
    cover: input.cover !== undefined ? (input.cover?.url ? input.cover : undefined) : base?.cover,
    gallery: arr(input.gallery, base?.gallery).filter((g) => g && g.url),
    videos: arr(input.videos, base?.videos).filter((v) => v && v.url),
    embeds: arr(input.embeds, base?.embeds).map((e) => String(e).trim()).filter(Boolean),
    sources: arr(input.sources, base?.sources).filter((s) => s && s.url),
    category: slugify(input.category ?? base?.category ?? "viral") || "viral",
    tags: Array.from(new Set(arr(input.tags, base?.tags).map((t) => slugify(String(t))).filter(Boolean))).slice(0, 15),
    author: (input.author ?? base?.author ?? "Redaksi Agentviral").trim() || "Redaksi Agentviral",
    status,
    publishAt,
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
    featured: Boolean(input.featured ?? base?.featured ?? false),
    headline: Boolean(input.headline ?? base?.headline ?? false),
    breaking: Boolean(input.breaking ?? base?.breaking ?? false),
    seo: { ...(base?.seo ?? {}), ...(input.seo ?? {}) },
    demo: input.demo ?? base?.demo,
    aiGenerated: input.aiGenerated ?? base?.aiGenerated,
  };
}

function tagNameFromSlug(slug: string, raw: string[] | undefined) {
  const r = (raw || []).find((t) => slugify(t) === slug);
  return r ? r.trim() : slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function saveArticle(input: ArticleInput, id?: string): Promise<Article> {
  // Baca artikel & indeks secara paralel (dulu berurutan) — hemat satu round-trip ke database.
  const idxRead = readDoc<SiteIndex>("index.json", EMPTY_INDEX, { fresh: true });
  idxRead.catch(() => {}); // cegah unhandled rejection bila artikel tidak ditemukan
  const base = id ? await getArticle(id, true) : null;
  if (id && !base) throw new Error("Artikel tidak ditemukan");
  const art = normalize(input, base ?? undefined);
  await updateDoc<SiteIndex>("index.json", EMPTY_INDEX, (idx) => {
    idx.categories = idx.categories?.length ? idx.categories : DEFAULT_CATEGORIES;
    // unique slug
    let slug = art.slug;
    let n = 2;
    while (idx.articles.some((a) => a.slug === slug && a.id !== art.id)) slug = `${art.slug}-${n++}`;
    art.slug = slug;
    if (!idx.categories.some((c) => c.slug === art.category)) {
      idx.categories.push({ slug: art.category, name: art.category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) });
    }
    idx.tags = idx.tags || [];
    for (const t of art.tags) if (!idx.tags.some((x) => x.slug === t)) idx.tags.push({ slug: t, name: tagNameFromSlug(t, input.tags as string[]) });
    const s = summarize(art);
    const i = idx.articles.findIndex((a) => a.id === art.id);
    if (i >= 0) idx.articles[i] = s;
    else idx.articles.unshift(s);
    return idx;
  }, idxRead);
  await writeDoc(`articles/${art.id}.json`, art);
  return art;
}

export async function deleteArticle(id: string): Promise<boolean> {
  let found = false;
  await updateDoc<SiteIndex>("index.json", EMPTY_INDEX, (idx) => {
    found = idx.articles.some((a) => a.id === id);
    idx.articles = idx.articles.filter((a) => a.id !== id);
    return idx;
  });
  await deleteDoc(`articles/${id}.json`);
  return found;
}

export async function saveTaxonomy(categories: Category[], tags: Tag[]) {
  return updateDoc<SiteIndex>("index.json", EMPTY_INDEX, (idx) => {
    idx.categories = categories
      .map((c) => ({ slug: slugify(c.slug || c.name), name: (c.name || "").trim(), description: c.description || "" }))
      .filter((c) => c.slug && c.name);
    idx.tags = tags.map((t) => ({ slug: slugify(t.slug || t.name), name: (t.name || "").trim() })).filter((t) => t.slug && t.name);
    return idx;
  });
}

export async function markTrendDone(topic: string) {
  await updateDoc<SiteIndex>("index.json", EMPTY_INDEX, (idx) => {
    idx.trendsDone = [topic, ...(idx.trendsDone || []).filter((t) => t !== topic)].slice(0, 200);
    return idx;
  });
}

// ---------- settings ----------
export async function getSettings(fresh = false): Promise<Settings> {
  const { value } = await readDoc<Partial<Settings>>("settings.json", {}, { fresh });
  return { ...DEFAULT_SETTINGS, ...value, social: { ...DEFAULT_SETTINGS.social, ...(value.social || {}) }, ai: { ...DEFAULT_SETTINGS.ai, ...(value.ai || {}) }, media: { ...DEFAULT_SETTINGS.media, ...(value.media || {}), platforms: { ...DEFAULT_SETTINGS.media.platforms, ...(value.media?.platforms || {}) }, providers: value.media?.providers || [] } };
}

export async function updateSettings(fn: (s: Settings) => Settings) {
  return updateDoc<Partial<Settings>>("settings.json", {}, (cur) => {
    const full: Settings = { ...DEFAULT_SETTINGS, ...cur, social: { ...(cur.social || {}) }, ai: { ...DEFAULT_SETTINGS.ai, ...(cur.ai || {}) } };
    return fn(full);
  });
}

// ---------- api keys ----------
export async function getKeys(): Promise<ApiKeyRecord[]> {
  const { value } = await readDoc<ApiKeyRecord[]>("keys.json", []);
  return value;
}
export async function updateKeys(fn: (k: ApiKeyRecord[]) => ApiKeyRecord[]) {
  return updateDoc<ApiKeyRecord[]>("keys.json", [], fn);
}

// ---------- views (approximate, batched per instance) ----------
const pending = new Map<string, number>();
let lastFlush = Date.now();
const FLUSH_MS = 5 * 60 * 1000;

export async function getViews(): Promise<Record<string, number>> {
  return readViews();
}

export async function flushViews(force = false) {
  if (!pending.size) return;
  if (!force && Date.now() - lastFlush < FLUSH_MS) return;
  lastFlush = Date.now();
  const add = Object.fromEntries(pending);
  pending.clear();
  try {
    await incrementViews(add);
  } catch (e) {
    for (const [k, n] of Object.entries(add)) pending.set(k, (pending.get(k) || 0) + n);
    console.error("flushViews", e);
  }
}

export async function addView(id: string): Promise<number> {
  pending.set(id, (pending.get(id) || 0) + 1);
  const views = await getViews();
  const total = (views[id] || 0) + (pending.get(id) || 0);
  await flushViews();
  return total;
}
