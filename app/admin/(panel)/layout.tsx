import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import LogoutButton from "@/components/admin/LogoutButton";

export const dynamic = "force-dynamic";

const NAV = [
  ["/admin", "📊 Dashboard"],
  ["/admin/artikel", "📰 Artikel"],
  ["/admin/artikel/baru", "✍️ Tulis Baru"],
  ["/admin/ai", "🤖 AI Writer"],
  ["/admin/media-otomatis", "🔎 Media Otomatis"],
  ["/admin/tren", "📈 Tren Google"],
  ["/admin/taksonomi", "🏷️ Kategori & Tag"],
  ["/admin/media", "🖼️ Media"],
  ["/admin/pengaturan", "⚙️ Pengaturan"],
  ["/admin/api", "🔑 API & Bot"],
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return (
    <div className="lg:flex">
      <aside className="bg-neutral-950 text-neutral-200 lg:sticky lg:top-0 lg:h-screen lg:w-56 lg:shrink-0">
        <div className="flex items-center justify-between px-4 py-3 lg:block">
          <Link href="/admin" className="text-xl font-black text-white"><span className="bg-red-700 px-1">AGENT</span>VIRAL</Link>
          <Link href="/" target="_blank" className="text-xs text-neutral-400 hover:text-white lg:mt-1 lg:block">Lihat situs ↗</Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 text-sm lg:block lg:space-y-0.5">
          {NAV.map(([h, t]) => (
            <Link key={h} href={h} className="block shrink-0 rounded px-3 py-2 hover:bg-white/10">{t}</Link>
          ))}
          <LogoutButton />
        </nav>
      </aside>
      <div className="min-w-0 flex-1 p-4 lg:p-6">{children}</div>
    </div>
  );
}
