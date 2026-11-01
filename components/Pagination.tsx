import Link from "next/link";

export default function Pagination({ page, total, base, first }: { page: number; total: number; base: string; first: string }) {
  if (total <= 1) return null;
  const href = (p: number) => (p === 1 ? first : base.endsWith("=") ? `${base}${p}` : `${base}/${p}`);
  const pages = Array.from({ length: total }, (_, i) => i + 1).filter((p) => p === 1 || p === total || Math.abs(p - page) <= 2);
  return (
    <nav aria-label="Halaman" className="mt-6 flex flex-wrap items-center gap-2">
      {page > 1 && <Link className="btn btn-ghost" href={href(page - 1)} rel="prev">← Sebelumnya</Link>}
      {pages.map((p, i) => (
        <span key={p} className="contents">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-neutral-400">…</span>}
          {p === page ? <span className="btn bg-brand text-white">{p}</span> : <Link className="btn btn-ghost" href={href(p)}>{p}</Link>}
        </span>
      ))}
      {page < total && <Link className="btn btn-ghost" href={href(page + 1)} rel="next">Berikutnya →</Link>}
    </nav>
  );
}
