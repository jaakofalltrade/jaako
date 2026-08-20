import type { Metadata } from "next";
import { Rubik_Glitch, Teko, Silkscreen, Tiny5, Geist_Mono } from "next/font/google";
import "../styles/globals.scss";
import { PageShell } from "@/design-system/portfolio/PageShell";

// Self-hosted by next/font, so nothing is fetched from Google at runtime. Each face is
// exposed as a CSS custom property that src/styles/tokens/_typography.scss reads.
const rubikGlitch = Rubik_Glitch({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-rubik-glitch",
  display: "swap",
});

const teko = Teko({
  subsets: ["latin"],
  variable: "--font-teko",
  display: "swap",
});

const silkscreen = Silkscreen({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-silkscreen",
  display: "swap",
});

const tiny5 = Tiny5({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-tiny5",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const fontVars = [rubikGlitch, teko, silkscreen, tiny5, geistMono].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: "jaako andes · full-stack odd jobs",
  description: "I think therefore I am. Next.js, Django, Discord bots, and whatever else the week needs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontVars}>
      <body>
        <PageShell>{children}</PageShell>
      </body>
    </html>
  );
}
