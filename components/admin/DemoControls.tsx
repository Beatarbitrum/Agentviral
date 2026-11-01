"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "./ui";
import { api } from "./client";

export default function DemoControls({ hasDemo }: { hasDemo: boolean }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const router = useRouter();
  async function run(method: "POST" | "DELETE") {
    if (method === "DELETE" && !confirm("Hapus semua artikel demo?")) return;
    setBusy(true);
    try {
      const r = await api("/api/admin/seed", method);
      setMsg(r.message || `${r.deleted} artikel demo dihapus`);
      startTransition(() => router.refresh()); // segarkan data dashboard tanpa memuat ulang halaman
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
        <button type="button" className="btn btn-danger" disabled={busy || refreshing} onClick={() => run("DELETE")}>{busy || refreshing ? <Spinner /> : "🗑"} Hapus semua artikel demo</button>
      ) : (
        <button type="button" className="btn btn-ghost" disabled={busy || refreshing} onClick={() => run("POST")}>{busy || refreshing ? <Spinner /> : "➕"} Buat 6 artikel demo</button>
      )}
      {msg && <span className="text-neutral-600">{msg}</span>}
    </section>
  );
}
