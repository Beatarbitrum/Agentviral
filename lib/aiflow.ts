import "server-only";
import { generateArticle, fetchSourceText } from "./ai";
import { getSettings, saveArticle } from "./store";
import type { SourceLink } from "./types";

export async function generateDraft(input: { topic?: string; notes?: string; sourceUrl?: string; sources?: SourceLink[]; publish?: boolean }) {
  const s = await getSettings(true);
  let sourceText = "";
  if (input.sourceUrl) {
    try {
      sourceText = await fetchSourceText(input.sourceUrl);
    } catch (e) {
      sourceText = `(Gagal mengambil halaman sumber: ${(e as Error).message})`;
    }
  }
  if (!input.topic && !input.notes && !input.sourceUrl) throw new Error("Isi topik, catatan, atau URL sumber");
  const g = await generateArticle(s.ai, { topic: input.topic, notes: input.notes, sourceText, sourceUrl: input.sourceUrl });
  const sources: SourceLink[] = [...(input.sources || [])];
  if (input.sourceUrl) sources.unshift({ title: new URL(input.sourceUrl).hostname, url: input.sourceUrl });
  const publish = input.publish ?? s.ai.autoPublish;
  const art = await saveArticle({
    title: g.title,
    subtitle: g.subtitle,
    excerpt: g.summary,
    body: g.body,
    category: g.category,
    tags: g.tags,
    status: publish ? "published" : "draft",
    sources,
    seo: { metaTitle: g.title, metaDescription: g.metaDescription, focusKeyword: g.focusKeyword },
    aiGenerated: true,
  });
  return { article: art, titles: g.titles };
}
