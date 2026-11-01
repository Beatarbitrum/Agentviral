import { adminGuard } from "@/lib/auth";
import { body, handle } from "@/lib/api";
import { deleteMedia, listMedia } from "@/lib/blob";

export const GET = handle(async (req) => {
  const g = await adminGuard(req);
  if (g) return g;
  const cursor = new URL(req.url).searchParams.get("cursor") || undefined;
  const r = await listMedia(cursor);
  return Response.json({ blobs: r.blobs.map((b) => ({ url: b.url, pathname: b.pathname, size: b.size, uploadedAt: b.uploadedAt })), cursor: r.cursor, hasMore: r.hasMore });
});

export const DELETE = handle(async (req) => {
  const g = await adminGuard(req);
  if (g) return g;
  const b = await body<{ url: string }>(req);
  await deleteMedia(String(b.url));
  return Response.json({ ok: true });
});
