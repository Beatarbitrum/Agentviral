"use client";
import { useState } from "react";
import { api } from "./client";

export default function DemoControls({ hasDemo }: { hasDemo: boolean }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(method: "POST" | "DELETE") {
    if (method === "DELETE" && !confirm("Hapus semua artikel demo?")) return;
    setBusy(true);
    try {
      const r = await api("/api/admin/seed", method);
      setMsg(r.message || `${r.deleted} artikel demo dihapus`);
      setTimeout(() => location.reload(), 800);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card flex flex-wrap items-center gap-3 text-sm">
      <span className="font-bold">Konten demo:</span>
      {hasDemo ? (
        <button className="btn btn-danger" disabled={busy} onClick={() => run("DELETE")}>🗑 Hapus semua artikel demo</button>
      ) : (
        <button className="btn btn-ghost" disabled={busy} onClick={() => run("POST")}>➕ Buat 6 artikel demo</button>
      )}
      {msg && <span className="text-neutral-600">{msg}</span>}
    </section>
  );
}
