import type { Metadata, Viewport } from "next";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import "./colony.css";
import "./jungle-room.css";
import { GAME_TAGLINE, GAME_TITLE } from "@/lib/config";
import { AgeGate } from "@/components/AgeGate";
import { MacroWorld } from "@/components/ColonyWorld";

const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN || "https://colony-csw.vercel.app";

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jungle",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(appOrigin),
  title: {
    default: `${GAME_TITLE} — the quick-answer party game`,
    template: `%s · ${GAME_TITLE}`,
  },
  description: GAME_TAGLINE,
  applicationName: GAME_TITLE,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    title: `${GAME_TITLE} — descend the colony`,
    description: GAME_TAGLINE,
    siteName: GAME_TITLE,
    url: "/",
    images: [
      {
        url: "/art/colony-key-art.jpg",
        width: 1024,
        height: 1024,
        alt: "The Colony key art",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${GAME_TITLE} — descend the colony`,
    description: GAME_TAGLINE,
    images: ["/art/colony-key-art.jpg"],
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b2208",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={display.variable}>
        <MacroWorld />
        <AgeGate />
        {children}
      </body>
    </html>
  );
}
