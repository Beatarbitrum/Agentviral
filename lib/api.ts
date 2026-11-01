import "server-only";

export function handle(fn: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      const msg = (e as Error)?.message || "Terjadi kesalahan";
      console.error(e);
      return Response.json({ error: msg }, { status: 400 });
    }
  };
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await req.json()) as T;
  if (ct.includes("form")) return Object.fromEntries((await req.formData()).entries()) as T;
  const t = await req.text();
  return (t ? JSON.parse(t) : {}) as T;
}
