import type { MetadataRoute } from "next";

/** Makes Prodscope installable as an app (Android "Install app", and the base for a Play Store package). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Prodscope: learn product management",
    short_name: "Prodscope",
    description: "Product teardowns, PM games and daily lessons for aspiring product managers.",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#000000",
    categories: ["education", "business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Play a product", url: "/play", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Skill lessons", url: "/learn", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My progress", url: "/my", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
