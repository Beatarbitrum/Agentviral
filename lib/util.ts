export function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, 90)
    .replace(/-+$/g, "");
}

export function readingTime(md: string): number {
  const words = (md || "").replace(/[#>*_`\[\]()!-]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function stripMd(md: string): string {
  return (md || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerptOf(md: string, n = 160): string {
  const t = stripMd(md);
  return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t;
}

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function formatTanggal(iso: string, withTime = true): string {
  const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000); // WIB
  const s = `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  if (!withTime) return s;
  return `${s} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} WIB`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function siteUrl(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return u.replace(/\/$/, "");
}

export function isSafeUrl(u?: string): boolean {
  if (!u) return false;
  try {
    const x = new URL(u);
    return x.protocol === "https:" || x.protocol === "http:";
  } catch {
    return false;
  }
}
