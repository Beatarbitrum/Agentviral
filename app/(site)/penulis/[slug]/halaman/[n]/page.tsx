import { ListingPage, listingMeta } from "@/components/ListingPage";

export const revalidate = 300;
export async function generateStaticParams() { return []; }
type P = { params: Promise<{ slug: string; n: string }> };
export async function generateMetadata({ params }: P) { const p = await params; return listingMeta("penulis", p.slug, Number(p.n)); }
export default async function Page({ params }: P) { const p = await params; return <ListingPage kind="penulis" slug={p.slug} page={Number(p.n)} />; }
