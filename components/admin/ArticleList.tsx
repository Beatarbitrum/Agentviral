"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "./client";
import { Spinner } from "./ui";
import type { ArticleSummary, Category } from "@/lib/types";

export default function ArticleList({ initialArticles, initialCategories }: { initialArticles: ArticleSummary[]; initialCategories: Category[] }) {
  // Data awal datang dari server: daftar langsung tampil, tanpa "Memuat…" di HP.
  const [arts, setArts] = useState<ArticleSummary[]>(initialArticles);
  const cats = initialCategories;
  const [q, setQ] = useState("");
  const [st, setSt] = useState("");
  const [cat, setCat] = useState("");
  const [deleting, setDeleting] = useState<string>("");
  const [err, setErr] = useState("");
  const now = Date.now();
  const list = useMemo(
    () =>
      arts
        .filter((a) => (!q || a.title.toLowerCase().includes(q.toLowerCase())) && (!cat || a.category === cat))
        .filter((a) => !st || (st === "scheduled" ? a.status !== "draft" && new Date(a.publishAt).getTime() > now : st === "published" ? a.status !== "draft" && new Date(a.publishAt).getTime() <= now : a.status === st))
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [arts, q, st, cat, now],
  );
  async function del(a: ArticleSummary) {
    if (deleting || !confirm(`Hapus "${a.title}" secara permanen?`)) return;
    setDeleting(a.id);
    setErr("");
    const prev = arts;
    // Optimistis: langsung hilang dari daftar, dikembalikan bila gagal
    setArts((x) => x.filter((y) => y.id !== a.id));
    try {
      await api(`/api/admin/articles/${a.id}`, "DELETE");
    } catch (e) {
      setArts(prev);
      setErr((e as Error).message);
    } finally {
      setDeleting("");
    }
  }
  const badge = (a: ArticleSummary) => {
    if (a.status === "draft") return <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs">Draf</span>;
    if (new Date(a.publishAt).getTime() > now) return <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">Terjadwal</span>;
    return <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800">Terbit</span>;
  };
  const flags = (a: ArticleSummary) => (
    <span className="flex flex-wrap gap-1 text-[10px] font-bold uppercase">
      {a.headline && <span className="text-red-700">Headline</span>}
      {a.breaking && <span className="text-orange-600">Breaking</span>}
      {a.featured && <span className="text-blue-700">Featured</span>}
      {a.demo && <span className="text-amber-600">Demo</span>}
      {a.aiGenerated && <span className="text-purple-700">AI</span>}
    </span>
  );
  const date = (a: ArticleSummary) => new Date(a.publishAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" });
  const catLabel = (a: ArticleSummary) => cats.find((c) => c.slug === a.category)?.name || a.category;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-black">Artikel <span className="text-base font-semibold text-neutral-500">({list.length})</span></h1>
        <Link href="/admin/artikel/baru" className="btn btn-primary">+ Tulis Artikel</Link>
      </div>
      <div className="card grid gap-2 sm:flex sm:flex-wrap">
        <input type="search" className="admin-input sm:max-w-xs" placeholder="Cari judul…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <select className="admin-input sm:w-44" value={st} onChange={(e) => setSt(e.target.value)} aria-label="Filter status">
            <option value="">Semua status</option><option value="published">Terbit</option><option value="draft">Draf</option><option value="scheduled">Terjadwal</option>
          </select>
          <select className="admin-input sm:w-44" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter kategori">
            <option value="">Semua kategori</option>
            {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
      </div>
      {err && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}

      {/* HP: kartu besar yang mudah diketuk */}
      <ul className="space-y-2 md:hidden">
        {list.map((a) => (
          <li key={a.id} className="card p-0">
            <Link href={`/admin/artikel/${a.id}`} className="block rounded-t-lg p-3 transition active:bg-neutral-100">
              <span className="block font-semibold leading-snug">{a.title}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">{badge(a)} {catLabel(a)} · {date(a)}</span>
              <span className="mt-1 block">{flags(a)}</span>
            </Link>
            <div className="flex border-t text-sm">
              <Link href={`/admin/artikel/${a.id}`} className="flex min-h-11 flex-1 items-center justify-center font-semibold text-neutral-800 active:bg-neutral-100">✏️ Edit</Link>
              {a.status !== "draft" && <a href={`/berita/${a.slug}`} target="_blank" rel="noopener" className="flex min-h-11 flex-1 items-center justify-center border-l text-neutral-700 active:bg-neutral-100">Lihat ↗</a>}
              <button type="button" disabled={!!deleting} onClick={() => del(a)} className="flex min-h-11 flex-1 items-center justify-center gap-1 border-l text-red-700 active:bg-red-50 disabled:opacity-50">
                {deleting === a.id ? <Spinner /> : "🗑"} Hapus
              </button>
            </div>
          </li>
        ))}
        {!list.length && <li className="card text-center text-neutral-500">Tidak ada artikel.</li>}
      </ul>

      {/* Desktop/tablet: tabel */}
      <div className="card hidden overflow-x-auto p-0 md:block">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr><th className="p-3">Judul</th><th className="p-3">Kategori</th><th className="p-3">Status</th><th className="p-3">Tanggal</th><th className="p-3"></th></tr>
          </thead>
          <tbody className="divide-y">
            {list.map((a) => (
              <tr key={a.id} className="hover:bg-neutral-50">
                <td className="p-3">
                  <Link href={`/admin/artikel/${a.id}`} className="font-semibold hover:text-red-700">{a.title}</Link>
                  <div className="mt-0.5">{flags(a)}</div>
                </td>
                <td className="p-3">{catLabel(a)}</td>
                <td className="p-3">{badge(a)}</td>
                <td className="whitespace-nowrap p-3 text-xs text-neutral-500">{date(a)}</td>
                <td className="whitespace-nowrap p-3 text-right">
                  {a.status !== "draft" && <a href={`/berita/${a.slug}`} target="_blank" rel="noopener" className="btn btn-ghost btn-sm mr-1">Lihat</a>}
                  <button type="button" disabled={!!deleting} onClick={() => del(a)} className="btn btn-danger btn-sm">{deleting === a.id ? <Spinner /> : null} Hapus</button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={5} className="p-6 text-center text-neutral-500">Tidak ada artikel.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
