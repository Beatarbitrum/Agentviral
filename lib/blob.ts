import "server-only";
// Storage layer on Supabase (Postgres + Storage). Kept the old function names so the rest
// of the app is unchanged. Public pages read through a per-instance cache; admin/write paths
// pass { fresh: true }. Pages themselves are ISR-cached, so readers rarely reach the DB.

const SB_URL = () => (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SB_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export const hasBlob = () => Boolean(SB_URL() && SB_KEY());
const BUCKET = "media";

export class DocConflictError extends Error {}

function hdr(extra: Record<string, string> = {}) {
  return { apikey: SB_KEY(), Authorization: `Bearer ${SB_KEY()}`, ...extra };
}

async function rest(path: string, init: RequestInit = {}) {
  const res = await fetch(`${SB_URL()}/rest/v1/${path}`, {
    ...init,
    headers: hdr({ "Content-Type": "application/json", ...(init.headers as Record<string, string>) }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

type Cached = { at: number; value: unknown; etag?: string };
const memo = new Map<string, Cached>();
const TTL = 120_000;

export async function readDoc<T>(name: string, fallback: T, opts: { fresh?: boolean } = {}): Promise<{ value: T; etag?: string }> {
  if (!hasBlob()) return { value: fallback };
  const c = memo.get(name);
  if (!opts.fresh && c && Date.now() - c.at < TTL) return { value: c.value as T, etag: c.etag };
  try {
    const rows = (await rest(`docs?name=eq.${encodeURIComponent(name)}&select=value,version`)) as { value: T; version: number }[];
    if (!rows?.length) {
      memo.set(name, { at: Date.now(), value: fallback, etag: "0" });
      return { value: fallback, etag: "0" };
    }
    const etag = String(rows[0].version);
    memo.set(name, { at: Date.now(), value: rows[0].value, etag });
    return { value: rows[0].value, etag };
  } catch (e) {
    const msg = String((e as Error)?.message || e);
    console.error("readDoc failed", name, msg);
    if (opts.fresh) throw new Error(`Gagal membaca data (${name}): ${msg}`);
    if (c) return { value: c.value as T, etag: c.etag };
    return { value: fallback };
  }
}

/** Write a doc. With ifMatch (a version string) the write only succeeds if unchanged. */
export async function writeDoc(name: string, value: unknown, ifMatch?: string): Promise<string | undefined> {
  if (!hasBlob()) throw new Error("Database Supabase belum terhubung (env kosong).");
  let version: number;
  if (ifMatch !== undefined) {
    version = Number(await rest("rpc/cas_doc", { method: "POST", body: JSON.stringify({ p_name: name, p_value: value, p_version: Number(ifMatch) || 0 }) }));
    if (version < 0) throw new DocConflictError("conflict");
  } else {
    const rows = (await rest("docs?on_conflict=name", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ name, value, updated_at: new Date().toISOString() }),
    })) as { version: number }[];
    version = rows?.[0]?.version ?? 1;
  }
  const etag = String(version);
  memo.set(name, { at: Date.now(), value, etag });
  return etag;
}

/** Read-modify-write with optimistic concurrency, retried. */
export async function updateDoc<T>(name: string, fallback: T, fn: (cur: T) => T | Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { value, etag } = await readDoc<T>(name, fallback, { fresh: true });
    const next = await fn(structuredClone(value));
    try {
      await writeDoc(name, next, etag ?? "0");
      return next;
    } catch (e) {
      if (e instanceof DocConflictError) {
        await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
  throw new Error("Gagal menyimpan: konflik penulisan berulang, coba lagi.");
}

export async function deleteDoc(name: string) {
  if (!hasBlob()) return;
  memo.delete(name);
  try {
    await rest(`docs?name=eq.${encodeURIComponent(name)}`, { method: "DELETE" });
  } catch {
    /* ignore */
  }
}

// ---------- views ----------
let viewsCache: { at: number; value: Record<string, number> } | null = null;
export async function readViews(): Promise<Record<string, number>> {
  if (!hasBlob()) return {};
  if (viewsCache && Date.now() - viewsCache.at < TTL) return viewsCache.value;
  try {
    const rows = (await rest("views?select=id,n")) as { id: string; n: number }[];
    const value = Object.fromEntries(rows.map((r) => [r.id, Number(r.n)]));
    viewsCache = { at: Date.now(), value };
    return value;
  } catch (e) {
    console.error("readViews", e);
    return viewsCache?.value || {};
  }
}
export async function incrementViews(items: Record<string, number>) {
  if (!hasBlob() || !Object.keys(items).length) return;
  await rest("rpc/add_views", { method: "POST", body: JSON.stringify({ items }) });
}

// ---------- media (Supabase Storage, public bucket) ----------
const PUBLIC_PREFIX = () => `${SB_URL()}/storage/v1/object/public/${BUCKET}/`;
export const isOwnMedia = (url: string) => Boolean(SB_URL()) && url.startsWith(PUBLIC_PREFIX());

function withSuffix(pathname: string) {
  const rnd = Math.random().toString(36).slice(2, 10);
  const m = pathname.match(/^(.*?)(\.[a-z0-9]+)?$/i)!;
  return `${m[1]}-${rnd}${m[2] || ""}`;
}

export async function putMedia(pathname: string, body: string | Buffer | Blob, contentType: string) {
  const path = withSuffix(pathname);
  const res = await fetch(`${SB_URL()}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: hdr({ "Content-Type": contentType, "cache-control": "max-age=31536000", "x-upsert": "false" }),
    body: body as BodyInit,
  });
  if (!res.ok) throw new Error(`Upload gagal ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return PUBLIC_PREFIX() + path;
}

/** Signed URL so the browser uploads straight to Storage (admin only). */
export async function signUpload(pathname: string) {
  const path = withSuffix(pathname);
  const res = await fetch(`${SB_URL()}/storage/v1/object/upload/sign/${BUCKET}/${path}`, { method: "POST", headers: hdr({ "Content-Type": "application/json" }), body: "{}" });
  if (!res.ok) throw new Error(`Gagal menyiapkan upload ${res.status}`);
  const j = (await res.json()) as { url: string };
  return { uploadUrl: `${SB_URL()}/storage/v1${j.url}`, publicUrl: PUBLIC_PREFIX() + path };
}

type ListItem = { name: string; id: string | null; created_at?: string; metadata?: { size?: number } | null };
async function listDir(prefix: string): Promise<ListItem[]> {
  const res = await fetch(`${SB_URL()}/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: hdr({ "Content-Type": "application/json" }),
    body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: "created_at", order: "desc" } }),
  });
  if (!res.ok) return [];
  return (await res.json()) as ListItem[];
}

export async function listMedia(cursor?: string) {
  void cursor;
  const out: { url: string; pathname: string; size: number; uploadedAt: Date }[] = [];
  const walk = async (dir: string, depth: number) => {
    for (const it of await listDir(dir)) {
      const p = `${dir}/${it.name}`;
      if (it.id === null) {
        if (depth < 3) await walk(p, depth + 1);
      } else out.push({ url: PUBLIC_PREFIX() + p, pathname: p, size: it.metadata?.size || 0, uploadedAt: new Date(it.created_at || Date.now()) });
    }
  };
  await walk("media", 0);
  out.sort((a, b) => +b.uploadedAt - +a.uploadedAt);
  return { blobs: out.slice(0, 500), cursor: undefined as string | undefined, hasMore: false };
}

export async function deleteMedia(url: string) {
  if (!isOwnMedia(url)) throw new Error("URL media tidak valid");
  const path = url.slice(PUBLIC_PREFIX().length);
  const res = await fetch(`${SB_URL()}/storage/v1/object/${BUCKET}`, { method: "DELETE", headers: hdr({ "Content-Type": "application/json" }), body: JSON.stringify({ prefixes: [path] }) });
  if (!res.ok) throw new Error(`Hapus gagal ${res.status}`);
}
