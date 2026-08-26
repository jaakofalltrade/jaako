/**
 * Shared vocabulary for the design system.
 *
 * These are identifiers, not strings that reach the DOM — the class names and
 * file paths they map to live in src/constants/ui.ts. That indirection is the
 * point: nothing in a component builds a class name out of a variable.
 */

export enum BadgeTone {
  /** Live, current, active. The accent tone; the member name predates the palette. */
  Cyan = "CYAN",
  /** Neutral default. */
  Steel = "STEEL",
  /** Retired, archived, past. */
  Ghost = "GHOST",
  Alert = "ALERT",
}

export enum ButtonVariant {
  /** Frosted, tinted blue. One per screen, maximum. */
  Primary = "PRIMARY",
  /** Frosted cream, hairline border. The default. */
  Glass = "GLASS",
  /** Bare text, no surface. */
  Ghost = "GHOST",
}

export enum ButtonSize {
  Sm = "SM",
  Md = "MD",
  Lg = "LG",
}

/**
 * Whether an annotation carries information or is texture.
 *
 * This is an accessibility control, not a colour choice. Decorative resolves to
 * --text-faint, which is 3.31:1 at worst against the page ground and fails WCAG AA
 * for text — so the Annotation component also sets aria-hidden on it. Info resolves
 * to --text-dim (4.69:1 at worst) and stays in the accessibility tree. Anything a
 * reader needs is Info.
 */
export enum AnnotationTone {
  Info = "INFO",
  Decorative = "DECORATIVE",
}

/** Aspect ratios for duotone plates. Fixed set, so the grid can never be surprised. */
export enum PlateRatio {
  Portrait = "PORTRAIT",
  Landscape = "LANDSCAPE",
  Square = "SQUARE",
  Wide = "WIDE",
}

/** The four scroll-choreography behaviours. See styles/components/_reveal.scss. */
export enum RevealKind {
  Fade = "FADE",
  Draw = "DRAW",
  Mask = "MASK",
  Plate = "PLATE",
}

/** The player. Sleeve is the collapsed-but-never-gone state.
 *
 * Two members, not three. Expanded/Collapsed drew the line between "recently played
 * is showing" and "it is not", and the recent list is permanent now, so the only
 * distinction left is whether the panel is open at all. */
export enum DockState {
  Open = "OPEN",
  Sleeve = "SLEEVE",
}

export enum MarqueeTone {
  Ink = "INK",
  Cyan = "CYAN",
}

/** The signature-log dot and the section nav LED. */
export enum PresenceStatus {
  Online = "ONLINE",
  Offline = "OFFLINE",
}

/** Every Lucide SVG in public/icons. Adding a file here is what makes it usable. */
export enum IconName {
  Disc = "DISC",
  Globe = "GLOBE",
  Link = "LINK",
  Linkedin = "LINKEDIN",
  Mail = "MAIL",
  RefreshCw = "REFRESH_CW",
  Save = "SAVE",
  Terminal = "TERMINAL",
}

export enum TechName {
  NextJs = "NEXTJS",
  React = "REACT",
  Python = "PYTHON",
  TypeScript = "TYPESCRIPT",
  JavaScript = "JAVASCRIPT",
  Docker = "DOCKER",
  Firebase = "FIREBASE",
  Gcp = "GCP",
}

/**
 * How a settling readout resolves. See design-system/core/DecryptedText.tsx.
 *
 * Sequential resolves one character at a time from the left, so its duration is
 * text.length * speed — right for a short readout, unusable for prose. Burst holds the
 * whole string scrambled for a fixed number of ticks and then snaps, so it costs the
 * same whether it is twelve characters or two hundred.
 */
export enum DecryptMode {
  Sequential = "SEQUENTIAL",
  Burst = "BURST",
}

/**
 * The pool a settling readout scrambles from.
 *
 * The casing is about metrics rather than about what the reader sees — base/_reset.scss
 * lowercases the display face and the label mixin uppercases the mono one, so a pool in
 * the wrong case is silently transformed on the way to the screen and only its widths
 * survive. Each member is the set that matches the face its targets are set in.
 *
 * There is deliberately no punctuation pool. The React Bits default includes
 * !@#$%^&*()_+, which reads as terminal-hacker and pulls against the editorial tone.
 */
export enum DecryptAlphabet {
  /** Lowercase latin, for the display face. */
  Display = "DISPLAY",
  /** Uppercase latin and digits, for the mono annotations. */
  Mono = "MONO",
}

export type NavItem = {
  label: string;
  href: string;
  /** id of the on-page section this item scrolls to, for scroll-spy active state. */
  id: string;
  /** Path prefix that also marks this item active, for sections with their own routes. */
  route?: string;
};
