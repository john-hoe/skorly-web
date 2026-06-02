import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Skorly — World Cup 2026",
    short_name: "Skorly",
    description:
      "World Cup 2026 live scores, predictions, previews and analysis.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#0f8a4f",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      { src: "/og.png", sizes: "1200x630", type: "image/png", purpose: "any" },
    ],
  };
}
