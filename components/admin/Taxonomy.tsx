"use client";
import { useEffect, useState } from "react";
import { api, slugifyClient } from "./client";
import { Btn } from "./ui";
import type { Category, Tag } from "@/lib/types";

export default function Taxonomy() {
  const [cats, setCats] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { api("/api/admin/articles").then((r) => { setCats(r.categories); setTags(r.tags); }); }, []);
  async function save() {
    if (saving) return;
    setSaving(true); setMsg("");
    try {
      const r = await api("/api/admin/taxonomy", "PUT", { categories: cats, tags });
      setCats(r.categories); setTags(r.tags); setMsg("Tersimpan ✓");
    } catch (e) { setMsg((e as Error).message); } finally { setSaving(false); }
  }
  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-20 -mx-3 flex flex-wrap items-center justify-between gap-2 border-b bg-neutral-100/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0"><h1 className="text-2xl font-black">Kategori & Tag</h1><div className="flex items-center gap-2"><span className={`text-sm ${msg.includes("✓") ? "text-green-700" : "text-red-700"}`}>{msg}</span><Btn className="btn btn-primary" busy={saving} busyText="Menyimpan…" onClick={save}>Simpan</Btn></div></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-2">
          <div className="flex items-center justify-between"><h2 className="font-bold">Kategori</h2><button type="button" className="btn btn-ghost btn-sm" onClick={() => setCats([...cats, { slug: "", name: "", description: "" }])}>+ Tambah</button></div>
          {cats.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 border-b pb-2">
              <input className="admin-input" placeholder="Nama" value={c.name} onChange={(e) => setCats(cats.map((x, j) => (j === i ? { ...x, name: e.target.value, slug: x.slug || slugifyClient(e.target.value) } : x)))} />
              <input className="admin-input font-mono text-xs" placeholder="slug" value={c.slug} onChange={(e) => setCats(cats.map((x, j) => (j === i ? { ...x, slug: slugifyClient(e.target.value) } : x)))} />
              <button type="button" aria-label="Hapus" className="tap text-red-700" onClick={() => confirm("Hapus kategori? Artikel di kategori ini tetap ada.") && setCats(cats.filter((_, j) => j !== i))}>✕</button>
              <input className="admin-input col-span-2" placeholder="Deskripsi" value={c.description || ""} onChange={(e) => setCats(cats.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
            </div>
          ))}
        </section>
        <section className="card space-y-2">
          <div className="flex items-center justify-between"><h2 className="font-bold">Tag</h2><button type="button" className="btn btn-ghost btn-sm" onClick={() => setTags([...tags, { slug: "", name: "" }])}>+ Tambah</button></div>
          {tags.map((t, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input className="admin-input" value={t.name} onChange={(e) => setTags(tags.map((x, j) => (j === i ? { ...x, name: e.target.value, slug: x.slug || slugifyClient(e.target.value) } : x)))} />
              <input className="admin-input font-mono text-xs" value={t.slug} onChange={(e) => setTags(tags.map((x, j) => (j === i ? { ...x, slug: slugifyClient(e.target.value) } : x)))} />
              <button type="button" aria-label="Hapus" className="tap text-red-700" onClick={() => setTags(tags.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          {!tags.length && <p className="text-sm text-neutral-500">Tag dibuat otomatis saat menyimpan artikel.</p>}
        </section>
      </div>
    </div>
  );
}
