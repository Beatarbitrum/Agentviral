import "server-only";
import { decrypt, mask } from "./crypto";
import type { Settings } from "./types";

export function publicView(s: Settings) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { adminPasswordHashEnc, ai, media, ...rest } = s;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tokenEnc, ...aiRest } = ai;
  return { ...rest, media: { ...media, providers: (media?.providers || []).map(({ tokenEnc: t, ...p }) => ({ ...p, tokenMasked: mask(decrypt(t)), hasToken: Boolean(t) })) }, ai: { ...aiRest, tokenMasked: mask(decrypt(tokenEnc)), hasToken: Boolean(tokenEnc) }, passwordOverridden: Boolean(adminPasswordHashEnc) };
}

