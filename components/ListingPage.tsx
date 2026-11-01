import { notFound } from "next/navigation";
import { listing, paginate, popular } from "@/lib/queries";
import { CardRow, PopularList } from "./ArticleCard";
import Pagination from "./Pagination";
import JsonLd from "./JsonLd";
import { siteUrl, slugify } from "@/lib/util";
import type { ArticleSummary } from "@/lib/types";

export async function ListingPage({ kind, slug, page }: { kind: "kategori" | "tag" | "penulis"; slug: string; page: number }) {
  if (!Number.isInteger(page) || page < 1) notFound();
  const filter = (a: ArticleSummary) =>
    kind === "kategori" ? a.category === slug : kind === "tag" ? a.tags.includes(slug) : slugify(a.author) === slug;
  const { list, idx } = await listing(filter);
  let title = slug;
  let desc = "";
  if (kind === "kategori") {
    const c = idx.categories.find((c) => c.slug === slug);
    if (!c) notFound();
    title = c.name;
    desc = c.description || "";
  } else if (kind === "tag") {
    const t = idx.tags.find((t) => t.slug === slug);
    if (!t && !list.length) notFound();
    title = `#${t?.name || slug}`;
  } else {
    if (!list.length) notFound();
    title = list[0].author;
    desc = `${title} adalah penulis di Agentviral. Berikut kumpulan tulisan ${title}.`;
  }
  const { items, total } = paginate(list, page);
  if (page > total) notFound();
  const pop = await popular(5);
  const base = `/${kind}/${slug}`;
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <section className="lg:col-span-2">
        <div className="border-b-2 border-ink pb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">{kind === "kategori" ? "Kategori" : kind === "tag" ? "Topik" : "Penulis"}</p>
          <h1 className="text-3xl font-black">{title}</h1>
          {desc && <p className="mt-1 text-sm text-neutral-600">{desc}</p>}
          {page > 1 && <p className="text-xs text-neutral-500">Halaman {page}</p>}
        </div>
        {items.length ? items.map((a) => <CardRow key={a.id} a={a} cats={idx.categories} />) : <p className="py-10 text-neutral-500">Belum ada berita di sini.</p>}
        <Pagination page={page} total={total} base={`${base}/halaman`} first={base} />
      </section>
      <aside>
        <PopularList items={pop} title="🔥 Terpopuler" />
      </aside>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Beranda", item: siteUrl() },
            { "@type": "ListItem", position: 2, name: title, item: `${siteUrl()}${base}` },
          ],
        }}
      />
    </div>
  );
}

export async function listingMeta(kind: string, slug: string, page = 1) {
  const { idx } = await listing(() => false);
  const name = kind === "kategori" ? idx.categories.find((c) => c.slug === slug)?.name : kind === "tag" ? `#${idx.tags.find((t) => t.slug === slug)?.name || slug}` : slug.replace(/-/g, " ");
  const path = page > 1 ? `/${kind}/${slug}/halaman/${page}` : `/${kind}/${slug}`;
  return {
    title: `${kind === "kategori" ? "Berita " : kind === "penulis" ? "Penulis: " : ""}${name || slug}${page > 1 ? ` — Halaman ${page}` : ""}`,
    description: `Kumpulan berita ${name || slug} terbaru dan terpopuler di Agentviral.`,
    alternates: { canonical: path },
  };
}
