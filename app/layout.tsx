import type { Metadata, Viewport } from "next";
import { Merriweather, Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cercle Familial",
  description: "Application familiale privee mobile-first pour organiser evenements, RSVP, contributions et souvenirs.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/branding/cercle-familial-mark.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/branding/cercle-familial-mark.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/branding/cercle-familial-mark.svg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${nunito.variable} ${merriweather.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
