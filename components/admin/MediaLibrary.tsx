"use client";
import { useEffect, useState } from "react";
import { api } from "./client";
import Uploader from "./Uploader";
import { Spinner } from "./ui";

type B = { url: string; pathname: string; size: number; uploadedAt: string };

export default function MediaLibrary() {
  const [items, setItems] = useState<B[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");
  const load = async (c?: string) => {
    const r = await api(`/api/admin/media${c ? `?cursor=${encodeURIComponent(c)}` : ""}`);
    setItems((p) => (c ? [...p, ...r.blobs] : r.blobs));
    setCursor(r.hasMore ? r.cursor : undefined);
  };
  useEffect(() => { load().catch((e) => setMsg(e.message)).finally(() => setLoading(false)); }, []);
  async function del(url: string) {
    if (!confirm("Hapus file ini? Artikel yang memakainya akan kehilangan gambar.")) return;
    const prev = items;
    setItems(items.filter((i) => i.url !== url)); // optimistis
    try { await api("/api/admin/media", "DELETE", { url }); } catch (e) { setItems(prev); setMsg((e as Error).message); }
  }
  async function copy(url: string) {
    try { await navigator.clipboard.writeText(url); setCopied(url); setTimeout(() => setCopied(""), 1500); } catch { prompt("Salin URL:", url); }
  }
  const isVideo = (p: string) => /\.(mp4|webm|mov)$/i.test(p);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-black">Media</h1>
        <Uploader accept="image/*,video/*" multiple label="Unggah file" onUploaded={() => load()} />
      </div>
      {msg && <p className="text-sm text-red-700">{msg}</p>}
      {loading && <p className="flex items-center gap-2 text-neutral-500"><Spinner /> Memuat media…</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {[...items].sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt)).map((b) => (
          <div key={b.url} className="card space-y-1 p-2 text-xs">
            {isVideo(b.pathname) ? <video src={b.url} className="aspect-video w-full rounded bg-black" preload="metadata" /> : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.url} alt="" loading="lazy" className="aspect-video w-full rounded object-cover" />
            )}
            <p className="truncate" title={b.pathname}>{b.pathname.replace("media/", "")}</p>
            <p className="text-neutral-500">{(b.size / 1024).toFixed(0)} KB</p>
            <div className="flex justify-between">
              <button type="button" className="tap px-1 text-blue-700" onClick={() => copy(b.url)}>{copied === b.url ? "Tersalin ✓" : "Salin URL"}</button>
              <button type="button" className="tap px-1 text-red-700" onClick={() => del(b.url)}>Hapus</button>
            </div>
          </div>
        ))}
      </div>
      {cursor && <button className="btn btn-ghost" onClick={() => load(cursor)}>Muat lagi</button>}
    </div>
  );
}
