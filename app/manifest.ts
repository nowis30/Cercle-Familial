import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cercle Familial",
    short_name: "Cercle",
    description: "Application familiale privee mobile-first pour organiser evenements, RSVP, contributions et souvenirs.",
    start_url: "/",
    display: "standalone",
    background_color: "#EEF2FF",
    theme_color: "#4F46E5",
    icons: [
      {
        src: "/branding/cercle-familial-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/branding/cercle-familial-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
