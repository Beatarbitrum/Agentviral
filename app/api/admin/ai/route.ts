import { adminGuard } from "@/lib/auth";
import { body, handle } from "@/lib/api";
import { getSettings } from "@/lib/store";
import { assist, chat, listModels } from "@/lib/ai";
import * as aiLib from "@/lib/ai";
import { generateDraft } from "@/lib/aiflow";
import { enrichArticle, findMedia } from "@/lib/media";
import { testProvider } from "@/lib/mediaProviders";
import { revalidateSite } from "@/lib/revalidate";
import type { SourceLink } from "@/lib/types";

export const maxDuration = 120;

export const POST = handle(async (req) => {
  const g = await adminGuard(req);
  if (g) return g;
  const b = await body<{ action: string; id?: string; providerId?: string; keyword?: string; sourceUrls?: string[]; title?: string; body?: string; topic?: string; notes?: string; sourceUrl?: string; sources?: SourceLink[]; publish?: boolean }>(req);
  const s = await getSettings(true);
  if (b.action === "test") {
    const t0 = Date.now();
    const out = await chat(s.ai, [{ role: "user", content: "Balas hanya dengan kata: OK" }], 10);
    return Response.json({ ok: true, reply: out.slice(0, 50), ms: Date.now() - t0, model: aiLib.lastModelUsed || s.ai.model });
  }
  if (b.action === "models") {
    return Response.json({ models: await listModels(s.ai) });
  }
  if (b.action === "enrich") {
    if (!b.id) throw new Error("id artikel wajib");
    const r = await enrichArticle(b.id);
    revalidateSite();
    return Response.json({ ok: true, cover: r.article.cover, embeds: r.article.embeds, sources: r.article.sources, log: r.found.log });
  }
  if (b.action === "media_test") {
    const p = s.media.providers.find((x) => x.id === b.providerId);
    if (!p) throw new Error("Penyedia tidak ditemukan — simpan dulu");
    const t0 = Date.now();
    const n = await testProvider(p);
    return Response.json({ ok: true, results: n, ms: Date.now() - t0 });
  }
  if (b.action === "media_preview") {
    return Response.json(await findMedia({ title: b.title || "berita viral hari ini" }, s.media));
  }
  if (b.action === "find_media") {
    if (!b.title) throw new Error("Isi judul dulu");
    return Response.json(await findMedia({ title: b.title, keyword: b.keyword, sourceUrls: b.sourceUrls || [] }, s.media));
  }
  if (b.action === "generate") {
    const r = await generateDraft({ topic: b.topic, notes: b.notes, sourceUrl: b.sourceUrl || undefined, sources: b.sources, publish: b.publish === true });
    revalidateSite();
    return Response.json(r);
  }
  return Response.json(await assist(s.ai, b.action, b.title || "", b.body || ""));
});
