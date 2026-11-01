"use client";
import { useEffect, useState } from "react";
import { api } from "./client";

type K = { id: string; name: string; prefix: string; createdAt: string };

export default function ApiPanel() {
  const [keys, setKeys] = useState<K[]>([]);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState("");
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); api("/api/admin/keys").then((r) => setKeys(r.keys)); }, []);
  async function create() {
    const r = await api("/api/admin/keys", "POST", { name: name || "Bot" });
    setKeys(r.keys); setFresh(r.key); setName("");
  }
  async function rename(k: K) {
    const n = prompt("Nama baru", k.name);
    if (n) setKeys((await api("/api/admin/keys", "PATCH", { id: k.id, name: n })).keys);
  }
  async function revoke(k: K) {
    if (confirm(`Cabut key "${k.name}"? Bot yang memakainya tidak bisa akses lagi.`)) setKeys((await api("/api/admin/keys", "DELETE", { id: k.id })).keys);
  }
  const KEY = fresh || "av_KEY_ANDA";
  const code = (s: string) => <pre className="overflow-x-auto rounded bg-neutral-900 p-3 text-xs text-green-200">{s}</pre>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">🔑 API & Bot</h1>
      <section className="card space-y-3">
        <h2 className="font-bold">API Keys</h2>
        <div className="flex gap-2"><input className="admin-input max-w-xs" placeholder="Nama key, mis. Bot Telegram" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn btn-primary" onClick={create}>+ Buat Key</button></div>
        {fresh && (
          <div className="rounded border border-green-300 bg-green-50 p-3 text-sm">
            <p className="font-bold">Key baru (hanya ditampilkan sekali — simpan sekarang):</p>
            <div className="mt-1 flex items-center gap-2"><code className="break-all rounded bg-white px-2 py-1">{fresh}</code><button className="btn btn-ghost" onClick={() => navigator.clipboard.writeText(fresh)}>Salin</button></div>
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-neutral-500"><tr><th className="py-1">Nama</th><th>Prefix</th><th>Dibuat</th><th></th></tr></thead>
          <tbody className="divide-y">
            {keys.map((k) => (
              <tr key={k.id}><td className="py-2">{k.name}</td><td className="font-mono text-xs">{k.prefix}</td><td className="text-xs">{new Date(k.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</td>
                <td className="text-right"><button className="mr-3 text-xs text-blue-700" onClick={() => rename(k)}>Ganti nama</button><button className="text-xs text-red-700" onClick={() => revoke(k)}>Cabut</button></td></tr>
            ))}
            {!keys.length && <tr><td colSpan={4} className="py-3 text-neutral-500">Belum ada key.</td></tr>}
          </tbody>
        </table>
        <p className="text-xs text-neutral-500">Key disimpan dalam bentuk hash SHA-256; key asli tidak bisa dilihat lagi setelah dibuat.</p>
      </section>

      <section className="card space-y-3 text-sm">
        <h2 className="font-bold">📘 Dokumentasi REST API</h2>
        <p>Base URL: <code>{origin}/api/v1</code>. Autentikasi: header <code>Authorization: Bearer &lt;API_KEY&gt;</code> (atau <code>x-api-key</code>). Semua body JSON.</p>
        <h3 className="font-bold">Buat artikel — POST /api/v1/articles</h3>
        {code(`curl -X POST ${origin}/api/v1/articles \\
  -H "Authorization: Bearer ${KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Judul berita",
    "subtitle": "Subjudul",
    "body": "## Subjudul\\nIsi artikel dalam **markdown**.",
    "category": "viral",
    "tags": ["Media Sosial", "Tren"],
    "status": "draft",
    "coverUrl": "https://contoh.com/gambar.jpg",
    "embeds": ["https://www.youtube.com/watch?v=xxxx"],
    "sources": [{"title": "Sumber", "url": "https://contoh.com"}],
    "seo": {"metaDescription": "Deskripsi singkat", "focusKeyword": "kata kunci"}
  }'`)}
        <p className="text-xs">Field opsional lain: <code>slug, excerpt, author, publishAt</code> (ISO 8601; masa depan = terjadwal), <code>headline, breaking, featured</code> (boolean), <code>cover</code> {"{url, alt, caption, credit}"}, <code>gallery</code> [{"{url, alt, caption}"}], <code>videos</code> [{"{url, title}"}]. <code>status</code>: <code>draft</code> (default) | <code>published</code> | <code>scheduled</code>. Kategori: viral, nasional, teknologi, hiburan, olahraga, lifestyle, unik (atau slug kategori lain).</p>
        <h3 className="font-bold">Daftar artikel — GET /api/v1/articles</h3>
        {code(`curl "${origin}/api/v1/articles?status=draft&limit=20&page=1" \\
  -H "Authorization: Bearer ${KEY}"`)}
        <p className="text-xs">Filter: <code>status</code> = draft | published | scheduled | live (sudah tayang), <code>category</code>, <code>limit</code> (maks 100), <code>page</code>.</p>
        <h3 className="font-bold">Ambil / ubah / hapus — /api/v1/articles/:id (id atau slug)</h3>
        {code(`curl ${origin}/api/v1/articles/ID_ATAU_SLUG -H "Authorization: Bearer ${KEY}"

curl -X PUT ${origin}/api/v1/articles/ID -H "Authorization: Bearer ${KEY}" \\
  -H "Content-Type: application/json" -d '{"status":"published"}'

curl -X DELETE ${origin}/api/v1/articles/ID -H "Authorization: Bearer ${KEY}"`)}
        <p className="text-xs">Respons error: <code>{"{ \"error\": \"pesan\" }"}</code> dengan status 400/401/404/429. Batas: 60 permintaan tulis per menit per IP.</p>
      </section>
    </div>
  );
}
