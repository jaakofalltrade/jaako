import type { Metadata } from "next";
import { Rubik_Glitch, Teko, Silkscreen, Tiny5, Geist_Mono } from "next/font/google";
import "../styles/globals.scss";
import { PageShell } from "@/design-system/portfolio/PageShell";

// Self-hosted by next/font, so nothing is fetched from Google at runtime. Each face is
// exposed as a CSS custom property that src/styles/tokens/_typography.scss reads.
//
// Each `fallback` is the rest of that face's stack, and it has to be declared here
// rather than in _typography.scss. Without it next/font appends its own
// auto-generated Arial-metrics face to the family, and because that face carries no
// unicode-range it swallows every glyph the webfont doesn't cover (→, ←, □, ▼) before
// a stack in CSS could catch them — arrows in the UI render visibly wide and wrong.
// Passing `fallback` replaces that generated face with these entries. (`adjustFontFallback:
// false` is documented as the switch for this but is ignored in 16.3.1.)
//
// These option objects have to be written out literally: next/font statically analyses
// the call site, so a shared spread is a build error.
const rubikGlitch = Rubik_Glitch({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  variable: "--font-rubik-glitch",
  fallback: ["Impact", "Arial Black", "sans-serif"],
  display: "swap",
});

const teko = Teko({
  subsets: ["latin", "latin-ext"],
  variable: "--font-teko",
  fallback: ["Impact", "Haettenschweiler", "sans-serif"],
  display: "swap",
});

const silkscreen = Silkscreen({
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-silkscreen",
  fallback: ["Courier New", "monospace"],
  display: "swap",
});

const tiny5 = Tiny5({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  variable: "--font-tiny5",
  fallback: ["Silkscreen", "monospace"],
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-mono",
  fallback: ["ui-monospace", "Courier New", "monospace"],
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
