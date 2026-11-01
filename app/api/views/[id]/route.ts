import { addView, getViews, getIndex } from "@/lib/store";
import { clientIp, rateLimit } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9]{6,20}$/.test(id)) return Response.json({ error: "id" }, { status: 400 });
  if (!(await getIndex()).articles.some((a) => a.id === id)) return Response.json({ error: "not found" }, { status: 404 });
  const rl = rateLimit(`v:${clientIp(req)}`, 60, 60_000);
  if (!rl.ok) return Response.json({ views: ((await getViews())[id] || 0) }, { status: 429 });
  const views = await addView(id);
  return Response.json({ views }, { headers: { "cache-control": "no-store" } });
}
