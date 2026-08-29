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
 * Sequential walks a boundary along the string, so the reader watches it resolve from
 * the left. Burst holds the whole thing scrambled and lands it in one go at the end.
 *
 * Neither one's run time depends on length: both are driven by elapsed time against
 * `duration`, so the choice here is purely what the settling looks like. Sequential
 * suits a readout the eye tracks along; Burst suits prose, where a boundary crawling
 * through a sentence invites the reader to try to read it while it moves.
 */
export enum DecryptMode {
  Sequential = "SEQUENTIAL",
  Burst = "BURST",
}

/**
 * The pool a settling readout scrambles from.
 *
 * THESE ARE NAMED FOR CASE AND CHARSET, NOT FOR A TYPEFACE, AND THE FIRST VERSION GOT
 * THAT WRONG. It had Display and Mono, on the assumption that the display face is always
 * lowercase (base/_reset.scss) and the mono face always uppercase (the label mixin).
 * That holds for headings and annotations and breaks everywhere else: .jk-dl__value and
 * .jk-aka__name are mono and take no text-transform at all, so they render exactly as
 * authored, which is lowercase. A pool picked by face would have scrambled them into
 * capitals and then dropped to lowercase on the last frame.
 *
 * Pick by what the element actually renders. Case matters because a pool in the wrong
 * one is silently transformed on the way to the screen and only its widths survive.
 *
 * There is deliberately no punctuation pool. The React Bits default includes
 * !@#$%^&*()_+, which reads as terminal-hacker and pulls against the editorial tone.
 */
export enum DecryptAlphabet {
  /** Lowercase latin: headings, and any mono value with no text-transform on it. */
  Lower = "LOWER",
  /** Uppercase latin and digits: anything through the label mixin. */
  Upper = "UPPER",
  /** Digits only, so a numeric readout never scrambles into letters. */
  Digits = "DIGITS",
}

export type NavItem = {
  label: string;
  /**
   * Absolute link. What the footer follows from any page, and what the inline menu
   * falls back to for an item that has no section to scroll to.
   */
  href: string;
  /**
   * id of the on-page section this item scrolls to, for scroll-spy active state.
   *
   * Optional since the lab joined the list. Every other item names a section of the
   * homepage; the lab is a route and nothing else, so the inline menu has to send it
   * to `href` rather than to a `#lab` that does not exist. Absent means exactly that:
   * this item is a destination, not a position on the page.
   */
  id?: string;
  /** Path prefix that also marks this item active, for sections with their own routes. */
  route?: string;
};
