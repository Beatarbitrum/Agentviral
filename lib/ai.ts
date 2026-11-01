import "server-only";
import { decrypt } from "./crypto";
import type { AiSettings } from "./types";
import { DEFAULT_CATEGORIES, updateSettings } from "./store";

export const PROVIDER_BASE: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
};

export const PROVIDER_DEFAULT_MODEL: Record<string, string> = {
  openai: "auto",
  gemini: "auto",
  groq: "auto",
  openrouter: "auto",
  custom: "auto",
};

function baseUrl(ai: AiSettings) {
  const b = ai.provider === "custom" ? ai.baseUrl || "" : PROVIDER_BASE[ai.provider] || "";
  return b.replace(/\/$/, "");
}

// ---------- Model otomatis ----------
// Model "auto" (atau kosong): ambil daftar model dari provider dengan token yang sama,
// pilih model chat terbaik, dan otomatis pindah ke model berikutnya bila model ditolak/dipensiunkan.

const SKIP = /(embed|embedding|tts|audio|speech|transcri|whisper|image|imagen|veo|vision-only|aqa|moderation|dall-e|realtime|search|guard|rerank|native-audio|live|computer-use|robotics|gemma-3n|babbage|davinci|instruct|codex|o1-pro|deep-research|lyria|nano-banana|banana|omni|customtools|antigravity|interactions)/i;

function versionScore(id: string): number {
  const m = id.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

function rankModels(provider: string, ids: string[]): string[] {
  const chat = Array.from(new Set(ids.map((i) => i.replace(/^models\//, "")))).filter((i) => !SKIP.test(i));
  const score = (id: string) => {
    let s = versionScore(id) * 10;
    const l = id.toLowerCase();
    if (/preview|exp|experimental|latest|beta/.test(l)) s -= 8; // stabil lebih diutamakan
    if (provider === "gemini") {
      if (l.includes("flash") && !l.includes("lite")) s += 30; // cepat & murah, cocok untuk artikel
      else if (l.includes("flash-lite")) s += 20;
      else if (l.includes("pro")) s += 15;
      if (!l.startsWith("gemini-")) s -= 200;
    } else if (provider === "openai") {
      if (/mini/.test(l)) s += 30;
      if (/nano/.test(l)) s += 10;
      if (!/^(gpt|o\d)/.test(l)) s -= 60;
    } else if (provider === "groq") {
      if (/70b|versatile/.test(l)) s += 30;
      if (/llama|qwen|gpt-oss|kimi|deepseek/.test(l)) s += 10;
    } else if (provider === "openrouter") {
      if (/:free/.test(l)) s -= 5;
      if (/(openai\/gpt-.*mini|google\/gemini-.*flash|anthropic\/claude-.*haiku)/.test(l)) s += 40;
    }
    return s;
  };
  const pool = provider === "gemini" ? chat.filter((i) => i.startsWith("gemini-")) : chat;
  return pool.sort((a, b) => score(b) - score(a));
}

const modelCache = new Map<string, { at: number; list: string[] }>();
const goodModel = new Map<string, string>();

export async function listModels(ai: AiSettings): Promise<string[]> {
  const token = decrypt(ai.tokenEnc);
  if (!token) throw new Error("Token AI belum diatur. Buka Admin → AI untuk menambahkan.");
  const base = baseUrl(ai);
  if (!base) throw new Error("Base URL provider AI belum diatur.");
  const key = `${ai.provider}|${base}|${token.slice(-6)}`;
  const c = modelCache.get(key);
  if (c && Date.now() - c.at < 6 * 3600_000) return c.list;
  const res = await fetch(`${base}/models`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) });
  const text = await res.text();
  if (!res.ok) throw new Error(`Gagal mengambil daftar model (${res.status}): ${text.slice(0, 200)}`);
  let data: { data?: { id: string }[]; models?: { name?: string; id?: string }[] };
  try { data = JSON.parse(text); } catch { throw new Error("Daftar model bukan JSON"); }
  const ids = (data.data || []).map((m) => m.id).concat((data.models || []).map((m) => m.id || m.name || "")).filter(Boolean);
  const list = rankModels(ai.provider, ids);
  if (!list.length) throw new Error("Provider tidak mengembalikan model chat yang bisa dipakai token ini.");
  modelCache.set(key, { at: Date.now(), list });
  return list;
}

function isModelProblem(status: number, text: string) {
  return status === 404 || ((status === 400 || status === 403) && /model/i.test(text) && /(not found|no longer|not available|unavailable|does not exist|not supported|only supports|deprecated|access)/i.test(text));
}

export let lastModelUsed = "";

async function callModel(ai: AiSettings, token: string, base: string, model: string, messages: { role: string; content: string }[], maxTokens: number, timeoutMs: number) {
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(ai.provider === "openrouter" ? { "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "", "X-Title": "Agentviral" } : {}),
    },
    body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: Math.max(maxTokens, 1024) }),
    signal: AbortSignal.timeout(timeoutMs),
  }).catch((e) => ({ status: 0, ok: false, text: async () => `timeout/network: ${(e as Error).message}` }) as unknown as Response);
  return { status: res.status, ok: res.ok, text: await res.text() };
}

export async function chat(ai: AiSettings, messages: { role: string; content: string }[], maxTokens = 2500): Promise<string> {
  const token = decrypt(ai.tokenEnc);
  if (!token) throw new Error("Token AI belum diatur. Buka Admin → AI untuk menambahkan.");
  const base = baseUrl(ai);
  if (!base) throw new Error("Base URL provider AI belum diatur.");
  const chosen = (ai.model || "").trim();
  const auto = !chosen || chosen.toLowerCase() === "auto";
  const gkey = `${ai.provider}|${base}|${token.slice(-6)}`;

  let candidates: string[] = [];
  if (!auto) candidates.push(chosen);
  else {
    const g = goodModel.get(gkey) || ai.lastGoodModel;
    if (g) candidates.push(g);
  }
  let listed = false;
  const tried = new Set<string>();
  let lastErr = "";
  const attempts: string[] = [];
  const deadline = Date.now() + 52_000;

  for (let i = 0; i < 6; i++) {
    if (!candidates.length && !listed) {
      listed = true;
      try { candidates = (await listModels(ai)).filter((m) => !tried.has(m)).slice(0, 5); }
      catch (e) { throw new Error(lastErr ? `${lastErr} — ${(e as Error).message}` : (e as Error).message); }
    }
    const model = candidates.shift();
    if (!model) break;
    if (tried.has(model)) continue;
    tried.add(model);
    const t0 = Date.now();
    const r = await callModel(ai, token, base, model, messages, maxTokens, Math.max(8_000, Math.min(15_000, deadline - Date.now())));
    attempts.push(`${model}: ${r.status || "timeout"} ${Date.now() - t0}ms`);
    if (!r.ok) {
      lastErr = `Provider AI menjawab ${r.status} (model ${model}): ${r.text.slice(0, 250)}`;
      if (r.status === 0 || r.status === 429 || r.status >= 500 || isModelProblem(r.status, r.text)) { if (goodModel.get(gkey) === model) goodModel.delete(gkey); continue; }
      throw new Error(lastErr);
    }
    let data: { choices?: { message?: { content?: string } }[] };
    try { data = JSON.parse(r.text); } catch { throw new Error("Respons AI bukan JSON yang valid"); }
    const out = data.choices?.[0]?.message?.content;
    if (!out) { lastErr = `Respons AI kosong (model ${model})`; continue; }
    goodModel.set(gkey, model);
    if (auto && ai.lastGoodModel !== model) {
      ai.lastGoodModel = model;
      try { await updateSettings((st) => { st.ai.lastGoodModel = model; return st; }); } catch { /* abaikan */ }
    }
    lastModelUsed = model;
    return out;
  }
  throw new Error(`${lastErr || "Tidak ada model yang bisa dipakai dengan token ini."} [percobaan: ${attempts.join("; ")}]`);
}

export function extractJson<T>(s: string): T {
  const cleaned = s.replace(/```json|```/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("AI tidak mengembalikan JSON");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

export interface GeneratedArticle {
  titles: string[];
  title: string;
  subtitle: string;
  summary: string;
  body: string;
  tags: string[];
  metaDescription: string;
  focusKeyword: string;
  category: string;
}

const SYSTEM = `Kamu adalah redaktur senior portal berita Indonesia "Agentviral". Tulis dalam Bahasa Indonesia baku yang lugas, gaya berita viral yang menarik namun FAKTUAL dan berimbang.
Aturan wajib:
- Hanya gunakan fakta dari materi yang diberikan. Jangan mengarang kutipan, angka, nama, tanggal, atau peristiwa.
- Jika informasi belum terverifikasi, tulis secara jelas "belum dapat dikonfirmasi" atau "menurut sumber".
- Jangan menuduh atau menyerang pribadi; hindari SARA, hoaks, dan clickbait menyesatkan.
- Struktur: lead kuat (5W1H), subjudul (##), paragraf pendek, penutup konteks.
- Output HANYA JSON valid tanpa teks lain.`;

export async function generateArticle(ai: AiSettings, input: { topic?: string; notes?: string; sourceText?: string; sourceUrl?: string }): Promise<GeneratedArticle> {
  const cats = DEFAULT_CATEGORIES.map((c) => c.slug).join(", ");
  const user = `Buat artikel berita berdasarkan materi berikut.
Topik: ${input.topic || "-"}
${input.sourceUrl ? `URL sumber: ${input.sourceUrl}\n` : ""}Catatan/materi:
${(input.notes || "-").slice(0, 6000)}
${input.sourceText ? `\nIsi halaman sumber (dipotong):\n${input.sourceText.slice(0, 9000)}` : ""}

Kembalikan JSON dengan kunci persis:
{"titles":["3 opsi judul menarik, maks 90 karakter"],"title":"judul terbaik","subtitle":"subjudul 1 kalimat","summary":"ringkasan 2 kalimat","body":"isi artikel markdown 400-700 kata dengan subjudul ##","tags":["4-7 tag pendek"],"metaDescription":"maks 155 karakter","focusKeyword":"kata kunci utama","category":"salah satu dari: ${cats}"}`;
  const out = await chat(ai, [
    { role: "system", content: SYSTEM },
    { role: "user", content: user },
  ], 3500);
  const j = extractJson<Partial<GeneratedArticle>>(out);
  if (!j.title || !j.body) throw new Error("AI tidak menghasilkan judul/isi");
  return {
    titles: Array.isArray(j.titles) ? j.titles.slice(0, 5).map(String) : [j.title],
    title: String(j.title),
    subtitle: String(j.subtitle || ""),
    summary: String(j.summary || ""),
    body: String(j.body),
    tags: Array.isArray(j.tags) ? j.tags.map(String).slice(0, 8) : [],
    metaDescription: String(j.metaDescription || "").slice(0, 160),
    focusKeyword: String(j.focusKeyword || ""),
    category: DEFAULT_CATEGORIES.some((c) => c.slug === j.category) ? String(j.category) : "viral",
  };
}

export async function assist(ai: AiSettings, action: string, title: string, body: string): Promise<{ result: string | string[] }> {
  const ctx = `Judul: ${title}\nIsi:\n${(body || "").slice(0, 6000)}`;
  const prompts: Record<string, string> = {
    improve_title: `Berikan 5 opsi judul berita yang lebih menarik namun tetap akurat (maks 90 karakter, tanpa clickbait menyesatkan). Output JSON: {"result":["..."]}\n\n${ctx}`,
    meta_description: `Tulis meta description SEO maks 155 karakter, bahasa Indonesia, mengandung kata kunci utama. Output JSON: {"result":"..."}\n\n${ctx}`,
    suggest_tags: `Sarankan 5-8 tag pendek (1-3 kata) yang relevan. Output JSON: {"result":["..."]}\n\n${ctx}`,
    summary: `Tulis ringkasan 2 kalimat. Output JSON: {"result":"..."}\n\n${ctx}`,
  };
  const p = prompts[action];
  if (!p) throw new Error("Aksi AI tidak dikenal");
  const out = await chat(ai, [
    { role: "system", content: "Kamu asisten redaksi berita Indonesia. Jawab hanya JSON valid." },
    { role: "user", content: p },
  ], 600);
  return extractJson<{ result: string | string[] }>(out);
}

export async function fetchSourceText(url: string): Promise<string> {
  const u = new URL(url);
  if (!/^https?:$/.test(u.protocol)) throw new Error("URL harus http/https");
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(u.hostname)) throw new Error("URL tidak diizinkan");
  const res = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 (compatible; AgentviralBot/1.0)" }, signal: AbortSignal.timeout(12_000), redirect: "follow" });
  const html = (await res.text()).slice(0, 600_000);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(nav|footer|header|aside)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return `${title.trim()}\n${text}`.slice(0, 12000);
}
