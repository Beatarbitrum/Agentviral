"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { api, slugifyClient } from "./client";
import Uploader from "./Uploader";
import { Spinner } from "./ui";
import { EditorSkeleton } from "./Skeletons";
import type { Article, Category, MediaRef, VideoRef } from "@/lib/types";

type Form = Omit<Article, "id" | "createdAt" | "updatedAt" | "tags"> & { tagsText: string; embedsText: string; sourcesText: string };

const empty = (): Form => ({
  slug: "",
  title: "",
  subtitle: "",
  excerpt: "",
  body: "",
  cover: { url: "", alt: "", caption: "", credit: "" },
  gallery: [],
  videos: [],
  embeds: [],
  sources: [],
  category: "viral",
  author: "Redaksi Agentviral",
  status: "draft",
  publishAt: new Date().toISOString(),
  featured: false,
  headline: false,
  breaking: false,
  seo: { metaTitle: "", metaDescription: "", focusKeyword: "" },
  tagsText: "",
  embedsText: "",
  sourcesText: "",
});

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function seoChecks(f: Form) {
  const kw = (f.seo.focusKeyword || "").toLowerCase().trim();
  const title = (f.seo.metaTitle || f.title).toLowerCase();
  const desc = (f.seo.metaDescription || "").toLowerCase();
  const words = f.body.split(/\s+/).filter(Boolean).length;
  const firstPara = f.body.replace(/^>.*$/gm, "").trim().split(/\n\s*\n/)[0]?.toLowerCase() || "";
  const checks: [string, boolean][] = [
    ["Kata kunci utama diisi", Boolean(kw)],
    ["Kata kunci ada di judul", Boolean(kw) && title.includes(kw)],
    ["Kata kunci ada di meta description", Boolean(kw) && desc.includes(kw)],
    ["Kata kunci ada di paragraf pertama", Boolean(kw) && firstPara.includes(kw)],
    ["Kata kunci ada di slug", Boolean(kw) && (f.slug || slugifyClient(f.title)).includes(slugifyClient(kw))],
    ["Panjang judul SEO 30–70 karakter", title.length >= 30 && title.length <= 70],
    ["Meta description 120–160 karakter", desc.length >= 120 && desc.length <= 160],
    ["Isi minimal 300 kata", words >= 300],
    ["Ada subjudul (##)", /^##\s/m.test(f.body)],
    ["Gambar cover + alt text", Boolean(f.cover?.url && f.cover?.alt)],
    ["Ada tautan / sumber", /\]\(https?:/.test(f.body) || f.sourcesText.trim().length > 0],
    ["Ada tag", f.tagsText.trim().length > 0],
  ];
  return { checks, score: Math.round((checks.filter((c) => c[1]).length / checks.length) * 100), words };
}

function toForm(a: Article): Form {
  return {
    ...empty(),
    ...a,
    cover: a.cover || { url: "", alt: "", caption: "", credit: "" },
    seo: { metaTitle: "", metaDescription: "", focusKeyword: "", ...a.seo },
    tagsText: a.tags.join(", "),
    embedsText: a.embeds.join("\n"),
    sourcesText: a.sources.map((s) => `${s.title} | ${s.url}`).join("\n"),
  };
}

export default function Editor({ id, initial, categories }: { id?: string; initial?: Article; categories?: Category[] }) {
  // Data awal dikirim dari server (tanpa fetch tambahan di HP) — editor langsung bisa dipakai.
  const [f, setF] = useState<Form>(() => (initial ? toForm(initial) : empty()));
  const [cats, setCats] = useState<Category[]>(categories || []);
  const [loading, setLoading] = useState(Boolean(id) && !initial);
  const [saving, setSaving] = useState<"" | "draft" | "publish">("");
  const savingRef = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [preview, setPreview] = useState(false);
  const [aiBusy, setAiBusy] = useState("");
  const [titleOpts, setTitleOpts] = useState<string[]>([]);
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const [savedId, setSavedId] = useState(id);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!categories) api("/api/admin/articles").then((r) => setCats(r.categories)).catch(() => {});
    if (id && !initial)
      api(`/api/admin/articles/${id}`)
        .then(({ article: a }: { article: Article }) => setF(toForm(a)))
        .catch((e) => setMsg({ t: e.message, ok: false }))
        .finally(() => setLoading(false));
  }, [id, initial, categories]);

  // Peringatkan bila keluar halaman sebelum menyimpan
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // Hilangkan pesan sukses otomatis
  useEffect(() => {
    if (!msg?.ok || aiBusy) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg, aiBusy]);

  const upd = (fn: (p: Form) => Form) => { setDirty(true); setF(fn); };
  const set = <K extends keyof Form>(k: K, v: Form[K]) => upd((p) => ({ ...p, [k]: v }));

  // Ctrl/Cmd+S = simpan draf
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save("draft"); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });
  const seo = useMemo(() => seoChecks(f), [f]);

  function insert(before: string, after = "", ph = "teks") {
    const el = bodyRef.current;
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const sel = f.body.slice(s, e) || ph;
    const next = f.body.slice(0, s) + before + sel + after + f.body.slice(e);
    set("body", next);
    setTimeout(() => { el.focus(); el.selectionStart = s + before.length; el.selectionEnd = s + before.length + sel.length; }, 0);
  }

  const save = useCallback(async function save(statusOverride?: Form["status"]) {
    if (savingRef.current) return; // cegah ketuk ganda
    savingRef.current = true;
    setSaving(statusOverride === "draft" ? "draft" : "publish");
    setMsg(null);
    try {
      const status = statusOverride || f.status;
      const payload = {
        ...f,
        status,
        slug: f.slug || slugifyClient(f.title),
        tags: f.tagsText.split(",").map((t) => t.trim()).filter(Boolean),
        embeds: f.embedsText.split("\n").map((t) => t.trim()).filter(Boolean),
        sources: f.sourcesText.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
          const [a, b] = l.includes("|") ? l.split("|").map((x) => x.trim()) : ["", l];
          return { title: a || (b ? new URL(b).hostname : ""), url: b };
        }),
        cover: f.cover?.url ? f.cover : null,
      };
      const r = savedId ? await api(`/api/admin/articles/${savedId}`, "PUT", payload) : await api("/api/admin/articles", "POST", payload);
      setF((p) => ({ ...p, status, slug: r.article.slug }));
      setDirty(false);
      setMsg({ t: status === "draft" ? "Draf tersimpan ✓" : new Date(r.article.publishAt) > new Date() ? "Terjadwal ✓" : "Tersimpan & terbit ✓", ok: true });
      if (!savedId) {
        setSavedId(r.article.id);
        window.history.replaceState(null, "", `/admin/artikel/${r.article.id}`);
      }
    } catch (e) {
      setMsg({ t: (e as Error).message, ok: false });
    } finally {
      savingRef.current = false;
      setSaving("");
    }
  }, [f, savedId]);

  async function ai(action: string) {
    setAiBusy(action);
    setMsg(null);
    try {
      const r = await api("/api/admin/ai", "POST", { action, title: f.title, body: f.body });
      if (action === "improve_title") setTitleOpts(Array.isArray(r.result) ? r.result : [String(r.result)]);
      if (action === "meta_description") setF((p) => ({ ...p, seo: { ...p.seo, metaDescription: String(r.result).slice(0, 160) } }));
      if (action === "suggest_tags") set("tagsText", (Array.isArray(r.result) ? r.result : String(r.result).split(",")).join(", "));
      if (action === "summary") set("excerpt", String(r.result));
    } catch (e) {
      setMsg({ t: (e as Error).message, ok: false });
    } finally {
      setAiBusy("");
    }
  }

  async function findMedia() {
    setAiBusy("media");
    setMsg({ t: "🔎 Mencari foto, video & sumber…", ok: true });
    try {
      const sourceUrls = f.sourcesText.split("\n").map((l) => (l.includes("|") ? l.split("|").pop()! : l).trim()).filter((u) => /^https?:/.test(u));
      const r = await api("/api/admin/ai", "POST", { action: "find_media", title: f.title, keyword: f.seo.focusKeyword, tags: f.tagsText.split(",").map((t) => t.trim()).filter(Boolean), sourceUrls });
      setF((p) => {
        const em = new Set(p.embedsText.split("\n").map((t) => t.trim()).filter(Boolean));
        (r.embeds as string[]).forEach((e) => em.add(e));
        const srcLines = p.sourcesText.split("\n").map((t) => t.trim()).filter(Boolean);
        for (const s of r.sources as { title: string; url: string }[]) if (!p.sourcesText.includes(s.url)) srcLines.push(`${s.title} | ${s.url}`);
        return { ...p, cover: p.cover?.url ? p.cover : r.cover || p.cover, embedsText: [...em].join("\n"), sourcesText: srcLines.join("\n") };
      });
      setMsg({ t: `✓ ${r.cover ? "Sampul" : "Tanpa sampul"} · ${r.embeds.length} video · ${r.sources.length} sumber — tinjau lalu simpan`, ok: true });
    } catch (e) {
      setMsg({ t: (e as Error).message, ok: false });
    } finally {
      setAiBusy("");
    }
  }

  if (loading) return <EditorSkeleton />;
  const AiBtn = ({ a, t }: { a: string; t: string }) => (
    <button type="button" className="btn btn-ghost btn-sm" disabled={!!aiBusy} onClick={() => ai(a)}>{aiBusy === a ? <><Spinner /> Memproses…</> : `✨ ${t}`}</button>
  );

  const publishLabel = new Date(f.publishAt).getTime() > Date.now() + 60000 ? "Jadwalkan" : "Terbitkan";
  const actions = (
    <>
      <button type="button" className="btn btn-ghost" disabled={!!aiBusy || !f.title} onClick={findMedia} aria-label="Cari media otomatis" title="Cari media otomatis">
        {aiBusy === "media" ? <Spinner /> : "🔎"}<span className="hidden sm:inline">{aiBusy === "media" ? "Mencari…" : "Cari media"}</span>
      </button>
      <button type="button" className="btn btn-ghost" disabled={!!saving} onClick={() => save("draft")}>
        {saving === "draft" ? <><Spinner /> Menyimpan…</> : "Simpan Draf"}
      </button>
      <button type="button" className="btn btn-primary" disabled={!!saving} onClick={() => save(publishLabel === "Jadwalkan" ? "scheduled" : "published")}>
        {saving === "publish" ? <><Spinner /> Menyimpan…</> : publishLabel}
      </button>
    </>
  );

  return (
    <div className="space-y-4 pb-28 lg:pb-0">
      <div className="sticky top-0 z-20 -mx-3 flex flex-wrap items-center justify-between gap-2 border-b bg-neutral-100/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6">
        <h1 className="text-lg font-black sm:text-xl">{savedId ? "Edit Artikel" : "Tulis Artikel"}{dirty && <span className="ml-2 align-middle text-xs font-semibold text-amber-600">● belum disimpan</span>}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {msg && <span role="status" className={`hidden text-sm lg:inline ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.t}</span>}
          {savedId && f.status !== "draft" && <a className="btn btn-ghost btn-sm sm:min-h-10" target="_blank" href={`/berita/${f.slug}`}>Lihat ↗</a>}
          <div className="hidden items-center gap-2 lg:flex">{actions}</div>
        </div>
      </div>
      {/* HP: bilah simpan menempel di bawah layar, mudah dijangkau jempol */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 px-3 pt-2 shadow-[0_-4px_16px_rgba(0,0,0,.08)] backdrop-blur lg:hidden">
        {msg && <p role="status" className={`mb-1 line-clamp-2 text-xs ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.t}</p>}
        <div className="grid grid-cols-[auto_1fr_1fr] gap-2">{actions}</div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="card space-y-3">
            <div>
              <div className="flex items-center justify-between"><label className="admin-label">Judul</label><AiBtn a="improve_title" t="Perbaiki judul" /></div>
              <input className="admin-input text-lg font-bold" value={f.title} onChange={(e) => { set("title", e.target.value); if (!slugTouched) set("slug", slugifyClient(e.target.value)); }} placeholder="Judul berita" />
              {titleOpts.length > 0 && (
                <div className="mt-2 space-y-1 rounded bg-purple-50 p-2 text-sm">
                  {titleOpts.map((t) => <button key={t} type="button" className="block min-h-11 w-full rounded px-2 py-2 text-left hover:text-red-700 active:bg-purple-100 sm:min-h-0" onClick={() => { set("title", t); setTitleOpts([]); }}>→ {t}</button>)}
                </div>
              )}
            </div>
            <div><label className="admin-label">Subjudul</label><input className="admin-input" value={f.subtitle} onChange={(e) => set("subtitle", e.target.value)} /></div>
            <div>
              <div className="flex items-center justify-between"><label className="admin-label">Ringkasan / Excerpt</label><AiBtn a="summary" t="Buat ringkasan" /></div>
              <textarea className="admin-input" rows={2} value={f.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
            </div>
          </div>

          <div className="card space-y-2">
            <div className="flex flex-wrap items-center gap-1">
              <label className="admin-label mb-0 mr-2 w-full sm:w-auto">Isi (Markdown)</label>
              {[["B", "**", "**"], ["I", "_", "_"], ["H2", "\n## ", "\n"], ["H3", "\n### ", "\n"], ["❝", "\n> ", "\n"], ["• List", "\n- ", ""], ["🔗", "[", "](https://)"]].map(([t, b, a]) => (
                <button key={t} type="button" className="tap border px-2 text-xs font-bold hover:bg-neutral-100" onClick={() => insert(b, a)}>{t}</button>
              ))}
              <Uploader label="Gambar di isi" onUploaded={(u) => u.forEach((x) => insert(`\n![${x.name}](${x.url} "Keterangan foto")\n`, "", ""))} />
              <button type="button" className="tap ml-auto border px-3 text-xs" onClick={() => setPreview(!preview)}>{preview ? "✏️ Edit" : "👁 Pratinjau"}</button>
            </div>
            {preview ? (
              <div className="prose-av min-h-[400px] rounded border p-4" dangerouslySetInnerHTML={{ __html: marked.parse(f.body.replace(/</g, "&lt;"), { async: false }) as string }} />
            ) : (
              <textarea ref={bodyRef} className="admin-input min-h-[420px] font-mono text-[13px] leading-relaxed" value={f.body} onChange={(e) => set("body", e.target.value)} placeholder="Tulis isi berita… Gunakan ## untuk subjudul." />
            )}
            <p className="text-xs text-neutral-500">{seo.words} kata · ±{Math.max(1, Math.round(seo.words / 200))} menit baca</p>
          </div>

          <div className="card space-y-3">
            <h2 className="font-bold">🖼️ Cover</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Uploader label="Unggah cover" onUploaded={(u) => upd((p) => ({ ...p, cover: { ...(p.cover as MediaRef), url: u[0].url, alt: p.cover?.alt || p.title } }))} />
              <input className="admin-input flex-1" placeholder="…atau tempel URL gambar" value={f.cover?.url || ""} onChange={(e) => upd((p) => ({ ...p, cover: { ...(p.cover as MediaRef), url: e.target.value } }))} />
            </div>
            {f.cover?.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.cover.url} alt="" className="max-h-56 rounded" />
            )}
            <div className="grid gap-2 sm:grid-cols-3">
              <input className="admin-input" placeholder="Alt text (wajib untuk SEO)" value={f.cover?.alt || ""} onChange={(e) => upd((p) => ({ ...p, cover: { ...(p.cover as MediaRef), alt: e.target.value } }))} />
              <input className="admin-input" placeholder="Keterangan foto" value={f.cover?.caption || ""} onChange={(e) => upd((p) => ({ ...p, cover: { ...(p.cover as MediaRef), caption: e.target.value } }))} />
              <input className="admin-input" placeholder="Kredit foto" value={f.cover?.credit || ""} onChange={(e) => upd((p) => ({ ...p, cover: { ...(p.cover as MediaRef), credit: e.target.value } }))} />
            </div>
          </div>

          <div className="card space-y-3">
            <div className="flex items-center justify-between"><h2 className="font-bold">📷 Galeri</h2><Uploader multiple label="Tambah foto" onUploaded={(u) => set("gallery", [...f.gallery, ...u.map((x) => ({ url: x.url, alt: "", caption: "" }))])} /></div>
            {f.gallery.map((g, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 border-b pb-2 sm:flex-nowrap sm:border-0 sm:pb-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.url} alt="" className="h-14 w-20 rounded object-cover" />
                <input className="admin-input" placeholder="Alt text" value={g.alt || ""} onChange={(e) => set("gallery", f.gallery.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
                <input className="admin-input" placeholder="Keterangan" value={g.caption || ""} onChange={(e) => set("gallery", f.gallery.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} />
                <button type="button" aria-label="Hapus foto" className="tap shrink-0 text-red-700" onClick={() => set("gallery", f.gallery.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </div>

          <div className="card space-y-3 border-2 border-red-200">
            <h2 className="font-bold text-red-700">📹 Fakta Lapangan</h2>
            <div className="flex items-center justify-between"><span className="text-sm font-semibold">Video unggahan</span><Uploader accept="video/*" multiple label="Unggah video" onUploaded={(u) => set("videos", [...f.videos, ...u.map((x) => ({ url: x.url, title: x.name }))])} /></div>
            {f.videos.map((v: VideoRef, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 border-b pb-2 sm:flex-nowrap sm:border-0 sm:pb-0">
                <video src={v.url} className="h-14 w-24 rounded bg-black" preload="metadata" />
                <input className="admin-input" placeholder="Judul/keterangan video" value={v.title || ""} onChange={(e) => set("videos", f.videos.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                <button type="button" aria-label="Hapus video" className="tap shrink-0 text-red-700" onClick={() => set("videos", f.videos.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <div>
              <label className="admin-label">URL sematan (satu per baris) — YouTube, TikTok, Instagram, X/Twitter, Facebook</label>
              <textarea className="admin-input font-mono text-xs" rows={3} value={f.embedsText} onChange={(e) => set("embedsText", e.target.value)} placeholder="https://www.tiktok.com/@akun/video/123…" />
            </div>
          </div>

          <div className="card">
            <label className="admin-label">Sumber (satu per baris: Judul | URL)</label>
            <textarea className="admin-input font-mono text-xs" rows={3} value={f.sourcesText} onChange={(e) => set("sourcesText", e.target.value)} placeholder="Kompas | https://…" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="card space-y-3">
            <h2 className="font-bold">Publikasi</h2>
            <div>
              <label className="admin-label">Status</label>
              <select className="admin-input" value={f.status} onChange={(e) => set("status", e.target.value as Form["status"])}>
                <option value="draft">Draf</option><option value="published">Terbit</option><option value="scheduled">Terjadwal</option>
              </select>
            </div>
            <div>
              <label className="admin-label">Waktu terbit (zona waktu perangkat Anda)</label>
              <input type="datetime-local" className="admin-input" value={toLocalInput(f.publishAt)} onChange={(e) => e.target.value && set("publishAt", new Date(e.target.value).toISOString())} />
            </div>
            <div className="space-y-1 text-sm">
              {([["headline", "Headline (hero beranda)"], ["breaking", "Breaking news (ticker)"], ["featured", "Featured / pilihan redaksi"]] as const).map(([k, t]) => (
                <label key={k} className="admin-check"><input type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} /> {t}</label>
              ))}
            </div>
            <div>
              <label className="admin-label">Kategori</label>
              <select className="admin-input" value={f.category} onChange={(e) => set("category", e.target.value)}>
                {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between"><label className="admin-label">Tag (pisahkan koma)</label><AiBtn a="suggest_tags" t="Saran tag" /></div>
              <input className="admin-input" value={f.tagsText} onChange={(e) => set("tagsText", e.target.value)} />
            </div>
            <div><label className="admin-label">Penulis</label><input className="admin-input" value={f.author} onChange={(e) => set("author", e.target.value)} /></div>
          </div>

          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">SEO</h2>
              <span className={`rounded px-2 py-0.5 text-sm font-black text-white ${seo.score >= 75 ? "bg-green-600" : seo.score >= 50 ? "bg-amber-500" : "bg-red-600"}`}>{seo.score}/100</span>
            </div>
            <div><label className="admin-label">Slug</label><input className="admin-input font-mono text-xs" value={f.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugifyClient(e.target.value)); }} /></div>
            <div><label className="admin-label">Kata kunci utama</label><input className="admin-input" value={f.seo.focusKeyword || ""} onChange={(e) => set("seo", { ...f.seo, focusKeyword: e.target.value })} /></div>
            <div><label className="admin-label">Meta title ({(f.seo.metaTitle || f.title).length})</label><input className="admin-input" value={f.seo.metaTitle || ""} placeholder={f.title} onChange={(e) => set("seo", { ...f.seo, metaTitle: e.target.value })} /></div>
            <div>
              <div className="flex items-center justify-between"><label className="admin-label">Meta description ({(f.seo.metaDescription || "").length})</label><AiBtn a="meta_description" t="Tulis" /></div>
              <textarea className="admin-input" rows={3} value={f.seo.metaDescription || ""} onChange={(e) => set("seo", { ...f.seo, metaDescription: e.target.value })} />
            </div>
            <ul className="space-y-0.5 text-xs">
              {seo.checks.map(([t, ok]) => <li key={t} className={ok ? "text-green-700" : "text-neutral-500"}>{ok ? "✔" : "○"} {t}</li>)}
            </ul>
            <div className="rounded border bg-white p-2 text-xs">
              <p className="text-neutral-500">Pratinjau Google:</p>
              <p className="truncate text-[15px] text-blue-800">{f.seo.metaTitle || f.title || "Judul"}</p>
              <p className="truncate text-green-700">{typeof window !== "undefined" ? window.location.host : ""}/berita/{f.slug || "slug"}</p>
              <p className="line-clamp-2 text-neutral-600">{f.seo.metaDescription || f.excerpt}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
