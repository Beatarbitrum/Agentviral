import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { listing, paginate } from "@/lib/queries";
import { CardRow, SectionTitle } from "@/components/ArticleCard";
import Pagination from "@/components/Pagination";

export const revalidate = 300;
export async function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const { n } = await params;
  return { title: `Indeks Berita Terbaru — Halaman ${n}`, alternates: { canonical: `/halaman/${n}` } };
}

export default async function Indeks({ params }: { params: Promise<{ n: string }> }) {
  const page = Number((await params).n);
  if (!Number.isInteger(page) || page < 1) notFound();
  const { list, idx } = await listing(() => true);
  const { items, total } = paginate(list, page);
  if (page > total) notFound();
  return (
    <>
      <SectionTitle>Indeks Berita · Halaman {page}</SectionTitle>
      <h1 className="sr-only">Indeks berita terbaru halaman {page}</h1>
      {items.length ? items.map((a) => <CardRow key={a.id} a={a} cats={idx.categories} />) : <p className="py-10 text-neutral-500">Belum ada berita.</p>}
      <Pagination page={page} total={total} base="/halaman" first="/halaman/1" />
    </>
  );
}
