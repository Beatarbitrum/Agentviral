"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "./client";
import { Btn, Spinner } from "./ui";

const PROVIDERS = [
  ["openai", "OpenAI", "auto"],
  ["gemini", "Google Gemini", "auto"],
  ["groq", "Groq", "auto"],
  ["openrouter", "OpenRouter", "auto"],
  ["custom", "Custom (OpenAI-compatible)", "auto"],
];

type AiS = { provider: string; model: string; baseUrl?: string; tokenMasked: string; hasToken: boolean; autoPublish: boolean };

export default function AiPanel() {
  const [ai, setAi] = useState<AiS | null>(null);
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState("");
  const [test, setTest] = useState("");
  const [w, setW] = useState({ topic: "", sourceUrl: "", notes: "", publish: false });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ id: string; title: string; titles: string[] } | null>(null);
  const [err, setErr] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [mMsg, setMMsg] = useState("");
  const [media, setMedia] = useState("");
  const [autoMedia, setAutoMedia] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api("/api/admin/settings").then((r) => { setAi(r.settings.ai); setAutoMedia(r.settings.media?.autoAfterAi !== false); }); }, []);
  if (!ai) return <p className="flex items-center gap-2 text-neutral-500"><Spinner /> Memuat…</p>;
  async function save(extra: Record<string, unknown> = {}) {
    if (saving) return;
    setSaving(true); setMsg("");
    try {
      const r = await api("/api/admin/settings", "PUT", { ai: { provider: ai!.provider, model: ai!.model, baseUrl: ai!.baseUrl || "", ...(token ? { token } : {}), ...extra } });
      setAi(r.settings.ai); setToken(""); setMsg("Tersimpan ✓");
    } catch (e) { setMsg((e as Error).message); } finally { setSaving(false); }
  }
  async function runTest() {
    setTest("Menguji…");
    try { const r = await api("/api/admin/ai", "POST", { action: "test" }); setTest(`✓ Terhubung (${r.model}, ${r.ms} ms): "${r.reply}"`); }
    catch (e) { setTest(`✕ ${(e as Error).message}`); }
  }
  async function loadModels() {
    setMMsg("Memuat model…");
    try { const r = await api("/api/admin/ai", "POST", { action: "models" }); setModels(r.models); setMMsg(`${r.models.length} model tersedia untuk token ini`); }
    catch (e) { setMMsg((e as Error).message); }
  }
  async function generate() {
    setBusy(true); setErr(""); setResult(null); setMedia("");
    try {
      const r = await api("/api/admin/ai", "POST", { action: "generate", ...w });
      setResult({ id: r.article.id, title: r.article.title, titles: r.titles });
      if (!autoMedia) return;
      setMedia("🔎 Mencari foto sampul, video & referensi…");
      api("/api/admin/ai", "POST", { action: "enrich", id: r.article.id })
        .then((m) => setMedia(`✓ ${(m.log || []).join(" · ")}`))
        .catch((e) => setMedia(`Media otomatis gagal: ${(e as Error).message}`));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">🤖 AI</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="font-bold">Pengaturan Provider</h2>
          <div><label className="admin-label">Provider</label>
            <select className="admin-input" value={ai.provider} onChange={(e) => setAi({ ...ai, provider: e.target.value, model: PROVIDERS.find((p) => p[0] === e.target.value)?.[2] || ai.model })}>
              {PROVIDERS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="admin-label">Model</label>
            <label className="admin-check mb-2 text-sm"><input type="checkbox" checked={!ai.model || ai.model === "auto"} onChange={(e) => setAi({ ...ai, model: e.target.checked ? "auto" : (models[0] || "") })} /> Otomatis (pilih model terbaik yang tersedia untuk token ini)</label>
            {ai.model && ai.model !== "auto" && (
              <>
                {models.length > 0 ? (
                  <select className="admin-input font-mono text-sm" value={models.includes(ai.model) ? ai.model : ""} onChange={(e) => setAi({ ...ai, model: e.target.value })}>
                    {!models.includes(ai.model) && <option value="">{ai.model} (tidak ada di daftar)</option>}
                    {models.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                ) : (
                  <input className="admin-input font-mono text-sm" value={ai.model} onChange={(e) => setAi({ ...ai, model: e.target.value })} />
                )}
              </>
            )}
            <div className="mt-1 flex items-center gap-2">
              <button type="button" className="tap px-1 text-xs underline" onClick={loadModels} disabled={!ai.hasToken}>Lihat model yang tersedia</button>
              {mMsg && <span className="text-xs text-neutral-500">{mMsg}</span>}
            </div>
            <p className="mt-1 text-xs text-neutral-500">Mode otomatis juga pindah ke model lain bila model lama dipensiunkan provider.</p>
          </div>
          {ai.provider === "custom" && <div><label className="admin-label">Base URL (tanpa /chat/completions)</label><input className="admin-input font-mono text-sm" placeholder="https://api.contoh.com/v1" value={ai.baseUrl || ""} onChange={(e) => setAi({ ...ai, baseUrl: e.target.value })} /></div>}
          <div>
            <label className="admin-label">API Token</label>
            {ai.hasToken && <p className="mb-1 font-mono text-sm">Tersimpan: {ai.tokenMasked} <button type="button" className="tap ml-2 px-2 text-xs text-red-700" onClick={() => confirm("Hapus token AI?") && save({ deleteToken: true })}>Hapus</button></p>}
            <input type="password" autoComplete="off" className="admin-input font-mono text-sm" placeholder={ai.hasToken ? "Tempel token baru untuk mengganti" : "Tempel token API"} value={token} onChange={(e) => setToken(e.target.value)} />
            <p className="mt-1 text-xs text-neutral-500">Token dienkripsi (AES-256-GCM) di server dan tidak pernah dikirim utuh ke browser.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Btn className="btn btn-primary" busy={saving} busyText="Menyimpan…" onClick={() => save()}>Simpan</Btn>
            <Btn className="btn btn-ghost" busy={test === "Menguji…"} onClick={runTest} disabled={!ai.hasToken}>Tes koneksi</Btn>
            <span className="text-sm">{msg}</span>
          </div>
          {test && <p className="rounded bg-neutral-50 p-2 text-sm">{test}</p>}
        </section>
        <section className="card space-y-3">
          <h2 className="font-bold">✍️ AI Writer</h2>
          <p className="text-xs text-neutral-500">AI menulis berdasarkan materi Anda dengan gaya viral namun faktual. Hasil disimpan sebagai <b>DRAF</b> untuk ditinjau.</p>
          <div><label className="admin-label">Topik</label><input className="admin-input" value={w.topic} onChange={(e) => setW({ ...w, topic: e.target.value })} placeholder="mis. Tren kuliner baru di media sosial" /></div>
          <div><label className="admin-label">URL sumber (opsional)</label><input className="admin-input" value={w.sourceUrl} onChange={(e) => setW({ ...w, sourceUrl: e.target.value })} placeholder="https://…" /></div>
          <div><label className="admin-label">Catatan / fakta (opsional)</label><textarea className="admin-input" rows={5} value={w.notes} onChange={(e) => setW({ ...w, notes: e.target.value })} placeholder="Fakta, kutipan, angka yang sudah diverifikasi…" /></div>
          <label className="admin-check text-sm"><input type="checkbox" checked={w.publish} onChange={(e) => setW({ ...w, publish: e.target.checked })} /> Langsung terbitkan (default: draf)</label>
          <Btn className="btn btn-dark w-full sm:w-auto" busy={busy} busyText="AI sedang menulis… (±20–50 dtk)" disabled={!ai.hasToken} onClick={generate}>Buat Artikel</Btn>
          {!ai.hasToken && <p className="text-xs text-amber-700">Simpan token AI terlebih dahulu.</p>}
          {err && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
          {result && (
            <div className="rounded bg-green-50 p-3 text-sm">
              <p>✓ Draf dibuat: <Link className="font-bold underline" href={`/admin/artikel/${result.id}`}>{result.title}</Link></p>
              {media && <p className="mt-1 text-xs">{media}</p>}
              {result.titles?.length > 1 && <><p className="mt-2 text-xs font-semibold">Opsi judul lain:</p><ul className="list-disc pl-5 text-xs">{result.titles.map((t) => <li key={t}>{t}</li>)}</ul></>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
