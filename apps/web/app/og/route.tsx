import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * Lightweight branded OG/share card (1200×630). Parametric so match,
 * prediction and leaderboard pages can all reuse it via query params.
 * Artistic player posters are out of scope here (see M6).
 *
 *   /og?kind=match&t=Brazil vs Spain&s=Sat 13 Jun · 02:00 WIB
 *   /og?kind=prediction&t=Brazil vs Spain&s=My pick: 2-1&badge=🎯 +3 pts
 *   /og?kind=leaderboard&t=Prediction Leaderboard&s=Top tipsters
 */
export function GET(req: Request): ImageResponse {
  const { searchParams } = new URL(req.url);
  const kind = (searchParams.get("kind") ?? "match").slice(0, 24);
  const title = (searchParams.get("t") ?? "Skorly").slice(0, 80);
  const sub = (searchParams.get("s") ?? "").slice(0, 90);
  const badge = (searchParams.get("badge") ?? "").slice(0, 40);

  const label =
    kind === "leaderboard"
      ? "LEADERBOARD"
      : kind === "prediction"
        ? "MY PREDICTION"
        : "WORLD CUP 2026";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "linear-gradient(135deg, #16a34a 0%, #064e3b 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 44, fontWeight: 800 }}>
            <span>Skor</span>
            <span style={{ color: "#bbf7d0" }}>ly</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 2,
              padding: "8px 18px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.18)",
            }}
          >
            {label}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {badge ? (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                fontSize: 30,
                fontWeight: 800,
                padding: "10px 22px",
                borderRadius: 16,
                background: "#facc15",
                color: "#111827",
              }}
            >
              {badge}
            </div>
          ) : null}
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>
            {title}
          </div>
          {sub ? (
            <div style={{ display: "flex", fontSize: 38, color: "rgba(255,255,255,0.9)" }}>
              {sub}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.85)" }}>
          skorly.cc · Predictions, previews & live scores
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
