import { cookies } from "next/headers";
import { checkCredentials, clientIp, isLimited, COOKIE, createSessionValue, rateLimit, sessionCookieOptions } from "@/lib/auth";
import { body, handle } from "@/lib/api";

export const POST = handle(async (req) => {
  const ip = clientIp(req);
  const rl = isLimited(`login:${ip}`, 5);
  if (rl.limited) return Response.json({ error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(rl.retryAfter / 60)} menit.` }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });
  const b = await body<{ username?: string; password?: string }>(req);
  const ok = await checkCredentials(String(b.username || ""), String(b.password || ""));
  if (!ok) {
    rateLimit(`login:${ip}`, 5, 15 * 60_000);
    await new Promise((r) => setTimeout(r, 400));
    return Response.json({ error: "Username atau password salah" }, { status: 401 });
  }
  (await cookies()).set(COOKIE, await createSessionValue(), sessionCookieOptions);
  return Response.json({ ok: true });
});
