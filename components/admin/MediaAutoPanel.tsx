"use client";
import { useEffect, useState } from "react";
import { api } from "./client";

// Daftar penyedia yang bisa ditambahkan. Tambah penyedia baru: tambahkan di sini dan di lib/mediaProviders.ts.
const TYPES: { type: string; label: string; does: string; signup: string }[] = [
  { type: "brave", label: "Brave Search", does: "TikTok, Instagram, X, Facebook, video & berita", signup: "https://brave.com/search/api/" },
  { type: "serper", label: "Serper (Google)", does: "TikTok, Instagram, X, Facebook, video & berita", signup: "https://serper.dev" },
  { type: "youtube", label: "YouTube Data API", does: "Video YouTube resmi", signup: "https://console.cloud.google.com/apis/library/youtube.googleapis.com" },
  { type: "pexels", label: "Pexels", does: "Foto sampul stok gratis", signup: "https://www.pexels.com/api/" },
  { type: "unsplash", label: "Unsplash", does: "Foto sampul stok gratis", signup: "https://unsplash.com/developers" },
  { type: "pixabay", label: "Pixabay", does: "Foto sampul stok gratis", signup: "https://pixabay.com/api/docs/" },
];
const PLATFORMS: [string, string][] = [["youtube", "YouTube"], ["tiktok", "TikTok"], ["instagram", "Instagram"], ["x", "X / Twitter"], ["facebook", "Facebook"]];

type Prov = { id?: string; type: string; name: string; enabled: boolean; tokenMasked?: string; hasToken?: boolean; token?: string; deleteToken?: boolean };
type M = {
  autoAfterAi: boolean;
  coverMode: "source" | "stock" | "off";
  platforms: Record<string, boolean>;
  maxVideos: number;
  maxSocial: number;
  maxRefs: number;
  extraKeywords: string;
  blockedDomains: string;
  providers: Prov[];
};

export default function MediaAutoPanel() {
  const [m, setM] = useState<M | null>(null);
  const [msg, setMsg] = useState("");
  const [tests, setTests] = useState<Record<string, string>>({});
  const [addType, setAddType] = useState("brave");
  const [pv, setPv] = useState({ title: "", busy: false, out: "" });
  useEffect(() => { api("/api/admin/settings").then((r) => setM(r.settings.media)); }, []);
  if (!m) return <p>Memuat…</p>;
  const set = <K extends keyof M>(k: K, v: M[K]) => setM({ ...m, [k]: v });
  const setP = (i: number, patch: Partial<Prov>) => set("providers", m.providers.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  async function save() {
    setMsg("Menyimpan…");
    try {
      const r = await api("/api/admin/settings", "PUT", { media: m });
      setM(r.settings.media);
      setMsg("Tersimpan ✓");
    } catch (e) { setMsg((e as Error).message); }
  }
  async function test(p: Prov) {
    if (!p.id) return setTests({ ...tests, [p.name]: "Simpan dulu" });
    setTests({ ...tests, [p.id]: "Menguji…" });
    try { const r = await api("/api/admin/ai", "POST", { action: "media_test", providerId: p.id }); setTests((t) => ({ ...t, [p.id!]: `✓ ${r.results} hasil (${r.ms} ms)` })); }
    catch (e) { setTests((t) => ({ ...t, [p.id!]: `✕ ${(e as Error).message}` })); }
  }
  async function preview() {
    setPv({ ...pv, busy: true, out: "" });
    try {
      const r = await api("/api/admin/ai", "POST", { action: "media_preview", title: pv.title });
      setPv({ ...pv, busy: false, out: [...r.log, r.cover ? `Sampul: ${r.cover.url}` : "", ...r.embeds, ...r.sources.map((s: { url: string }) => s.url)].filter(Boolean).join("\n") });
    } catch (e) { setPv({ ...pv, busy: false, out: (e as Error).message }); }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">🔎 Media Otomatis</h1>
      <p className="text-sm text-neutral-600">Atur cara AI mencari foto sampul, video, postingan sosial, dan link referensi. Semua hasil masuk ke draf dan bisa diedit sebelum terbit. Simpan setelah mengubah.</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="font-bold">Aturan</h2>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={m.autoAfterAi} onChange={(e) => set("autoAfterAi", e.target.checked)} /> Cari media otomatis setiap AI selesai menulis</label>
          <div>
            <label className="admin-label">Sumber foto sampul</label>
            <select className="admin-input" value={m.coverMode} onChange={(e) => set("coverMode", e.target.value as M["coverMode"])}>
              <option value="source">Foto dari berita sumber dulu, lalu foto stok</option>
              <option value="stock">Foto stok bebas lisensi dulu (aman untuk monetisasi)</option>
              <option value="off">Jangan pasang sampul otomatis</option>
            </select>
          </div>
          <div>
            <label className="admin-label">Platform yang dicari</label>
            <div className="flex flex-wrap gap-3 text-sm">
              {PLATFORMS.map(([k, t]) => (
                <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={!!m.platforms[k]} onChange={(e) => set("platforms", { ...m.platforms, [k]: e.target.checked })} /> {t}</label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="admin-label">Maks video YT</label><input type="number" min={0} max={10} className="admin-input" value={m.maxVideos} onChange={(e) => set("maxVideos", Number(e.target.value))} /></div>
            <div><label className="admin-label">Maks postingan sosial</label><input type="number" min={0} max={10} className="admin-input" value={m.maxSocial} onChange={(e) => set("maxSocial", Number(e.target.value))} /></div>
            <div><label className="admin-label">Maks referensi</label><input type="number" min={0} max={10} className="admin-input" value={m.maxRefs} onChange={(e) => set("maxRefs", Number(e.target.value))} /></div>
          </div>
          <div><label className="admin-label">Kata kunci tambahan (opsional)</label><input className="admin-input" placeholder="mis. Indonesia, terbaru" value={m.extraKeywords} onChange={(e) => set("extraKeywords", e.target.value)} /></div>
          <div><label className="admin-label">Domain diblokir (pisahkan koma)</label><textarea className="admin-input font-mono text-xs" rows={2} placeholder="contoh.com, situs-hoaks.net" value={m.blockedDomains} onChange={(e) => set("blockedDomains", e.target.value)} /></div>
          <div className="flex items-center gap-2"><button className="btn btn-primary" onClick={save}>Simpan</button><span className="text-sm">{msg}</span></div>
        </section>

        <section className="card space-y-3">
          <h2 className="font-bold">Penyedia pencarian (API)</h2>
          <p className="text-xs text-neutral-500">Tanpa API pun sudah jalan: sampul dari berita sumber, video YouTube, postingan yang disematkan di berita, dan referensi berita. Tambahkan API untuk mencari TikTok/Instagram/X langsung dan foto stok. Bisa tambah lebih dari satu.</p>
          {m.providers.length === 0 && <p className="text-sm text-neutral-500">Belum ada penyedia.</p>}
          {m.providers.map((p, i) => {
            const t = TYPES.find((x) => x.type === p.type);
            return (
              <div key={p.id || i} className="space-y-2 rounded border p-3">
                <div className="flex items-center justify-between gap-2">
                  <input className="admin-input font-semibold" value={p.name} onChange={(e) => setP(i, { name: e.target.value })} />
                  <label className="flex shrink-0 items-center gap-1 text-sm"><input type="checkbox" checked={p.enabled} onChange={(e) => setP(i, { enabled: e.target.checked })} /> Aktif</label>
                </div>
                <p className="text-xs text-neutral-500">{t?.label}: {t?.does} · <a className="underline" href={t?.signup} target="_blank" rel="noreferrer">daftar API key</a></p>
                {p.hasToken && !p.deleteToken && <p className="font-mono text-xs">Tersimpan: {p.tokenMasked} <button className="ml-2 text-red-700" onClick={() => setP(i, { deleteToken: true })}>Hapus token</button></p>}
                <input type="password" autoComplete="off" className="admin-input font-mono text-sm" placeholder={p.hasToken ? "Tempel token baru untuk mengganti" : "Tempel API key"} value={p.token || ""} onChange={(e) => setP(i, { token: e.target.value, deleteToken: false })} />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => test(p)} disabled={!p.id || !p.hasToken}>Tes</button>
                  <button className="text-xs text-red-700" onClick={() => confirm(`Hapus penyedia ${p.name}?`) && set("providers", m.providers.filter((_, j) => j !== i))}>Hapus penyedia</button>
                  {p.id && tests[p.id] && <span className="text-xs">{tests[p.id]}</span>}
                </div>
              </div>
            );
          })}
          <div className="flex gap-2">
            <select className="admin-input" value={addType} onChange={(e) => setAddType(e.target.value)}>
              {TYPES.map((t) => <option key={t.type} value={t.type}>{t.label} — {t.does}</option>)}
            </select>
            <button className="btn btn-dark shrink-0" onClick={() => set("providers", [...m.providers, { type: addType, name: TYPES.find((t) => t.type === addType)!.label, enabled: true }])}>+ Tambah</button>
          </div>
          <p className="text-xs text-neutral-500">Setelah menambah atau mengganti token, tekan Simpan di kiri.</p>
        </section>
      </div>

      <section className="card space-y-2">
        <h2 className="font-bold">Coba cari</h2>
        <div className="flex gap-2">
          <input className="admin-input" placeholder="Judul atau topik, mis. harga BBM November" value={pv.title} onChange={(e) => setPv({ ...pv, title: e.target.value })} />
          <button className="btn btn-dark shrink-0" disabled={pv.busy} onClick={preview}>{pv.busy ? "Mencari…" : "Cari"}</button>
        </div>
        {pv.out && <pre className="whitespace-pre-wrap break-all rounded bg-neutral-50 p-2 text-xs">{pv.out}</pre>}
        <p className="text-xs text-neutral-500">Pratinjau memakai pengaturan yang sudah disimpan.</p>
      </section>
    </div>
  );
}
