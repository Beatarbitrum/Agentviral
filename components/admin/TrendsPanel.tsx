"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "./client";
import { Btn, Spinner } from "./ui";

type T = { title: string; traffic: string; pubDate: string; picture?: string; news: { title: string; url: string; source: string }[] };

export default function TrendsPanel() {
  const [items, setItems] = useState<T[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [made, setMade] = useState<Record<string, string>>({});
  useEffect(() => { api("/api/admin/trends").then((r) => { setItems(r.items); setDone(r.done); }).catch((e) => setErr(e.message)).finally(() => setLoading(false)); }, []);
  async function gen(t: T) {
    setBusy(t.title); setErr("");
    try {
      const notes = `Topik trending di Google Indonesia (${t.traffic} pencarian).\nBerita terkait:\n` + t.news.map((n) => `- ${n.title} (${n.source}) ${n.url}`).join("\n");
      const r = await api("/api/admin/ai", "POST", { action: "generate", topic: t.title, notes, sources: t.news.slice(0, 3).map((n) => ({ title: `${n.source}: ${n.title}`, url: n.url })) });
      setMade({ ...made, [t.title]: r.article.id });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(""); }
  }
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-black">📈 Tren Google Indonesia</h1><p className="text-sm text-neutral-500">Sumber: trends.google.com/trending/rss?geo=ID</p></div>
      {err && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      {loading && <p className="flex items-center gap-2 text-neutral-500"><Spinner /> Memuat tren…</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((t) => (
          <div key={t.title} className="card space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div><p className="text-lg font-black">{t.title}</p><p className="text-xs text-neutral-500">{t.traffic} pencarian · {t.pubDate && new Date(t.pubDate).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</p></div>
              {made[t.title] ? <Link className="btn btn-ghost text-green-700" href={`/admin/artikel/${made[t.title]}`}>✓ Buka draf</Link> : (
                <Btn className="btn btn-dark shrink-0" busy={busy === t.title} busyText="Menulis…" disabled={!!busy} onClick={() => gen(t)}>✨ Buat draf</Btn>
              )}
            </div>
            {done.includes(t.title) && <p className="text-xs text-amber-700">Sudah pernah dibuatkan draf otomatis.</p>}
            <ul className="space-y-0.5 text-xs">{t.news.slice(0, 3).map((n) => <li key={n.url}><a className="text-blue-700 hover:underline" target="_blank" rel="noopener" href={n.url}>{n.source}: {n.title}</a></li>)}</ul>
          </div>
        ))}
      </div>
    </div>
  );
}
