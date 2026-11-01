import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { STATIC_PAGES } from "@/lib/pages";
import { renderMarkdown } from "@/lib/markdown";
import { getSettings } from "@/lib/store";

export const revalidate = 3600;
export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(STATIC_PAGES).map((page) => ({ page }));
}
type P = { params: Promise<{ page: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = STATIC_PAGES[(await params).page];
  return p ? { title: p.title, alternates: { canonical: `/${(await params).page}` } } : {};
}

export default async function StaticPage({ params }: P) {
  const p = STATIC_PAGES[(await params).page];
  if (!p) notFound();
  const s = await getSettings();
  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="border-b-4 border-brand pb-2 text-3xl font-black">{p.title}</h1>
      <div className="prose-av mt-5" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body(s.siteName, s.contactEmail || "redaksi@agentviral.id")) }} />
    </article>
  );
}
