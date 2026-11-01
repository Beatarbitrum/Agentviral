import "server-only";
import { revalidatePath } from "next/cache";

export function revalidateSite() {
  try {
    revalidatePath("/", "layout");
  } catch (e) {
    console.error("revalidate failed", e);
  }
}
