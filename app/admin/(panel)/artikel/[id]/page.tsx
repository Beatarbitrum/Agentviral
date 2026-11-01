import { notFound } from "next/navigation";
import Editor from "@/components/admin/Editor";
import { getArticle, getIndex } from "@/lib/store";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Artikel & kategori dibaca paralel di server — editor tampil siap pakai tanpa fetch tambahan.
  const [a, idx] = await Promise.all([getArticle(id, true), getIndex()]);
  if (!a) notFound();
  return <Editor key={id} id={id} initial={a} categories={idx.categories} />;
}
