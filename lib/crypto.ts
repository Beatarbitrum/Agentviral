import "server-only";
import crypto from "node:crypto";

function key(): Buffer {
  const k = process.env.ENCRYPTION_KEY || "";
  if (!k) throw new Error("ENCRYPTION_KEY is not set");
  // Accept hex(64) or any string (derived with sha256)
  if (/^[0-9a-f]{64}$/i.test(k)) return Buffer.from(k, "hex");
  return crypto.createHash("sha256").update(k).digest();
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(":");
}

export function decrypt(payload: string | undefined | null): string | null {
  if (!payload) return null;
  try {
    const [v, iv, tag, ct] = payload.split(":");
    if (v !== "v1") return null;
    const d = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function mask(secret: string | null): string {
  if (!secret) return "";
  if (secret.length <= 8) return "••••";
  return secret.slice(0, 3) + "••••••••" + secret.slice(-4);
}

export function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${h.toString("base64url")}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [alg, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const h = crypto.scryptSync(pw, Buffer.from(salt, "base64url"), 64);
  return crypto.timingSafeEqual(h, Buffer.from(hash, "base64url"));
}

export function randomId(bytes = 9): string {
  return crypto.randomBytes(bytes).toString("base64url").replace(/[-_]/g, "x");
}

export function randomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hmac(data: string): string {
  const s = process.env.SESSION_SECRET || "";
  if (!s) throw new Error("SESSION_SECRET is not set");
  return crypto.createHmac("sha256", s).update(data).digest("base64url");
}
