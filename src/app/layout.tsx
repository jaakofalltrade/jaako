import type { Metadata } from "next";
import { Quicksand, Geist_Mono } from "next/font/google";
import "../styles/globals.scss";

// Self-hosted by next/font, so nothing is fetched from Google at runtime — which is
// also what the CSP requires, since it sets font-src 'self'. Each face is exposed as a
// CSS custom property that src/styles/tokens/_typography.scss reads.
//
// Each `fallback` is the rest of that face's stack, and it has to be declared here
// rather than in _typography.scss. Without it next/font appends its own
// auto-generated Arial-metrics face to the family, and because that face carries no
// unicode-range it swallows every glyph the webfont doesn't cover (→, ←, ▸, ×, ↻)
// before a stack in CSS could catch them — arrows in the UI render visibly wide and
// wrong. Passing `fallback` replaces that generated face with these entries.
// (`adjustFontFallback: false` is documented as the switch for this but is ignored in
// 16.3.1 for next/font/google; it does work for next/font/local.)
//
// These option objects have to be written out literally: next/font statically analyses
// the call site, so a shared spread is a build error.
//
// The two families this design actually specifies are All Round Gothic (display) and
// Neue Helvetica Georgian (body). Both are commercial and neither is in the repo, so
// neither can be loaded here. Both are named first in the stacks in
// tokens/_typography.scss; see tokens/_fonts.scss for the two-block swap that turns
// them on once the licensed woff2 files land in public/fonts/.
//
// Quicksand stands in for the display face: geometric, rounded terminals, closest free
// match. The body stack needs no webfont at all — it resolves to real Helvetica on
// macOS and to Arial, its metric clone, on Windows.
const quicksand = Quicksand({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-quicksand",
  fallback: ["Trebuchet MS", "Helvetica", "Arial", "sans-serif"],
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-mono",
  fallback: ["ui-monospace", "Courier New", "monospace"],
  display: "swap",
});

const fontVars = [quicksand, geistMono].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: "jaako andes · full-stack odd jobs",
  description: "I think therefore I am. Next.js, Django, Discord bots, and whatever else the week needs.",
};

// Maps image luminance onto the two-colour ramp in tokens/_duotone.scss. feColorMatrix
// flattens to greyscale first; feComponentTransfer then remaps each channel's 0..1
// range onto the endpoints. The six numbers below ARE --duo-lo (#1d3f63) and --duo-hi
// (#f2efe7) as channel pairs — if those tokens move, these must move with them.
//
// This has to be real markup in the document rather than a CSS gradient because a
// gradient maps by position; only a filter maps by luminance. Same-document filter
// references are not affected by the CSP.
const DuotoneFilter = () => (
  <svg className="jk-defs" aria-hidden="true" focusable="false">
    <filter id="jk-duotone" colorInterpolationFilters="sRGB">
      <feColorMatrix
        type="matrix"
        values="0.33 0.33 0.33 0 0
                0.33 0.33 0.33 0 0
                0.33 0.33 0.33 0 0
                0    0    0    1 0"
      />
      <feComponentTransfer>
        <feFuncR type="table" tableValues="0.114 0.949" />
        <feFuncG type="table" tableValues="0.247 0.937" />
        <feFuncB type="table" tableValues="0.388 0.906" />
      </feComponentTransfer>
    </filter>
  </svg>
);

/**
 * Only what is genuinely global.
 *
 * PageShell is NOT here any more. It moved to src/app/(site)/layout.tsx so that a lab
 * app can render without the site's footer and player over it; see that file, and
 * docs/lab.md for why. What stays is the document, the two font faces, the duotone
 * filter and globals.scss, because a bare page still wants the reset and the type.
 */
/*
 * data-scroll-behavior IS NOT DECORATION, AND IT IS NOT OPTIONAL HERE.
 *
 * base/_reset.scss sets scroll-behavior:smooth on <html> for the jump menu, which is
 * what it is for. But Next also scrolls to the top on every client navigation, and that
 * scroll obeys the same property — so a link clicked halfway down a page animated its
 * way back up before the new route settled. Half a second of nothing, on every row in
 * the lab index and the work list.
 *
 * Through Next 15 the router worked around this on its own, forcing the property to
 * auto around its own scroll and putting it back. Next 16 stopped doing that unless the
 * document opts in with this attribute — see disable-smooth-scroll.js in next/dist, and
 * the "Scroll Behavior Override" section of its version-16 upgrade guide. Nothing warns
 * about this in a production build; the symptom is just a site that feels slow.
 *
 * So: hash jumps stay smooth, route changes are instant again.
 */
const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => (
  <html lang="en" data-scroll-behavior="smooth" className={fontVars}>
    <body>
      <DuotoneFilter />
      {children}
    </body>
  </html>
);

export default RootLayout;
