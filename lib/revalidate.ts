import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";

export function revalidateSite() {
  try {
    revalidateTag("docs", { expire: 0 });
    revalidatePath("/", "layout");
  } catch (e) {
    console.error("revalidate failed", e);
  }
}
