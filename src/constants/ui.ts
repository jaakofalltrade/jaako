import { AnnotationTone, BadgeTone, ButtonSize, ButtonVariant, DecryptAlphabet, IconName, MarqueeTone, PlateRatio, PresenceStatus, ProjectStatus, TechName } from "@/models";

/**
 * Enum member → the string that actually reaches the DOM.
 *
 * Every one of these replaces a template literal that used to build a class name
 * or a path out of a variable. The trade is deliberate: a few more lines here,
 * and nothing in a component can produce a class that doesn't exist. Adding an
 * enum member without a mapping is a type error, not a silently broken style.
 */

export const BADGE_TONE_CLASS: Record<BadgeTone, string> = {
  [BadgeTone.Cyan]: "jk-badge--cyan",
  [BadgeTone.Steel]: "jk-badge--steel",
  [BadgeTone.Ghost]: "jk-badge--ghost",
  [BadgeTone.Alert]: "jk-badge--alert",
};

export const BUTTON_VARIANT_CLASS: Record<ButtonVariant, string> = {
  [ButtonVariant.Primary]: "jk-btn--primary",
  [ButtonVariant.Glass]: "jk-btn--glass",
  [ButtonVariant.Ghost]: "jk-btn--ghost",
};

export const BUTTON_SIZE_CLASS: Record<ButtonSize, string> = {
  [ButtonSize.Sm]: "jk-btn--sm",
  [ButtonSize.Md]: "jk-btn--md",
  [ButtonSize.Lg]: "jk-btn--lg",
};

/** Info is the default treatment and carries no modifier — hence the empty string. */
export const ANNOTATION_TONE_CLASS: Record<AnnotationTone, string> = {
  [AnnotationTone.Info]: "",
  [AnnotationTone.Decorative]: "jk-anno--decorative",
};

export const PLATE_RATIO_CLASS: Record<PlateRatio, string> = {
  [PlateRatio.Portrait]: "jk-plate--portrait",
  [PlateRatio.Landscape]: "jk-plate--landscape",
  [PlateRatio.Square]: "jk-plate--square",
  [PlateRatio.Wide]: "jk-plate--wide",
};

export const MARQUEE_TONE_CLASS: Record<MarqueeTone, string> = {
  [MarqueeTone.Ink]: "jk-marquee--ink",
  [MarqueeTone.Cyan]: "jk-marquee--cyan",
};

export const PRESENCE_CLASS: Record<PresenceStatus, string> = {
  [PresenceStatus.Online]: "jk-presence--online",
  [PresenceStatus.Offline]: "",
};

export const PRESENCE_LABEL: Record<PresenceStatus, string> = {
  [PresenceStatus.Online]: "online",
  [PresenceStatus.Offline]: "offline",
};

/** Lucide SVGs in public/icons, tinted by --icon-tint to sit in the palette. */
export const ICON_SRC: Record<IconName, string> = {
  [IconName.Disc]: "/icons/disc.svg",
  [IconName.Globe]: "/icons/globe.svg",
  [IconName.Link]: "/icons/link.svg",
  [IconName.Linkedin]: "/icons/linkedin.svg",
  [IconName.Mail]: "/icons/mail.svg",
  [IconName.RefreshCw]: "/icons/refresh-cw.svg",
  [IconName.Save]: "/icons/save.svg",
  [IconName.Terminal]: "/icons/terminal.svg",
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  [ProjectStatus.Maintained]: "maintained",
  [ProjectStatus.Archived]: "archived",
  [ProjectStatus.Done]: "done",
  [ProjectStatus.Wip]: "wip",
};

/** Archived work is set in the dim tone; everything else reads as current. */
export const PROJECT_STATUS_TONE: Record<ProjectStatus, BadgeTone> = {
  [ProjectStatus.Maintained]: BadgeTone.Cyan,
  [ProjectStatus.Archived]: BadgeTone.Ghost,
  [ProjectStatus.Done]: BadgeTone.Steel,
  [ProjectStatus.Wip]: BadgeTone.Cyan,
};

/**
 * The characters a settling readout scrambles from. See models/Ui.ts for why these are
 * named by case rather than by typeface, and core/DecryptedText.tsx for the rest.
 *
 * Upper carries digits because most of what goes through it is part number rather than
 * word — coordinates, the plate spec, a revision — and a mostly-numeric string that
 * scrambles into pure letters stops reading as the same kind of value while it settles.
 * Digits is the other end of that: the odometer is only ever a count, so letting a
 * letter through it would say the readout had broken rather than that it was working.
 */
export const DECRYPT_CHARS: Record<DecryptAlphabet, string> = {
  [DecryptAlphabet.Lower]: "abcdefghijklmnopqrstuvwxyz",
  [DecryptAlphabet.Upper]: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  [DecryptAlphabet.Digits]: "0123456789",
};

export const TECH_LABEL: Record<TechName, string> = {
  [TechName.NextJs]: "Next.js",
  [TechName.React]: "React",
  [TechName.Python]: "Python",
  [TechName.TypeScript]: "TypeScript",
  [TechName.JavaScript]: "JavaScript",
  [TechName.Docker]: "Docker",
  [TechName.Firebase]: "Firebase",
  [TechName.Gcp]: "Google Cloud Platform",
};
