import { adminGuard } from "@/lib/auth";
import { handle } from "@/lib/api";
import { deleteDemos, seedDemo } from "@/lib/seed";
import { revalidateSite } from "@/lib/revalidate";

export const maxDuration = 60;

export const POST = handle(async (req) => {
  const g = await adminGuard(req);
  if (g) return g;
  const r = await seedDemo();
  revalidateSite();
  return Response.json(r);
});

export const DELETE = handle(async (req) => {
  const g = await adminGuard(req);
  if (g) return g;
  const n = await deleteDemos();
  revalidateSite();
  return Response.json({ deleted: n });
});
