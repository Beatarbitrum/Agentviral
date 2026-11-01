import Link from "next/link";
import { getIndex, getViews, isVisible, getSettings } from "@/lib/store";
import { formatTanggal } from "@/lib/util";
import DemoControls from "@/components/admin/DemoControls";

export default async function Dashboard() {
  const [idx, views, s] = await Promise.all([getIndex(true), getViews(), getSettings()]);
  const now = Date.now();
  const arts = idx.articles;
  const pub = arts.filter((a) => isVisible(a, now)).length;
  const drafts = arts.filter((a) => a.status === "draft").length;
  const sched = arts.filter((a) => a.status !== "draft" && new Date(a.publishAt).getTime() > now).length;
  const totalViews = Object.values(views).reduce((x, y) => x + y, 0);
  const top = [...arts].sort((a, b) => (views[b.id] || 0) - (views[a.id] || 0)).slice(0, 8);
  const recent = [...arts].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 8);
  const stats = [
    ["Total Artikel", arts.length],
    ["Terbit", pub],
    ["Draf", drafts],
    ["Terjadwal", sched],
    ["Kategori", idx.categories.length],
    ["Tag", idx.tags.length],
    ["Total Views", totalViews.toLocaleString("id-ID")],
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-black">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/admin/artikel/baru" className="btn btn-primary">+ Tulis Artikel</Link>
          <Link href="/admin/ai" className="btn btn-dark">🤖 AI Writer</Link>
        </div>
      </div>
      {!s.ai.tokenEnc && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">Token AI belum diatur. <Link className="underline" href="/admin/ai">Atur di menu AI</Link> untuk memakai AI Writer.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {stats.map(([k, v]) => (
          <div key={k} className="card">
            <p className="text-xs font-semibold uppercase text-neutral-500">{k}</p>
            <p className="mt-1 text-2xl font-black">{v}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="font-bold">🔥 Artikel Terpopuler</h2>
          <ol className="mt-2 divide-y text-sm">
            {top.map((a) => (
              <li key={a.id} className="flex justify-between gap-2 py-2">
                <Link href={`/admin/artikel/${a.id}`} className="line-clamp-1 hover:text-red-700">{a.title}</Link>
                <span className="shrink-0 font-mono text-xs text-neutral-500">{(views[a.id] || 0).toLocaleString("id-ID")}</span>
              </li>
            ))}
            {!top.length && <li className="py-2 text-neutral-500">Belum ada data.</li>}
          </ol>
        </section>
        <section className="card">
          <h2 className="font-bold">🕒 Terakhir Diperbarui</h2>
          <ul className="mt-2 divide-y text-sm">
            {recent.map((a) => (
              <li key={a.id} className="flex justify-between gap-2 py-2">
                <Link href={`/admin/artikel/${a.id}`} className="line-clamp-1 hover:text-red-700">{a.title}</Link>
                <span className="shrink-0 text-xs text-neutral-500">{a.status} · {formatTanggal(a.updatedAt, false).split(", ")[1]}</span>
              </li>
            ))}
            {!recent.length && <li className="py-2 text-neutral-500">Belum ada artikel.</li>}
          </ul>
        </section>
      </div>
      <DemoControls hasDemo={arts.some((a) => a.demo)} />
      <p className="text-xs text-neutral-500">Catatan: jumlah views bersifat perkiraan (dikumpulkan per instance server dan disimpan berkala).</p>
    </div>
  );
}
