import { adminGuard } from "@/lib/auth";
import { body, handle } from "@/lib/api";
import { getSettings, updateSettings } from "@/lib/store";
import { encrypt } from "@/lib/crypto";
import { publicView } from "@/lib/settingsView";
import { revalidateSite } from "@/lib/revalidate";
import type { Settings } from "@/lib/types";

export const GET = handle(async (req) => {
  const g = await adminGuard(req);
  if (g) return g;
  return Response.json({ settings: publicView(await getSettings(true)) });
});

const str = (v: unknown, n = 500) => (typeof v === "string" ? v.trim().slice(0, n) : undefined);

export const PUT = handle(async (req) => {
  const g = await adminGuard(req);
  if (g) return g;
  const b = await body<Record<string, any>>(req); // eslint-disable-line @typescript-eslint/no-explicit-any
  const next = await updateSettings((s) => {
    if (b.site) {
      const x = b.site;
      for (const k of ["siteName", "tagline", "description", "logoUrl", "faviconUrl", "tickerText", "gaId", "adsenseClient", "contactEmail"] as const) {
        const v = str(x[k], k === "description" || k === "tickerText" ? 1000 : 300);
        if (v !== undefined) (s as any)[k] = v; // eslint-disable-line @typescript-eslint/no-explicit-any
      }
      if (!s.siteName) s.siteName = "Agentviral";
      if (x.social && typeof x.social === "object") {
        s.social = {};
        for (const k of ["facebook", "instagram", "x", "youtube", "tiktok", "telegram"] as const) {
          const v = str(x.social[k]);
          if (v) (s.social as any)[k] = v; // eslint-disable-line @typescript-eslint/no-explicit-any
        }
      }
    }
    if (b.ai) {
      const x = b.ai;
      if (["openai", "gemini", "groq", "openrouter", "custom"].includes(x.provider)) s.ai.provider = x.provider;
      if (str(x.model) !== undefined) s.ai.model = str(x.model)!;
      if (str(x.baseUrl) !== undefined) s.ai.baseUrl = str(x.baseUrl);
      if (typeof x.autoPublish === "boolean") s.ai.autoPublish = x.autoPublish;
      if (typeof x.autoGenerate === "boolean") s.ai.autoGenerate = x.autoGenerate;
      if (x.autoCount !== undefined) s.ai.autoCount = Math.min(3, Math.max(1, Number(x.autoCount) || 1));
      if (x.token === null || x.deleteToken === true) delete s.ai.tokenEnc;
      else if (typeof x.token === "string" && x.token.trim()) s.ai.tokenEnc = encrypt(x.token.trim());
    }
    if (["modern", "klasik", "sistem"].includes(b.fontStyle)) s.fontStyle = b.fontStyle;
    if (b.media) {
      const x = b.media;
      const m = s.media;
      if (typeof x.autoAfterAi === "boolean") m.autoAfterAi = x.autoAfterAi;
      if (["source", "stock", "off"].includes(x.coverMode)) m.coverMode = x.coverMode;
      if (x.platforms && typeof x.platforms === "object") for (const k of ["youtube", "tiktok", "instagram", "x", "facebook"] as const) if (typeof x.platforms[k] === "boolean") m.platforms[k] = x.platforms[k];
      for (const k of ["maxVideos", "maxSocial", "maxRefs"] as const) if (x[k] !== undefined) m[k] = Math.min(10, Math.max(0, Number(x[k]) || 0));
      if (str(x.extraKeywords) !== undefined) m.extraKeywords = str(x.extraKeywords, 200)!;
      if (str(x.blockedDomains) !== undefined) m.blockedDomains = str(x.blockedDomains, 1000)!;
      if (Array.isArray(x.providers)) {
        const old = new Map(m.providers.map((p) => [p.id, p]));
        m.providers = x.providers.slice(0, 20).filter((p: any) => ["brave", "serper", "youtube", "pexels", "unsplash", "pixabay"].includes(p?.type)).map((p: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const prev = p.id ? old.get(p.id) : undefined;
          const tokenEnc = p.deleteToken ? undefined : typeof p.token === "string" && p.token.trim() ? encrypt(p.token.trim()) : prev?.tokenEnc;
          return { id: prev?.id || Math.random().toString(36).slice(2, 10), type: p.type, name: str(p.name, 60) || p.type, enabled: p.enabled !== false, ...(tokenEnc ? { tokenEnc } : {}) };
        });
      }
    }
    return s;
  });
  revalidateSite();
  return Response.json({ settings: publicView(next as Settings) });
});
