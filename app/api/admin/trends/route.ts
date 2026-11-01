import { adminGuard } from "@/lib/auth";
import { handle } from "@/lib/api";
import { fetchTrends } from "@/lib/trends";
import { getIndex } from "@/lib/store";

export const GET = handle(async (req) => {
  const g = await adminGuard(req);
  if (g) return g;
  const [items, idx] = await Promise.all([fetchTrends("ID"), getIndex()]);
  return Response.json({ items, done: idx.trendsDone || [] });
});
