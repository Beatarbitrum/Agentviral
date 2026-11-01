import { ListingPage, listingMeta } from "@/components/ListingPage";

export const revalidate = 300;
export async function generateStaticParams() { return []; }
type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P) { return listingMeta("kategori", (await params).slug); }
export default async function Page({ params }: P) { return <ListingPage kind="kategori" slug={(await params).slug} page={1} />; }
