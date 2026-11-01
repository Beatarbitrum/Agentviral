import { adminGuard } from "@/lib/auth";
import { body, handle } from "@/lib/api";
import { getKeys, updateKeys } from "@/lib/store";
import { randomId, randomToken, sha256 } from "@/lib/crypto";

const view = (k: { id: string; name: string; prefix: string; createdAt: string }) => ({ id: k.id, name: k.name, prefix: k.prefix, createdAt: k.createdAt });

export const GET = handle(async (req) => {
  const g = await adminGuard(req);
  if (g) return g;
  return Response.json({ keys: (await getKeys()).map(view) });
});

export const POST = handle(async (req) => {
  const g = await adminGuard(req);
  if (g) return g;
  const b = await body<{ name?: string }>(req);
  const key = `av_${randomToken(24)}`;
  const rec = { id: randomId(), name: String(b.name || "Bot").slice(0, 60), prefix: key.slice(0, 9) + "…", hash: sha256(key), createdAt: new Date().toISOString() };
  const keys = await updateKeys((k) => [...k, rec]);
  return Response.json({ key, keys: keys.map(view) }, { status: 201 });
});

export const PATCH = handle(async (req) => {
  const g = await adminGuard(req);
  if (g) return g;
  const b = await body<{ id: string; name: string }>(req);
  const keys = await updateKeys((k) => k.map((x) => (x.id === b.id ? { ...x, name: String(b.name || x.name).slice(0, 60) } : x)));
  return Response.json({ keys: keys.map(view) });
});

export const DELETE = handle(async (req) => {
  const g = await adminGuard(req);
  if (g) return g;
  const b = await body<{ id: string }>(req);
  const keys = await updateKeys((k) => k.filter((x) => x.id !== b.id));
  return Response.json({ keys: keys.map(view) });
});
