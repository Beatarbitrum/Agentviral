import { adminGuard } from "@/lib/auth";
import { body, handle } from "@/lib/api";
import { deleteArticle, getArticle, saveArticle, type ArticleInput } from "@/lib/store";
import { revalidateSite } from "@/lib/revalidate";

export const GET = handle(async (req, { params }) => {
  const g = await adminGuard(req);
  if (g) return g;
  const a = await getArticle((await params).id, true);
  return a ? Response.json({ article: a }) : Response.json({ error: "Tidak ditemukan" }, { status: 404 });
});

export const PUT = handle(async (req, { params }) => {
  const g = await adminGuard(req);
  if (g) return g;
  const a = await saveArticle(await body<ArticleInput>(req), (await params).id);
  revalidateSite();
  return Response.json({ article: a });
});

export const DELETE = handle(async (req, { params }) => {
  const g = await adminGuard(req);
  if (g) return g;
  await deleteArticle((await params).id);
  revalidateSite();
  return Response.json({ ok: true });
});
