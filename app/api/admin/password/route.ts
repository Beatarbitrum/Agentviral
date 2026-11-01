import { cookies } from "next/headers";
import { adminGuard, checkCredentials, COOKIE, createSessionValue, sessionCookieOptions } from "@/lib/auth";
import { body, handle } from "@/lib/api";
import { updateSettings } from "@/lib/store";
import { encrypt, hashPassword } from "@/lib/crypto";

export const POST = handle(async (req) => {
  const g = await adminGuard(req);
  if (g) return g;
  const b = await body<{ current?: string; next?: string }>(req);
  if (!(await checkCredentials("admin", String(b.current || "")))) return Response.json({ error: "Password saat ini salah" }, { status: 400 });
  const pw = String(b.next || "");
  if (pw.length < 10) return Response.json({ error: "Password baru minimal 10 karakter" }, { status: 400 });
  await updateSettings((s) => ({ ...s, adminPasswordHashEnc: encrypt(hashPassword(pw)) }));
  (await cookies()).set(COOKIE, await createSessionValue(), sessionCookieOptions);
  return Response.json({ ok: true });
});
