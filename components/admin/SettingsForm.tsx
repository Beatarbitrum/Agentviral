"use client";
import { useEffect, useState } from "react";
import { api } from "./client";
import Uploader from "./Uploader";

type S = {
  siteName: string; tagline: string; description: string; logoUrl?: string; faviconUrl?: string; tickerText?: string; gaId?: string; adsenseClient?: string; contactEmail?: string; fontStyle?: string;
  social: Record<string, string | undefined>;
  ai: { autoGenerate: boolean; autoCount: number; autoPublish: boolean; hasToken: boolean };
  passwordOverridden: boolean;
};

export default function SettingsForm() {
  const [s, setS] = useState<S | null>(null);
  const [msg, setMsg] = useState("");
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState("");
  useEffect(() => { api("/api/admin/settings").then((r) => setS(r.settings)); }, []);
  if (!s) return <p>Memuat…</p>;
  const set = (k: keyof S, v: unknown) => setS({ ...s, [k]: v } as S);
  async function save() {
    try {
      const r = await api("/api/admin/settings", "PUT", { site: s, fontStyle: s!.fontStyle || "modern", ai: { autoGenerate: s!.ai.autoGenerate, autoCount: s!.ai.autoCount, autoPublish: s!.ai.autoPublish } });
      setS(r.settings); setMsg("Tersimpan ✓");
    } catch (e) { setMsg((e as Error).message); }
  }
  async function changePw() {
    if (pw.next !== pw.confirm) return setPwMsg("Konfirmasi password tidak sama");
    try { await api("/api/admin/password", "POST", pw); setPwMsg("Password diganti ✓ (sesi lain otomatis keluar)"); setPw({ current: "", next: "", confirm: "" }); }
    catch (e) { setPwMsg((e as Error).message); }
  }
  const F = ({ k, label, ph }: { k: keyof S; label: string; ph?: string }) => (
    <div><label className="admin-label">{label}</label><input className="admin-input" placeholder={ph} value={(s[k] as string) || ""} onChange={(e) => set(k, e.target.value)} /></div>
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-black">Pengaturan</h1><div className="flex items-center gap-2"><span className="text-sm text-green-700">{msg}</span><button className="btn btn-primary" onClick={save}>Simpan</button></div></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="font-bold">Identitas Situs</h2>
          {F({ k: "siteName", label: "Nama situs" })}
          {F({ k: "tagline", label: "Tagline" })}
          <div><label className="admin-label">Deskripsi</label><textarea className="admin-input" rows={2} value={s.description} onChange={(e) => set("description", e.target.value)} /></div>
          {F({ k: "contactEmail", label: "Email redaksi" })}
          <div><label className="admin-label">Logo</label><div className="flex gap-2"><input className="admin-input" value={s.logoUrl || ""} onChange={(e) => set("logoUrl", e.target.value)} /><Uploader label="Logo" onUploaded={(u) => set("logoUrl", u[0].url)} /></div></div>
          <div><label className="admin-label">Favicon</label><div className="flex gap-2"><input className="admin-input" value={s.faviconUrl || ""} onChange={(e) => set("faviconUrl", e.target.value)} /><Uploader accept="image/png,image/x-icon,image/svg+xml" label="Favicon" onUploaded={(u) => set("faviconUrl", u[0].url)} /></div></div>
          <div>
            <label className="admin-label">Gaya huruf situs</label>
            <select className="admin-input" value={s.fontStyle || "modern"} onChange={(e) => set("fontStyle", e.target.value)}>
              <option value="modern">Modern — judul Plus Jakarta Sans, isi Inter (disarankan)</option>
              <option value="klasik">Klasik — judul Plus Jakarta Sans, isi Source Serif (gaya koran)</option>
              <option value="sistem">Bawaan HP/komputer</option>
            </select>
          </div>
          <div><label className="admin-label">Teks ticker (breaking bar)</label><input className="admin-input" value={s.tickerText || ""} onChange={(e) => set("tickerText", e.target.value)} /></div>
        </section>
        <section className="card space-y-3">
          <h2 className="font-bold">Media Sosial</h2>
          {["facebook", "instagram", "x", "youtube", "tiktok", "telegram"].map((k) => (
            <div key={k}><label className="admin-label">{k}</label><input className="admin-input" placeholder="https://" value={s.social[k] || ""} onChange={(e) => set("social", { ...s.social, [k]: e.target.value })} /></div>
          ))}
        </section>
        <section className="card space-y-3">
          <h2 className="font-bold">Iklan & Analitik</h2>
          {F({ k: "gaId", label: "Google Analytics 4 ID", ph: "G-XXXXXXXXXX" })}
          {F({ k: "adsenseClient", label: "AdSense client ID", ph: "ca-pub-1234567890" })}
          <p className="text-xs text-neutral-500">Skrip dimuat otomatis di halaman publik bila ID valid.</p>
        </section>
        <section className="card space-y-3">
          <h2 className="font-bold">Otomasi</h2>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.ai.autoGenerate} onChange={(e) => set("ai", { ...s.ai, autoGenerate: e.target.checked })} /> Buat draf otomatis dari Google Trends setiap hari (Vercel Cron, ±06:00 WIB)</label>
          <div className="flex items-center gap-2 text-sm">Jumlah draf per hari: <select className="admin-input w-20" value={s.ai.autoCount} onChange={(e) => set("ai", { ...s.ai, autoCount: Number(e.target.value) })}>{[1, 2, 3].map((n) => <option key={n}>{n}</option>)}</select></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.ai.autoPublish} onChange={(e) => set("ai", { ...s.ai, autoPublish: e.target.checked })} /> Langsung terbitkan hasil AI (tidak disarankan — default: simpan sebagai draf)</label>
          {!s.ai.hasToken && <p className="text-xs text-amber-700">Token AI belum diatur — otomasi tidak akan berjalan.</p>}
        </section>
        <section className="card space-y-3">
          <h2 className="font-bold">Ganti Password Admin</h2>
          <p className="text-xs text-neutral-500">{s.passwordOverridden ? "Password sudah diganti dari panel (menggantikan env ADMIN_PASSWORD)." : "Saat ini memakai password dari env ADMIN_PASSWORD."}</p>
          <input type="password" className="admin-input" placeholder="Password saat ini" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          <input type="password" className="admin-input" placeholder="Password baru (min. 10 karakter)" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          <input type="password" className="admin-input" placeholder="Ulangi password baru" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          <div className="flex items-center gap-2"><button className="btn btn-dark" onClick={changePw}>Ganti Password</button><span className="text-sm">{pwMsg}</span></div>
        </section>
      </div>
    </div>
  );
}
