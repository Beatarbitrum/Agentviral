import "server-only";
import { decrypt } from "./crypto";
import type { MediaProvider, MediaProviderType } from "./types";

// Penyedia pencarian media. Untuk menambah penyedia baru: tambahkan tipe di lib/types.ts,
// lalu satu entri di PROVIDERS di bawah (cukup isi fungsi yang didukung).

export type Hit = { url: string; title: string };
export type Photo = { url: string; credit: string; alt: string; hotlinkOnly?: boolean };

export interface ProviderImpl {
  label: string;
  help: string;
  signup: string;
  web?: (key: string, q: string) => Promise<Hit[]>;
  news?: (key: string, q: string) => Promise<Hit[]>;
  videos?: (key: string, q: string) => Promise<Hit[]>;
  photos?: (key: string, q: string) => Promise<Photo[]>;
}

const T = 9000;
async function j(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(T) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 160)}`);
  return JSON.parse(text);
}

export const PROVIDERS: Record<MediaProviderType, ProviderImpl> = {
  brave: {
    label: "Brave Search",
    help: "Cari postingan TikTok/Instagram/X/Facebook, video, dan berita terkait.",
    signup: "https://brave.com/search/api/",
    web: async (k, q) => {
      const d = await j(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=10&country=id&search_lang=id`, { headers: { accept: "application/json", "x-subscription-token": k } });
      return (d.web?.results || []).map((r: { url: string; title: string }) => ({ url: r.url, title: r.title }));
    },
    news: async (k, q) => {
      const d = await j(`https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(q)}&count=10&country=id&search_lang=id`, { headers: { accept: "application/json", "x-subscription-token": k } });
      return (d.results || []).map((r: { url: string; title: string }) => ({ url: r.url, title: r.title }));
    },
    videos: async (k, q) => {
      const d = await j(`https://api.search.brave.com/res/v1/videos/search?q=${encodeURIComponent(q)}&count=10&country=id&search_lang=id`, { headers: { accept: "application/json", "x-subscription-token": k } });
      return (d.results || []).map((r: { url: string; title: string }) => ({ url: r.url, title: r.title }));
    },
  },
  serper: {
    label: "Serper (Google Search)",
    help: "Hasil Google: postingan sosial, video, berita, dan gambar.",
    signup: "https://serper.dev",
    web: async (k, q) => {
      const d = await j("https://google.serper.dev/search", { method: "POST", headers: { "x-api-key": k, "content-type": "application/json" }, body: JSON.stringify({ q, gl: "id", hl: "id", num: 10 }) });
      return (d.organic || []).map((r: { link: string; title: string }) => ({ url: r.link, title: r.title }));
    },
    news: async (k, q) => {
      const d = await j("https://google.serper.dev/news", { method: "POST", headers: { "x-api-key": k, "content-type": "application/json" }, body: JSON.stringify({ q, gl: "id", hl: "id", num: 10 }) });
      return (d.news || []).map((r: { link: string; title: string }) => ({ url: r.link, title: r.title }));
    },
    videos: async (k, q) => {
      const d = await j("https://google.serper.dev/videos", { method: "POST", headers: { "x-api-key": k, "content-type": "application/json" }, body: JSON.stringify({ q, gl: "id", hl: "id", num: 10 }) });
      return (d.videos || []).map((r: { link: string; title: string }) => ({ url: r.link, title: r.title }));
    },
  },
  youtube: {
    label: "YouTube Data API",
    help: "Pencarian video YouTube resmi (tanpa API pun YouTube tetap dicari otomatis).",
    signup: "https://console.cloud.google.com/apis/library/youtube.googleapis.com",
    videos: async (k, q) => {
      const after = new Date(Date.now() - 60 * 864e5).toISOString();
      const d = await j(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=6&regionCode=ID&relevanceLanguage=id&publishedAfter=${after}&q=${encodeURIComponent(q)}&key=${k}`);
      return (d.items || []).map((r: { id: { videoId: string }; snippet: { title: string } }) => ({ url: `https://www.youtube.com/watch?v=${r.id.videoId}`, title: r.snippet.title }));
    },
  },
  pexels: {
    label: "Pexels",
    help: "Foto stok gratis bebas royalti untuk sampul.",
    signup: "https://www.pexels.com/api/",
    photos: async (k, q) => {
      const d = await j(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=5&orientation=landscape&locale=id-ID`, { headers: { authorization: k } });
      return (d.photos || []).map((p: { src: { large2x: string }; photographer: string; alt: string }) => ({ url: p.src.large2x, credit: `Foto: ${p.photographer} / Pexels`, alt: p.alt || q }));
    },
  },
  unsplash: {
    label: "Unsplash",
    help: "Foto stok gratis berkualitas tinggi (gambar ditautkan langsung sesuai aturan Unsplash).",
    signup: "https://unsplash.com/developers",
    photos: async (k, q) => {
      const d = await j(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=5&orientation=landscape`, { headers: { authorization: `Client-ID ${k}` } });
      return (d.results || []).map((p: { urls: { regular: string }; user: { name: string }; alt_description?: string }) => ({ url: p.urls.regular, credit: `Foto: ${p.user.name} / Unsplash`, alt: p.alt_description || q, hotlinkOnly: true }));
    },
  },
  pixabay: {
    label: "Pixabay",
    help: "Foto stok gratis untuk sampul.",
    signup: "https://pixabay.com/api/docs/",
    photos: async (k, q) => {
      const d = await j(`https://pixabay.com/api/?key=${k}&q=${encodeURIComponent(q.slice(0, 100))}&image_type=photo&orientation=horizontal&per_page=5&lang=id&safesearch=true`);
      return (d.hits || []).map((p: { largeImageURL: string; user: string; tags: string }) => ({ url: p.largeImageURL, credit: `Foto: ${p.user} / Pixabay`, alt: p.tags || q }));
    },
  },
};

export function activeProviders(list: MediaProvider[]) {
  return list
    .filter((p) => p.enabled && p.tokenEnc && PROVIDERS[p.type])
    .map((p) => ({ ...p, key: decrypt(p.tokenEnc) || "", impl: PROVIDERS[p.type] }))
    .filter((p) => p.key);
}

/** Jalankan fungsi tertentu di semua penyedia aktif yang mendukungnya, gabungkan hasilnya. */
export async function runAll<K extends "web" | "news" | "videos" | "photos">(list: MediaProvider[], fn: K, q: string, log?: string[]) {
  const ps = activeProviders(list).filter((p) => p.impl[fn]);
  const res = await Promise.all(
    ps.map(async (p) => {
      try {
        return (await (p.impl[fn] as (k: string, q: string) => Promise<unknown[]>)(p.key, q)) as K extends "photos" ? Photo[] : Hit[];
      } catch (e) {
        log?.push(`${p.name}: ${(e as Error).message.slice(0, 80)}`);
        return [] as unknown as K extends "photos" ? Photo[] : Hit[];
      }
    }),
  );
  return res.flat() as (K extends "photos" ? Photo : Hit)[];
}

export async function testProvider(p: MediaProvider) {
  const key = decrypt(p.tokenEnc);
  if (!key) throw new Error("Token belum diisi");
  const impl = PROVIDERS[p.type];
  const fn = impl.photos || impl.videos || impl.news || impl.web;
  if (!fn) throw new Error("Penyedia tidak mendukung pencarian");
  const r = await (fn as (k: string, q: string) => Promise<unknown[]>)(key, "Indonesia");
  return r.length;
}
