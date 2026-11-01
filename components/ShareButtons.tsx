export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const items = [
    { n: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}`, c: "bg-[#25D366]" },
    { n: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, c: "bg-[#1877F2]" },
    { n: "X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`, c: "bg-black" },
    { n: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}`, c: "bg-[#229ED9]" },
  ];
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Bagikan">
      <span className="text-xs font-bold uppercase text-neutral-500">Bagikan:</span>
      {items.map((i) => (
        <a key={i.n} href={i.href} target="_blank" rel="noopener nofollow" className={`${i.c} rounded px-3 py-1.5 text-xs font-bold text-white hover:opacity-90`}>{i.n}</a>
      ))}
      <button type="button" data-copy={url} className="rounded border border-neutral-300 px-3 py-1.5 text-xs font-bold hover:bg-neutral-50">🔗 Salin Tautan</button>
    </div>
  );
}
