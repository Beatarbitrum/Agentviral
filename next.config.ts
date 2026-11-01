import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2678400,
  },
  async headers() {
    return [
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "X-Frame-Options", value: "DENY" }] },
      { source: "/:path*", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }] },
    ];
  },
};

export default nextConfig;
