import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArticleBySlug, getIndex, getPublished, getSettings, getViews, isVisible } from "@/lib/store";
import { popular } from "@/lib/queries";
import { renderMarkdown } from "@/lib/markdown";
import { parseEmbed } from "@/lib/embeds";
import { formatTanggal, readingTime, siteUrl, slugify, isSafeUrl } from "@/lib/util";
import { CardVertical, PopularList, SectionTitle, catName } from "@/components/ArticleCard";
import Img from "@/components/Img";
import JsonLd from "@/components/JsonLd";
import ShareButtons from "@/components/ShareButtons";

export const revalidate = 300;
export async function generateStaticParams() { return []; }
type P = { params: Promise<{ slug: string }> };

function ogImage(a: { title: string; category: string; cover?: { url: string } }) {
  if (a.cover?.url && !/\.svg(\?|$)/i.test(a.cover.url)) return a.cover.url;
  return `/og?title=${encodeURIComponent(a.title.replace(/^\[DEMO\]\s*/, ""))}&cat=${encodeURIComponent(a.category)}`;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const a = await getArticleBySlug((await params).slug);
  if (!a || !isVisible(a)) return { title: "Berita tidak ditemukan", robots: { index: false } };
  const title = a.seo.metaTitle || a.title;
  const description = a.seo.metaDescription || a.excerpt || a.subtitle || "";
  const img = ogImage(a);
  return {
    title,
    description,
    keywords: [a.seo.focusKeyword, ...a.tags].filter(Boolean) as string[],
    authors: [{ name: a.author, url: `/penulis/${slugify(a.author)}` }],
    alternates: { canonical: `/berita/${a.slug}` },
    openGraph: { type: "article", title, description, url: `/berita/${a.slug}`, images: [{ url: img, width: 1200, height: 630, alt: a.cover?.alt || a.title }], publishedTime: a.publishAt, modifiedTime: a.updatedAt, section: a.category, tags: a.tags, authors: [a.author] },
    twitter: { card: "summary_large_image", title, description, images: [img] },
    other: { "article:published_time": a.publishAt },
  };
}

export default async function ArticlePage({ params }: P) {
  const a = await getArticleBySlug((await params).slug);
  if (!a || !isVisible(a)) notFound();
  const [idx, pub, views, pop, settings] = await Promise.all([getIndex(), getPublished(), getViews(), popular(5, a.id), getSettings()]);
  const cats = idx.categories;
  const cName = catName(cats, a.category);
  const url = `${siteUrl()}/berita/${a.slug}`;
  const html = renderMarkdown(a.body);
  const embeds = a.embeds.map((e) => ({ raw: e, e: parseEmbed(e) }));
  const related = pub
    .filter((x) => x.id !== a.id)
    .map((x) => ({ x, s: (x.category === a.category ? 2 : 0) + x.tags.filter((t) => a.tags.includes(t)).length }))
    .filter((r) => r.s > 0)
    .sort((p, q) => q.s - p.s)
    .slice(0, 4)
    .map((r) => r.x);
  const tagName = (t: string) => idx.tags.find((x) => x.slug === t)?.name || t;
  const img = ogImage(a);
  const absImg = img.startsWith("http") ? img : `${siteUrl()}${img}`;
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <article className="lg:col-span-2">
        <nav aria-label="Breadcrumb" className="text-xs font-semibold text-neutral-500">
          <Link href="/" className="hover:text-brand">Beranda</Link> › <Link href={`/kategori/${a.category}`} className="text-brand">{cName}</Link>
        </nav>
        <h1 className="mt-2 text-2xl font-black leading-tight sm:text-4xl">{a.title}</h1>
        {a.subtitle && <p className="mt-2 text-lg text-neutral-600">{a.subtitle}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-neutral-200 py-2 text-xs text-neutral-600">
          <span>Oleh <Link href={`/penulis/${slugify(a.author)}`} className="font-bold text-ink hover:text-brand">{a.author}</Link></span>
          <time dateTime={a.publishAt}>{formatTanggal(a.publishAt)}</time>
          <span>⏱ {readingTime(a.body)} menit baca</span>
          <span>👁 <span id="av-views" data-id={a.id}>{(views[a.id] || 0).toLocaleString("id-ID")}</span> kali dibaca</span>
        </div>
        {a.cover?.url && (
          <figure className="mt-4">
            <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-neutral-200">
              <Img src={a.cover.url} alt={a.cover.alt || a.title} priority sizes="(max-width:1024px) 100vw, 760px" />
            </div>
            {(a.cover.caption || a.cover.credit) && (
              <figcaption className="mt-1.5 text-xs text-neutral-500">
                {a.cover.caption}
                {a.cover.credit && <span className="italic"> (Foto: {a.cover.credit})</span>}
              </figcaption>
            )}
          </figure>
        )}
        <ShareButtons url={url} title={a.title} />
        <div className="prose-av mt-5" dangerouslySetInnerHTML={{ __html: html }} />

        {a.gallery.length > 0 && (
          <section className="mt-8">
            <SectionTitle>Galeri Foto</SectionTitle>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {a.gallery.map((g, i) => (
                <figure key={i}>
                  <a href={g.url} target="_blank" rel="noopener" className="relative block aspect-[4/3] overflow-hidden rounded-md bg-neutral-200">
                    <Img src={g.url} alt={g.alt || `${a.title} foto ${i + 1}`} sizes="(max-width:768px) 50vw, 380px" />
                  </a>
                  {g.caption && <figcaption className="mt-1 text-xs text-neutral-500">{g.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </section>
        )}

        {(a.videos.length > 0 || embeds.length > 0) && (
          <section className="mt-8 rounded-lg border-2 border-brand p-4" id="fakta-lapangan">
            <h2 className="flex items-center gap-2 text-lg font-black uppercase text-brand">📹 Fakta Lapangan</h2>
            <div className="mt-3 space-y-5">
              {a.videos.map((v, i) => (
                <figure key={`v${i}`}>
                  <video controls preload="metadata" playsInline className="aspect-video w-full rounded-md bg-black" src={v.url} />
                  {v.title && <figcaption className="mt-1 text-xs text-neutral-500">{v.title}</figcaption>}
                </figure>
              ))}
              {embeds.map(({ raw, e }, i) =>
                e ? (
                  <figure key={`e${i}`} className={e.vertical ? "mx-auto max-w-[400px]" : ""}>
                    <div className={`relative overflow-hidden rounded-md bg-neutral-100 ${e.vertical ? "h-[640px]" : "aspect-video"}`}>
                      <iframe src={e.src} title={`Sematan ${e.platform}`} loading="lazy" allowFullScreen allow="encrypted-media; picture-in-picture; clipboard-write" referrerPolicy="strict-origin-when-cross-origin" className="absolute inset-0 h-full w-full border-0" />
                    </div>
                    <figcaption className="mt-1 text-xs text-neutral-500">
                      Sumber {e.platform}: <a href={e.url} target="_blank" rel="noopener nofollow" className="underline">{e.url.slice(0, 70)}</a>
                    </figcaption>
                  </figure>
                ) : isSafeUrl(raw) ? (
                  <p key={`e${i}`} className="text-sm"><a href={raw} target="_blank" rel="noopener nofollow" className="text-brand underline">{raw}</a></p>
                ) : null,
              )}
            </div>
          </section>
        )}

        {a.sources.length > 0 && (
          <section className="mt-6 rounded-md bg-neutral-50 p-4 text-sm">
            <h2 className="font-bold">Sumber:</h2>
            <ul className="mt-1 list-disc pl-5">
              {a.sources.filter((s) => isSafeUrl(s.url)).map((s, i) => (
                <li key={i}><a href={s.url} target="_blank" rel="noopener nofollow" className="text-brand underline">{s.title || s.url}</a></li>
              ))}
            </ul>
          </section>
        )}

        {a.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {a.tags.map((t) => (
              <Link key={t} href={`/tag/${t}`} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold hover:bg-brand hover:text-white">#{tagName(t)}</Link>
            ))}
          </div>
        )}
        <ShareButtons url={url} title={a.title} />
        <div className="mt-6 rounded-md border border-neutral-200 p-4 text-sm">
          <p className="font-bold">{a.author}</p>
          <p className="text-neutral-600">Penulis di {settings.siteName}. <Link href={`/penulis/${slugify(a.author)}`} className="text-brand underline">Lihat tulisan lainnya</Link></p>
        </div>

        {related.length > 0 && (
          <section className="mt-10">
            <SectionTitle>Berita Terkait</SectionTitle>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              {related.map((r) => <CardVertical key={r.id} a={r} cats={cats} />)}
            </div>
          </section>
        )}
      </article>
      <aside className="space-y-8">
        <PopularList items={pop} title="🔥 Terpopuler" />
      </aside>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "NewsArticle",
              mainEntityOfPage: { "@type": "WebPage", "@id": url },
              headline: a.title.slice(0, 110),
              description: a.seo.metaDescription || a.excerpt,
              image: [absImg],
              datePublished: a.publishAt,
              dateModified: a.updatedAt,
              author: [{ "@type": "Person", name: a.author, url: `${siteUrl()}/penulis/${slugify(a.author)}` }],
              publisher: { "@type": "NewsMediaOrganization", name: settings.siteName, logo: { "@type": "ImageObject", url: settings.logoUrl || `${siteUrl()}/icon.svg` } },
              articleSection: cName,
              keywords: a.tags.map(tagName).join(", "),
              inLanguage: "id-ID",
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Beranda", item: siteUrl() },
                { "@type": "ListItem", position: 2, name: cName, item: `${siteUrl()}/kategori/${a.category}` },
                { "@type": "ListItem", position: 3, name: a.title, item: url },
              ],
            },
          ],
        }}
      />
      <Script id={`views-${a.id}`} strategy="afterInteractive">{`(function(){var e=document.getElementById('av-views');if(!e)return;var k='avv_'+e.dataset.id;try{if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,1)}catch(x){}fetch('/api/views/'+e.dataset.id,{method:'POST'}).then(function(r){return r.json()}).then(function(d){if(d&&d.views)e.textContent=Number(d.views).toLocaleString('id-ID')}).catch(function(){})})();`}</Script>
      <Script id="copy-link" strategy="afterInteractive">{`document.addEventListener('click',function(ev){var b=ev.target.closest&&ev.target.closest('[data-copy]');if(!b)return;navigator.clipboard&&navigator.clipboard.writeText(b.dataset.copy).then(function(){b.textContent='✓ Tersalin'})});`}</Script>
    </div>
  );
}
