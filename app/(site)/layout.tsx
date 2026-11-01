import Link from "next/link";
import Script from "next/script";
import { getSettings, getIndex, getPublished } from "@/lib/store";
import JsonLd from "@/components/JsonLd";
import { siteUrl } from "@/lib/util";

export const revalidate = 300;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [s, idx, pub] = await Promise.all([getSettings(), getIndex(), getPublished()]);
  const breaking = pub.filter((a) => a.breaking).slice(0, 6);
  const cats = idx.categories;
  const year = new Date().getFullYear();
  const socials = Object.entries(s.social).filter(([, v]) => v);
  return (
    <>
      <a href="#konten" className="sr-only focus:not-sr-only">Lewati ke konten</a>
      <header className="border-b-4 border-brand bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2" aria-label={`${s.siteName} beranda`}>
            {s.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.logoUrl} alt={s.siteName} className="h-9 w-auto" />
            ) : (
              <span className="text-2xl font-black tracking-tight sm:text-3xl">
                <span className="bg-brand px-1.5">AGENT</span>VIRAL
              </span>
            )}
          </Link>
          <form action="/cari" method="get" role="search" className="hidden flex-1 justify-end sm:flex">
            <input name="q" placeholder="Cari berita…" aria-label="Cari berita" className="w-64 rounded-l-md border-0 px-3 py-2 text-sm text-neutral-900 outline-none" />
            <button className="rounded-r-md bg-brand px-3 text-sm font-bold">Cari</button>
          </form>
          <details className="relative sm:hidden">
            <summary className="cursor-pointer list-none rounded border border-white/30 px-3 py-1.5 text-sm font-bold">☰ Menu</summary>
            <div className="absolute right-0 z-50 mt-2 w-64 rounded-md bg-white p-3 text-neutral-900 shadow-xl">
              <form action="/cari" method="get" role="search" className="mb-2 flex">
                <input name="q" placeholder="Cari berita…" aria-label="Cari berita" className="admin-input rounded-r-none" />
                <button className="rounded-r-md bg-brand px-3 text-sm font-bold text-white">Cari</button>
              </form>
              {cats.map((c) => (
                <Link key={c.slug} href={`/kategori/${c.slug}`} className="block border-b border-neutral-100 py-2 text-sm font-semibold">{c.name}</Link>
              ))}
            </div>
          </details>
        </div>
        <nav aria-label="Kategori" className="bg-brand">
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 text-sm font-bold uppercase">
            <Link href="/" className="shrink-0 px-3 py-2.5 hover:bg-brand-dark">Beranda</Link>
            {cats.map((c) => (
              <Link key={c.slug} href={`/kategori/${c.slug}`} className="shrink-0 px-3 py-2.5 hover:bg-brand-dark">{c.name}</Link>
            ))}
            <Link href="/halaman/1" className="shrink-0 px-3 py-2.5 hover:bg-brand-dark">Indeks</Link>
          </div>
        </nav>
      </header>
      {(breaking.length > 0 || s.tickerText) && (
        <div className="ticker border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-stretch">
            <span className="z-10 shrink-0 bg-ink px-3 py-2 text-xs font-black uppercase tracking-wider text-white">⚡ Breaking</span>
            <div className="relative flex-1 overflow-hidden py-2 text-sm">
              <div className="ticker-track">
                {s.tickerText && <span className="font-semibold">{s.tickerText}</span>}
                {breaking.map((a) => (
                  <Link key={a.id} href={`/berita/${a.slug}`} className="font-semibold hover:text-brand">
                    <span className="text-brand">●</span> {a.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      <main id="konten" className="mx-auto min-h-[60vh] max-w-6xl px-4 py-6">{children}</main>
      <footer className="mt-10 bg-ink text-neutral-300">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <p className="text-2xl font-black text-white"><span className="bg-brand px-1.5">AGENT</span>VIRAL</p>
            <p className="mt-2 text-sm">{s.description}</p>
            {socials.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {socials.map(([k, v]) => (
                  <a key={k} href={v} rel="noopener me" target="_blank" className="rounded bg-white/10 px-2 py-1 capitalize hover:bg-brand">{k}</a>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="font-bold text-white">Kategori</p>
            <ul className="mt-2 grid grid-cols-2 gap-1 text-sm">
              {cats.map((c) => (
                <li key={c.slug}><Link href={`/kategori/${c.slug}`} className="hover:text-white">{c.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-bold text-white">Informasi</p>
            <ul className="mt-2 grid grid-cols-2 gap-1 text-sm">
              {[["tentang", "Tentang Kami"], ["redaksi", "Redaksi"], ["pedoman-media-siber", "Pedoman Media Siber"], ["kontak", "Kontak"], ["kebijakan-privasi", "Kebijakan Privasi"], ["disclaimer", "Disclaimer"]].map(([h, t]) => (
                <li key={h}><Link href={`/${h}`} className="hover:text-white">{t}</Link></li>
              ))}
              <li><a href="/rss.xml" className="hover:text-white">RSS</a></li>
              <li><a href="/sitemap.xml" className="hover:text-white">Sitemap</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs">© {year} {s.siteName}. Hak cipta dilindungi.</div>
      </footer>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "NewsMediaOrganization", "@id": `${siteUrl()}/#org`, name: s.siteName, url: siteUrl(), logo: { "@type": "ImageObject", url: s.logoUrl || `${siteUrl()}/icon.svg` }, sameAs: socials.map(([, v]) => v), publishingPrinciples: `${siteUrl()}/pedoman-media-siber` },
            { "@type": "WebSite", "@id": `${siteUrl()}/#website`, name: s.siteName, url: siteUrl(), inLanguage: "id-ID", publisher: { "@id": `${siteUrl()}/#org` }, potentialAction: { "@type": "SearchAction", target: `${siteUrl()}/cari?q={search_term_string}`, "query-input": "required name=search_term_string" } },
          ],
        }}
      />
      {s.gaId && /^G-[A-Z0-9]+$/i.test(s.gaId) && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${s.gaId}`} strategy="afterInteractive" />
          <Script id="ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${s.gaId}');`}</Script>
        </>
      )}
      {s.adsenseClient && /^ca-pub-\d+$/.test(s.adsenseClient) && (
        <Script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${s.adsenseClient}`} crossOrigin="anonymous" strategy="lazyOnload" />
      )}
    </>
  );
}
