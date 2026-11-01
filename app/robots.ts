import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/util";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/cari"] }],
    sitemap: [`${siteUrl()}/sitemap.xml`, `${siteUrl()}/news-sitemap.xml`],
    host: siteUrl(),
  };
}
