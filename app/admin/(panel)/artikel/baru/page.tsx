import Editor from "@/components/admin/Editor";
import { getIndex } from "@/lib/store";

export default async function Page() {
  const idx = await getIndex();
  return <Editor categories={idx.categories} />;
}
