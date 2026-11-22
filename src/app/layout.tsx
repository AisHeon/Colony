import type { Metadata, Viewport } from "next";
import "./globals.css";
import { GAME_TAGLINE, GAME_TITLE } from "@/lib/config";

export const metadata: Metadata = {
  title: {
    default: `${GAME_TITLE} — a tiny-creature party game`,
    template: `%s · ${GAME_TITLE}`,
  },
  description: GAME_TAGLINE,
  applicationName: GAME_TITLE,
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f7f2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
