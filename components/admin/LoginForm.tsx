"use client";
import { useState } from "react";
import { api } from "./client";

export default function LoginForm() {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setErr("");
    try {
      await api("/api/admin/login", "POST", { username: f.get("username"), password: f.get("password") });
      window.location.href = "/admin";
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      <div>
        <label className="admin-label" htmlFor="u">Username</label>
        <input id="u" name="username" className="admin-input" autoComplete="username" defaultValue="admin" required />
      </div>
      <div>
        <label className="admin-label" htmlFor="p">Password</label>
        <input id="p" name="password" type="password" className="admin-input" autoComplete="current-password" required />
      </div>
      {err && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Memeriksa…" : "Masuk"}</button>
    </form>
  );
}
