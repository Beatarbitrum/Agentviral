import { isAdmin } from "@/lib/auth";
import { signUpload } from "@/lib/blob";

const ALLOWED = /^(image\/(jpeg|png|webp|gif|avif|svg\+xml|x-icon|vnd\.microsoft\.icon)|video\/(mp4|webm|quicktime))$/;

export async function POST(req: Request) {
  try {
    if (!(await isAdmin())) throw new Error("Tidak terautentikasi");
    const b = (await req.json()) as { pathname?: string; contentType?: string; size?: number };
    const pathname = String(b.pathname || "");
    if (!pathname.startsWith("media/") || pathname.includes("..")) throw new Error("Path tidak valid");
    if (!ALLOWED.test(String(b.contentType || ""))) throw new Error("Jenis file tidak didukung");
    if (Number(b.size) > 50 * 1024 * 1024) throw new Error("File maksimal 50 MB");
    return Response.json(await signUpload(pathname));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
