import { apiKeyGuard } from "@/lib/auth";
import { body, handle } from "@/lib/api";
import { deleteArticle, findArticle, saveArticle, type ArticleInput } from "@/lib/store";
import { revalidateSite } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

export const GET = handle(async (req, { params }) => {
  const g = await apiKeyGuard(req);
  if (g) return g;
  const a = await findArticle((await params).id);
  return a ? Response.json({ article: a }) : Response.json({ error: "Tidak ditemukan" }, { status: 404 });
});

export const PUT = handle(async (req, { params }) => {
  const g = await apiKeyGuard(req);
  if (g) return g;
  const cur = await findArticle((await params).id);
  if (!cur) return Response.json({ error: "Tidak ditemukan" }, { status: 404 });
  const a = await saveArticle(await body<ArticleInput>(req), cur.id);
  revalidateSite();
  return Response.json({ article: a });
});

export const DELETE = handle(async (req, { params }) => {
  const g = await apiKeyGuard(req);
  if (g) return g;
  const cur = await findArticle((await params).id);
  if (!cur) return Response.json({ error: "Tidak ditemukan" }, { status: 404 });
  await deleteArticle(cur.id);
  revalidateSite();
  return Response.json({ ok: true, deleted: cur.id });
});
