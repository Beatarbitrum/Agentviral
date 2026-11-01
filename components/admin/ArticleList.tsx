"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "./client";
import type { ArticleSummary, Category } from "@/lib/types";

export default function ArticleList() {
  const [arts, setArts] = useState<ArticleSummary[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [st, setSt] = useState("");
  const [cat, setCat] = useState("");
  const [loading, setLoading] = useState(true);
  const load = () => api("/api/admin/articles").then((r) => { setArts(r.articles); setCats(r.categories); }).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const now = Date.now();
  const list = useMemo(
    () =>
      arts
        .filter((a) => (!q || a.title.toLowerCase().includes(q.toLowerCase())) && (!cat || a.category === cat))
        .filter((a) => !st || (st === "scheduled" ? a.status !== "draft" && new Date(a.publishAt).getTime() > now : st === "published" ? a.status !== "draft" && new Date(a.publishAt).getTime() <= now : a.status === st))
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [arts, q, st, cat, now],
  );
  async function del(id: string) {
    if (!confirm("Hapus artikel ini secara permanen?")) return;
    await api(`/api/admin/articles/${id}`, "DELETE");
    load();
  }
  const badge = (a: ArticleSummary) => {
    if (a.status === "draft") return <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs">Draf</span>;
    if (new Date(a.publishAt).getTime() > now) return <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">Terjadwal</span>;
    return <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800">Terbit</span>;
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-black">Artikel</h1>
        <Link href="/admin/artikel/baru" className="btn btn-primary">+ Tulis Artikel</Link>
      </div>
      <div className="card flex flex-wrap gap-2">
        <input className="admin-input max-w-xs" placeholder="Cari judul…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="admin-input max-w-[160px]" value={st} onChange={(e) => setSt(e.target.value)}>
          <option value="">Semua status</option><option value="published">Terbit</option><option value="draft">Draf</option><option value="scheduled">Terjadwal</option>
        </select>
        <select className="admin-input max-w-[160px]" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Semua kategori</option>
          {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr><th className="p-3">Judul</th><th className="p-3">Kategori</th><th className="p-3">Status</th><th className="p-3">Tanggal</th><th className="p-3"></th></tr>
          </thead>
          <tbody className="divide-y">
            {list.map((a) => (
              <tr key={a.id} className="hover:bg-neutral-50">
                <td className="p-3">
                  <Link href={`/admin/artikel/${a.id}`} className="font-semibold hover:text-red-700">{a.title}</Link>
                  <div className="mt-0.5 flex gap-1 text-[10px] font-bold uppercase">
                    {a.headline && <span className="text-red-700">Headline</span>}{a.breaking && <span className="text-orange-600">Breaking</span>}{a.featured && <span className="text-blue-700">Featured</span>}{a.demo && <span className="text-amber-600">Demo</span>}{a.aiGenerated && <span className="text-purple-700">AI</span>}
                  </div>
                </td>
                <td className="p-3">{cats.find((c) => c.slug === a.category)?.name || a.category}</td>
                <td className="p-3">{badge(a)}</td>
                <td className="whitespace-nowrap p-3 text-xs text-neutral-500">{new Date(a.publishAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</td>
                <td className="whitespace-nowrap p-3 text-right">
                  {a.status !== "draft" && <a href={`/berita/${a.slug}`} target="_blank" className="mr-2 text-xs text-neutral-600 hover:underline">Lihat</a>}
                  <button onClick={() => del(a.id)} className="text-xs text-red-700 hover:underline">Hapus</button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={5} className="p-6 text-center text-neutral-500">{loading ? "Memuat…" : "Tidak ada artikel."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
