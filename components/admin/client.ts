"use client";

export async function api<T = any>(path: string, method = "GET", data?: unknown): Promise<T> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const res = await fetch(path, {
    method,
    headers: data !== undefined ? { "content-type": "application/json" } : undefined,
    body: data !== undefined ? JSON.stringify(data) : undefined,
    credentials: "same-origin",
  });
  const j = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== "undefined" && !path.includes("/login")) {
    window.location.href = "/admin/login";
  }
  if (!res.ok) throw new Error(j.error || `Error ${res.status}`);
  return j as T;
}

export function slugifyClient(s: string) {
  return (s || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, " ").trim().replace(/[\s-]+/g, "-").slice(0, 90);
}
