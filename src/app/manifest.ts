import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MaDbotS",
    short_name: "MaDbotS",
    description: "Your personal AI chatbots — Macro-Chief, Bhima Coach & Dexter",
    start_url: "/",
    display: "standalone",
    background_color: "#141618",
    theme_color: "#141618",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-512.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/icon-512.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "maskable",
      },
    ],
  };
}
