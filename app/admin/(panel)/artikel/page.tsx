import ArticleList from "@/components/admin/ArticleList";
import { getIndex } from "@/lib/store";

export default async function Page() {
  const idx = await getIndex(true);
  return <ArticleList initialArticles={idx.articles} initialCategories={idx.categories} />;
}
