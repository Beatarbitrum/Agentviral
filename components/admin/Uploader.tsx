"use client";
import { useRef, useState } from "react";
import { slugifyClient } from "./client";
import { Spinner } from "./ui";

export async function uploadFile(file: File, onProgress?: (p: number) => void): Promise<string> {
  const d = new Date();
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const base = slugifyClient(file.name.replace(/\.[^.]+$/, "")) || "file";
  const pathname = `media/${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}/${base}.${ext}`;
  const sign = await fetch("/api/admin/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pathname, contentType: file.type, size: file.size }) });
  const j = (await sign.json()) as { uploadUrl?: string; publicUrl?: string; error?: string };
  if (!sign.ok || !j.uploadUrl) throw new Error(j.error || "Gagal menyiapkan upload");
  await new Promise<void>((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", j.uploadUrl!);
    x.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    x.setRequestHeader("x-upsert", "false");
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    x.onload = () => (x.status < 300 ? resolve() : reject(new Error(`Upload gagal (${x.status})`)));
    x.onerror = () => reject(new Error("Upload gagal (jaringan)"));
    x.send(file);
  });
  return j.publicUrl!;
}

export default function Uploader({ accept = "image/*", multiple = false, label = "Unggah", onUploaded }: { accept?: string; multiple?: boolean; label?: string; onUploaded: (urls: { url: string; name: string; type: string }[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState("");
  async function go(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setErr("");
    const out: { url: string; name: string; type: string }[] = [];
    try {
      for (const f of Array.from(files)) {
        setPct(0);
        out.push({ url: await uploadFile(f, setPct), name: f.name, type: f.type });
      }
      onUploaded(out);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? <><Spinner /> Mengunggah… {pct}%</> : `⬆ ${label}`}
      </button>
      <input ref={ref} type="file" accept={accept} multiple={multiple} hidden onChange={(e) => go(e.target.files)} />
      {err && <span className="text-xs text-red-600">{err}</span>}
    </span>
  );
}
