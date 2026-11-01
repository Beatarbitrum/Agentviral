import Link from "next/link";
import Thumb from "./Thumb";
import type { ArticleSummary, Category } from "@/lib/types";
import { formatTanggal } from "@/lib/util";

export function catName(cats: Category[], slug: string) {
  return cats.find((c) => c.slug === slug)?.name || slug;
}

export function CardVertical({ a, cats, priority }: { a: ArticleSummary; cats: Category[]; priority?: boolean }) {
  return (
    <article className="group">
      <Link href={`/berita/${a.slug}`} className="block">
        <Thumb src={a.cover?.url} alt={a.cover?.alt || a.title} label={catName(cats, a.category)} priority={priority} sizes="(max-width:768px) 100vw, 33vw" />
      </Link>
      <div className="mt-2">
        <Link href={`/kategori/${a.category}`} className="text-xs font-bold uppercase tracking-wide text-brand">{catName(cats, a.category)}</Link>
        <h3 className="mt-1 line-clamp-3 text-base font-bold leading-snug group-hover:text-brand">
          <Link href={`/berita/${a.slug}`}>{a.title}</Link>
        </h3>
        <p className="mt-1 text-xs text-neutral-500">{formatTanggal(a.publishAt)}</p>
      </div>
    </article>
  );
}

export function CardRow({ a, cats }: { a: ArticleSummary; cats: Category[] }) {
  return (
    <article className="group flex gap-3 border-b border-neutral-100 py-4 last:border-0">
      <Link href={`/berita/${a.slug}`} className="block w-32 shrink-0 sm:w-56">
        <Thumb src={a.cover?.url} alt={a.cover?.alt || a.title} label={catName(cats, a.category)} sizes="(max-width:640px) 128px, 224px" />
      </Link>
      <div className="min-w-0">
        <Link href={`/kategori/${a.category}`} className="text-xs font-bold uppercase tracking-wide text-brand">{catName(cats, a.category)}</Link>
        <h3 className="mt-1 line-clamp-3 text-base font-bold leading-snug group-hover:text-brand sm:text-lg">
          <Link href={`/berita/${a.slug}`}>{a.title}</Link>
        </h3>
        {a.excerpt && <p className="mt-1 hidden line-clamp-2 text-sm text-neutral-600 sm:block">{a.excerpt}</p>}
        <p className="mt-1 text-xs text-neutral-500">
          {formatTanggal(a.publishAt)} · {a.readingTime} menit baca{a.hasProof ? " · 📹 Ada video" : ""}
        </p>
      </div>
    </article>
  );
}

export function PopularList({ items, title = "Terpopuler" }: { items: ArticleSummary[]; title?: string }) {
  if (!items.length) return null;
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <ol className="mt-2">
        {items.map((a, i) => (
          <li key={a.id} className="flex gap-3 border-b border-neutral-100 py-3 last:border-0">
            <span className="w-8 shrink-0 text-3xl font-black italic leading-none text-brand/80">{i + 1}</span>
            <Link href={`/berita/${a.slug}`} className="line-clamp-3 text-sm font-bold leading-snug hover:text-brand">{a.title}</Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function SectionTitle({ children, href }: { children: React.ReactNode; href?: string }) {
  return (
    <div className="flex items-center justify-between border-b-2 border-ink">
      <h2 className="-mb-0.5 inline-block bg-brand px-3 py-1.5 text-sm font-black uppercase tracking-wider text-white">{children}</h2>
      {href && <Link href={href} className="text-xs font-bold uppercase text-brand hover:underline">Lihat semua →</Link>}
    </div>
  );
}
