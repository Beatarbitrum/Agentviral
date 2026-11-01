import Link from "next/link";
import { getIndex, getPublished } from "@/lib/store";
import { popular, PAGE_SIZE } from "@/lib/queries";
import { CardRow, CardVertical, PopularList, SectionTitle, catName } from "@/components/ArticleCard";
import Thumb from "@/components/Thumb";
import { formatTanggal } from "@/lib/util";

export const revalidate = 300;

export default async function Home() {
  const [pub, idx, pop] = await Promise.all([getPublished(), getIndex(), popular(6)]);
  const cats = idx.categories;
  if (!pub.length)
    return (
      <div className="card py-16 text-center">
        <h1 className="text-2xl font-black">Belum ada berita</h1>
        <p className="mt-2 text-neutral-600">Redaksi sedang menyiapkan berita terbaru. Silakan kembali lagi nanti.</p>
      </div>
    );
  const hero = pub.find((a) => a.headline) || pub[0];
  const featured = pub.filter((a) => a.id !== hero.id && (a.featured || a.headline)).slice(0, 4);
  const side = featured.length >= 2 ? featured : pub.filter((a) => a.id !== hero.id).slice(0, 4);
  const latest = pub.slice(0, PAGE_SIZE);
  const catBlocks = cats.map((c) => ({ c, items: pub.filter((a) => a.category === c.slug).slice(0, 4) })).filter((b) => b.items.length);
  return (
    <>
      <h1 className="sr-only">Agentviral — Berita Viral Terkini</h1>
      <section className="grid gap-4 lg:grid-cols-3">
        <article className="group relative overflow-hidden rounded-lg lg:col-span-2">
          <Link href={`/berita/${hero.slug}`} className="block">
            <Thumb src={hero.cover?.url} alt={hero.cover?.alt || hero.title} label={catName(cats, hero.category)} priority sizes="(max-width:1024px) 100vw, 66vw" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-20 text-white sm:p-6">
              <span className="rounded bg-brand px-2 py-0.5 text-xs font-black uppercase">{catName(cats, hero.category)}</span>
              <h2 className="mt-2 text-xl font-black leading-tight group-hover:underline sm:text-3xl">{hero.title}</h2>
              {hero.subtitle && <p className="mt-1 hidden text-sm text-white/85 sm:block">{hero.subtitle}</p>}
              <p className="mt-1 text-xs text-white/70">{formatTanggal(hero.publishAt)}</p>
            </div>
          </Link>
        </article>
        <div className="grid grid-cols-2 gap-4">
          {side.slice(0, 4).map((a) => (
            <CardVertical key={a.id} a={a} cats={cats} />
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionTitle href="/halaman/2">Terbaru</SectionTitle>
          <div>{latest.map((a) => <CardRow key={a.id} a={a} cats={cats} />)}</div>
          {pub.length > PAGE_SIZE && <Link href="/halaman/2" className="btn btn-dark mt-4 w-full">Muat berita lainnya</Link>}
        </section>
        <aside className="space-y-8">
          <PopularList items={pop} title="🔥 Terpopuler" />
          {idx.tags.length > 0 && (
            <section>
              <SectionTitle>Topik Hangat</SectionTitle>
              <div className="mt-3 flex flex-wrap gap-2">
                {idx.tags.slice(0, 20).map((t) => (
                  <Link key={t.slug} href={`/tag/${t.slug}`} className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold hover:border-brand hover:text-brand">#{t.name}</Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      {catBlocks.map(({ c, items }) => (
        <section key={c.slug} className="mt-10">
          <SectionTitle href={`/kategori/${c.slug}`}>{c.name}</SectionTitle>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {items.map((a) => <CardVertical key={a.id} a={a} cats={cats} />)}
          </div>
        </section>
      ))}
    </>
  );
}
