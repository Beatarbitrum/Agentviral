import { flushViews, getIndex, getSettings, markTrendDone } from "@/lib/store";
import { fetchTrends } from "@/lib/trends";
import { generateDraft } from "@/lib/aiflow";
import { enrichArticle } from "@/lib/media";
import { revalidateSite } from "@/lib/revalidate";
import { safeEqual } from "@/lib/crypto";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET || "";
  const auth = req.headers.get("authorization") || "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const log: string[] = [];
  await flushViews(true);
  revalidateSite();
  log.push("revalidated");
  const s = await getSettings(true);
  if (s.ai.autoGenerate && s.ai.tokenEnc) {
    try {
      const [trends, idx] = await Promise.all([fetchTrends("ID"), getIndex(true)]);
      const done = new Set(idx.trendsDone || []);
      const picks = trends.filter((t) => !done.has(t.title)).slice(0, s.ai.autoCount || 1);
      for (const t of picks) {
        const notes = t.news.map((n) => `- ${n.title} (${n.source}) ${n.url}`).join("\n");
        const r = await generateDraft({ topic: t.title, notes: `Topik trending Google Indonesia (${t.traffic} pencarian).\nBerita terkait:\n${notes}`, sources: t.news.slice(0, 3).map((n) => ({ title: `${n.source}: ${n.title}`, url: n.url })) });
        await markTrendDone(t.title);
        try { if (s.media.autoAfterAi) await enrichArticle(r.article.id); } catch { /* media opsional */ }
        log.push(`draft: ${r.article.title}`);
      }
      revalidateSite();
    } catch (e) {
      log.push(`autogen error: ${(e as Error).message}`);
    }
  } else log.push("autogen off");
  return Response.json({ ok: true, log });
}
