import "server-only";
import { getPublished, getViews, getIndex } from "./store";
import type { ArticleSummary } from "./types";

export const PAGE_SIZE = 12;

export async function popular(n = 5, exclude?: string): Promise<ArticleSummary[]> {
  const [pub, views] = await Promise.all([getPublished(), getViews()]);
  return [...pub]
    .filter((a) => a.id !== exclude)
    .sort((a, b) => (views[b.id] || 0) - (views[a.id] || 0) || +new Date(b.publishAt) - +new Date(a.publishAt))
    .slice(0, n);
}

export function paginate<T>(items: T[], page: number) {
  const total = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  return { items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total };
}

export async function listing(filter: (a: ArticleSummary) => boolean) {
  const [pub, idx] = await Promise.all([getPublished(), getIndex()]);
  return { list: pub.filter(filter), idx };
}
