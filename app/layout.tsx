import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Plus_Jakarta_Sans, Inter, Source_Serif_4 } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-jakarta", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-serif", display: "swap" });
import { getSettings } from "@/lib/store";
import { siteUrl } from "@/lib/util";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${s.siteName} — ${s.tagline}`, template: `%s | ${s.siteName}` },
    description: s.description,
    applicationName: s.siteName,
    icons: s.faviconUrl ? { icon: s.faviconUrl } : { icon: "/icon.svg" },
    alternates: { canonical: "/", types: { "application/rss+xml": [{ url: "/rss.xml", title: `${s.siteName} RSS` }] } },
    openGraph: { type: "website", siteName: s.siteName, locale: "id_ID", title: s.siteName, description: s.description, images: [{ url: `/og?title=${encodeURIComponent(s.tagline)}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: s.siteName, description: s.description },
    robots: { index: true, follow: true, "max-image-preview": "large" },
  };
}

export const viewport: Viewport = { themeColor: "#d50000", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <html lang="id" className={`${jakarta.variable} ${inter.variable} ${serif.variable}`}>
      <body data-font={s.fontStyle || "modern"}>{children}</body>
    </html>
  );
}
