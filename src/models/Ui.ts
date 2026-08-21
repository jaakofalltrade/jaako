/**
 * Shared vocabulary for the design system.
 *
 * These are identifiers, not strings that reach the DOM — the class names and
 * file paths they map to live in src/constants/ui.ts. That indirection is the
 * point: nothing in a component builds a class name out of a variable.
 */

export enum BadgeTone {
  Green = "GREEN",
  Blue = "BLUE",
  Hazard = "HAZARD",
  Steel = "STEEL",
  Void = "VOID",
  Alert = "ALERT",
}

export enum ButtonVariant {
  Hazard = "HAZARD",
  Blue = "BLUE",
  Metal = "METAL",
  Hud = "HUD",
  Ghost = "GHOST",
}

export enum ButtonSize {
  Sm = "SM",
  Md = "MD",
  Lg = "LG",
}

export enum PanelTone {
  Plate = "PLATE",
  Void = "VOID",
}

export enum HeadingTone {
  Light = "LIGHT",
  Dim = "DIM",
}

export enum MarqueeTone {
  Void = "VOID",
  Hazard = "HAZARD",
}

/** The guestbook dot and the navbar LED. */
export enum PresenceStatus {
  Online = "ONLINE",
  Offline = "OFFLINE",
}

/** Every Lucide SVG in public/icons. Adding a file here is what makes it usable. */
export enum IconName {
  ArrowRight = "ARROW_RIGHT",
  CircleUser = "CIRCLE_USER",
  Disc = "DISC",
  Folder = "FOLDER",
  Globe = "GLOBE",
  Link = "LINK",
  Linkedin = "LINKEDIN",
  Mail = "MAIL",
  Monitor = "MONITOR",
  MousePointer2 = "MOUSE_POINTER_2",
  RefreshCw = "REFRESH_CW",
  Save = "SAVE",
  Star = "STAR",
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

export type NavItem = {
  label: string;
  href: string;
  /** id of the on-page section this item scrolls to, for scroll-spy active state. */
  id: string;
  /** Path prefix that also marks this item active, for sections with their own routes. */
  route?: string;
};
