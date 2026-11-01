import type { Metadata } from "next";
import { getIndex, getPublished } from "@/lib/store";
import { CardRow } from "@/components/ArticleCard";
import Pagination from "@/components/Pagination";
import { PAGE_SIZE } from "@/lib/queries";

export const metadata: Metadata = { title: "Pencarian", robots: { index: false, follow: true } };

export default async function Cari({ searchParams }: { searchParams: Promise<{ q?: string; p?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q || "").trim().slice(0, 100);
  const page = Math.max(1, Number(sp.p) || 1);
  const [pub, idx] = await Promise.all([getPublished(), getIndex()]);
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const results = terms.length
    ? pub
        .map((a) => {
          const hay = `${a.title} ${a.subtitle} ${a.excerpt} ${a.tags.join(" ")} ${a.category}`.toLowerCase();
          const score = terms.reduce((s, t) => s + (a.title.toLowerCase().includes(t) ? 3 : 0) + (hay.includes(t) ? 1 : 0), 0);
          return { a, score, all: terms.every((t) => hay.includes(t)) };
        })
        .filter((r) => r.all)
        .sort((x, y) => y.score - x.score)
        .map((r) => r.a)
    : [];
  const total = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const items = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black">Pencarian</h1>
      <form action="/cari" className="mt-3 flex">
        <input name="q" defaultValue={q} placeholder="Ketik kata kunci…" className="admin-input rounded-r-none text-base" aria-label="Kata kunci" />
        <button className="btn btn-primary rounded-l-none">Cari</button>
      </form>
      {q && <p className="mt-4 text-sm text-neutral-600">{results.length} hasil untuk “{q}”</p>}
      <div className="mt-2">{items.map((a) => <CardRow key={a.id} a={a} cats={idx.categories} />)}</div>
      {q && results.length > PAGE_SIZE && <Pagination page={page} total={total} base={`/cari?q=${encodeURIComponent(q)}&p=`} first={`/cari?q=${encodeURIComponent(q)}`} />}
    </div>
  );
}
