import { adminGuard } from "@/lib/auth";
import { body, handle } from "@/lib/api";
import { saveTaxonomy } from "@/lib/store";
import { revalidateSite } from "@/lib/revalidate";
import type { Category, Tag } from "@/lib/types";

export const PUT = handle(async (req) => {
  const g = await adminGuard(req);
  if (g) return g;
  const b = await body<{ categories: Category[]; tags: Tag[] }>(req);
  const idx = await saveTaxonomy(b.categories || [], b.tags || []);
  revalidateSite();
  return Response.json({ categories: idx.categories, tags: idx.tags });
});
