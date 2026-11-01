import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt, hmac, safeEqual, sha256, verifyPassword, randomToken } from "./crypto";
import { getSettings, getKeys } from "./store";

export const COOKIE = "av_session";
const MAX_AGE = 60 * 60 * 12; // 12 jam

async function passwordFingerprint(): Promise<string> {
  const s = await getSettings();
  const h = decrypt(s.adminPasswordHashEnc);
  return sha256(h || `env:${process.env.ADMIN_PASSWORD || ""}`).slice(0, 12);
}

export async function checkCredentials(username: string, password: string): Promise<boolean> {
  if (username !== "admin" || !password) return false;
  const s = await getSettings(true);
  const stored = decrypt(s.adminPasswordHashEnc);
  if (stored) return verifyPassword(password, stored);
  const envPw = process.env.ADMIN_PASSWORD || "";
  if (!envPw) return false;
  return safeEqual(sha256(password), sha256(envPw));
}

export async function createSessionValue(): Promise<string> {
  const payload = Buffer.from(JSON.stringify({ u: "admin", exp: Date.now() + MAX_AGE * 1000, pv: await passwordFingerprint(), n: randomToken(6) })).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

export async function verifySessionValue(v?: string): Promise<boolean> {
  if (!v) return false;
  const [payload, sig] = v.split(".");
  if (!payload || !sig || !safeEqual(sig, hmac(payload))) return false;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (p.u !== "admin" || typeof p.exp !== "number" || p.exp < Date.now()) return false;
    return p.pv === (await passwordFingerprint());
  } catch {
    return false;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" && !process.env.LOCAL_HTTP,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
};

export async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return verifySessionValue(c.get(COOKIE)?.value);
}

export async function requireAdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export function unauthorized() {
  return Response.json({ error: "Tidak terautentikasi" }, { status: 401 });
}

/** For API routes: also enforces same-origin for state-changing requests (CSRF). */
export async function adminGuard(req: Request): Promise<Response | null> {
  if (!["GET", "HEAD"].includes(req.method)) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) return Response.json({ error: "Origin tidak valid" }, { status: 403 });
  }
  if (!(await isAdmin())) return unauthorized();
  return null;
}

export async function apiKeyGuard(req: Request): Promise<Response | null> {
  const h = req.headers.get("authorization") || "";
  const key = h.startsWith("Bearer ") ? h.slice(7).trim() : req.headers.get("x-api-key") || "";
  if (!key) return Response.json({ error: "API key diperlukan (Authorization: Bearer <key>)" }, { status: 401 });
  const keys = await getKeys();
  const hash = sha256(key);
  if (!keys.some((k) => safeEqual(k.hash, hash))) return Response.json({ error: "API key tidak valid" }, { status: 401 });
  return null;
}

// ---- simple in-memory rate limit (per instance) ----
const buckets = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.n++;
  if (b.n > max) return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

export function isLimited(key: string, max: number): { limited: boolean; retryAfter: number } {
  const b = buckets.get(key);
  if (!b || b.reset < Date.now()) return { limited: false, retryAfter: 0 };
  return { limited: b.n >= max, retryAfter: Math.ceil((b.reset - Date.now()) / 1000) };
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}
