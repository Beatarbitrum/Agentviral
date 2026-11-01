import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") || "Agentviral").slice(0, 140);
  const cat = (searchParams.get("cat") || "").slice(0, 30).toUpperCase();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "linear-gradient(135deg,#b00000 0%,#111 75%)", color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 900 }}>
            <span style={{ background: "#d50000", padding: "0 10px" }}>AGENT</span>
            <span>VIRAL</span>
          </div>
          {cat ? <div style={{ display: "flex", fontSize: 26, background: "#fff", color: "#b00000", padding: "6px 16px", borderRadius: 6, fontWeight: 800 }}>{cat}</div> : null}
        </div>
        <div style={{ display: "flex", fontSize: title.length > 80 ? 52 : 64, fontWeight: 900, lineHeight: 1.15 }}>{title}</div>
        <div style={{ display: "flex", fontSize: 26, opacity: 0.8 }}>{(process.env.NEXT_PUBLIC_SITE_URL || "").replace(/^https?:\/\//, "")} · Kabar viral terkini</div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "cache-control": "public, max-age=86400, s-maxage=604800, immutable" } },
  );
}
