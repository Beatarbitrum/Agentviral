import Editor from "@/components/admin/Editor";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <Editor id={(await params).id} />; }
