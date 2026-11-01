import { apiKeyGuard, clientIp, rateLimit } from "@/lib/auth";
import { body, handle } from "@/lib/api";
import { getIndex, isVisible, saveArticle, type ArticleInput } from "@/lib/store";
import { revalidateSite } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

export const GET = handle(async (req) => {
  const g = await apiKeyGuard(req);
  if (g) return g;
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status");
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 20));
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const idx = await getIndex(true);
  let list = idx.articles;
  if (status === "live") list = list.filter((a) => isVisible(a));
  else if (status) list = list.filter((a) => a.status === status);
  const cat = sp.get("category");
  if (cat) list = list.filter((a) => a.category === cat);
  return Response.json({ total: list.length, page, limit, articles: list.slice((page - 1) * limit, page * limit) });
});

export const POST = handle(async (req) => {
  const g = await apiKeyGuard(req);
  if (g) return g;
  const rl = rateLimit(`api:${clientIp(req)}`, 60, 60_000);
  if (!rl.ok) return Response.json({ error: "Rate limit" }, { status: 429 });
  const b = await body<ArticleInput & { coverUrl?: string }>(req);
  if (b.coverUrl && !b.cover) b.cover = { url: b.coverUrl, alt: b.title };
  delete (b as { coverUrl?: string }).coverUrl;
  delete (b as { demo?: boolean }).demo;
  const a = await saveArticle(b);
  revalidateSite();
  return Response.json({ article: a, url: `/berita/${a.slug}` }, { status: 201 });
});
