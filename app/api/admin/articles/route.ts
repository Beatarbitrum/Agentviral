import { adminGuard } from "@/lib/auth";
import { body, handle } from "@/lib/api";
import { getIndex, saveArticle, type ArticleInput } from "@/lib/store";
import { revalidateSite } from "@/lib/revalidate";

export const GET = handle(async (req) => {
  const g = await adminGuard(req);
  if (g) return g;
  const idx = await getIndex(true);
  return Response.json({ articles: idx.articles, categories: idx.categories, tags: idx.tags });
});

export const POST = handle(async (req) => {
  const g = await adminGuard(req);
  if (g) return g;
  const a = await saveArticle(await body<ArticleInput>(req));
  revalidateSite();
  return Response.json({ article: a }, { status: 201 });
});
