import { ImageResponse } from "next/og";
import { getSettings } from "@/lib/settings";

export const alt = "Handmade resin art";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Default social card for any page without its own image (home, shop, policy
 * pages). Product pages override this with the actual photograph.
 *
 * Rendered with Satori, which supports only a subset of CSS — plain flexbox and
 * inline styles, no Tailwind classes.
 */
export default async function Image() {
  const s = await getSettings().catch(() => null);
  const brand = s?.brandName ?? "Artvelle";
  const tagline = s?.tagline ?? "Handcrafted resin art, made to be seen.";

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
          background: "linear-gradient(135deg, #faf9f6 0%, #efe9dc 100%)",
          color: "#1a1a18",
          padding: 80,
        }}
      >
        <div
          style={{
            fontSize: 26,
            letterSpacing: 10,
            textTransform: "uppercase",
            color: "#b08d4c",
            display: "flex",
          }}
        >
          Handmade in India
        </div>
        <div
          style={{
            fontSize: 104,
            fontWeight: 700,
            marginTop: 28,
            display: "flex",
          }}
        >
          {brand}
        </div>
        <div
          style={{
            fontSize: 36,
            marginTop: 20,
            color: "#6b6862",
            textAlign: "center",
            maxWidth: 860,
            display: "flex",
          }}
        >
          {tagline}
        </div>
        <div
          style={{
            marginTop: 48,
            height: 4,
            width: 140,
            background: "#b08d4c",
            display: "flex",
          }}
        />
      </div>
    ),
    size
  );
}
