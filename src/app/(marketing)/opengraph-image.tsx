import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site";

// "SEO": OpenGraph/Twitter Card image - a Next.js file convention
// (rendered server-side via ImageResponse, no image asset needed). Applies
// to every page under this route group unless a page defines its own.
// Rendering an actual image from real JSX is the honest choice here: this
// environment cannot capture a real product screenshot, and presenting a
// fabricated one as genuine would be dishonest (see DashboardMockup.tsx's
// own note for the same reasoning applied to the Hero section).
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700 }}>{siteConfig.name}</div>
        <div style={{ fontSize: 28, color: "#94a3b8", maxWidth: 900, textAlign: "center" }}>
          {siteConfig.description}
        </div>
      </div>
    ),
    { ...size }
  );
}
