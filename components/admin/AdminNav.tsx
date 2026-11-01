"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import LogoutButton from "./LogoutButton";

const NAV: [string, string, string][] = [
  ["/admin", "📊", "Dashboard"],
  ["/admin/artikel", "📰", "Artikel"],
  ["/admin/artikel/baru", "✍️", "Tulis Baru"],
  ["/admin/ai", "🤖", "AI Writer"],
  ["/admin/media-otomatis", "🔎", "Media Otomatis"],
  ["/admin/tren", "📈", "Tren Google"],
  ["/admin/taksonomi", "🏷️", "Kategori & Tag"],
  ["/admin/media", "🖼️", "Media"],
  ["/admin/pengaturan", "⚙️", "Pengaturan"],
  ["/admin/api", "🔑", "API & Bot"],
];

function Pending() {
  const { pending } = useLinkStatus();
  // elemen selalu ada (ukuran tetap) agar tidak menggeser tata letak
  return <span aria-hidden className={`spinner ml-auto shrink-0 text-xs transition-opacity ${pending ? "opacity-100" : "opacity-0"}`} />;
}

function isActive(path: string, href: string) {
  if (href === "/admin") return path === "/admin";
  if (href === "/admin/artikel") return path === "/admin/artikel" || (/^\/admin\/artikel\/[^/]+$/.test(path) && path !== "/admin/artikel/baru");
  return path === href || path.startsWith(`${href}/`);
}

export default function AdminNav() {
  const path = usePathname() || "/admin";
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    // HP: geser menu agar item aktif terlihat
    const el = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (el && window.innerWidth < 1024) el.scrollIntoView({ inline: "center", block: "nearest" });
  }, [path]);
  return (
    <aside className="relative z-30 bg-neutral-950 lg:sticky lg:top-0 text-neutral-200 lg:h-screen lg:w-56 lg:shrink-0 lg:overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-2 lg:block lg:py-3">
        <Link href="/admin" className="text-xl font-black text-white"><span className="bg-red-700 px-1">AGENT</span>VIRAL</Link>
        <a href="/" target="_blank" rel="noopener" className="tap px-2 text-xs text-neutral-400 hover:text-white lg:mt-1 lg:min-h-0 lg:justify-start lg:px-0">Lihat situs ↗</a>
      </div>
      {/* HP: menu geser horizontal; desktop: sidebar */}
      <nav ref={navRef} className="no-scrollbar flex snap-x gap-1 overflow-x-auto px-2 pb-2 text-sm lg:block lg:space-y-0.5 lg:overflow-visible">
        {NAV.map(([h, icon, t]) => {
          const active = isActive(path, h);
          return (
            <Link
              key={h}
              href={h}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-md px-3 transition active:scale-[.97] active:bg-white/20 lg:min-h-10 ${active ? "bg-red-700 font-semibold text-white" : "hover:bg-white/10"}`}
            >
              <span aria-hidden>{icon}</span>
              <span>{t}</span>
              <Pending />
            </Link>
          );
        })}
        <LogoutButton />
      </nav>
    </aside>
  );
}
