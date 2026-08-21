import { BadgeTone, ButtonSize, ButtonVariant, HeadingTone, IconName, MarqueeTone, PanelTone, PresenceStatus, ProjectStatus, TechName } from "@/models";

/**
 * Enum member → the string that actually reaches the DOM.
 *
 * Every one of these replaces a template literal that used to build a class name
 * or a path out of a variable. The trade is deliberate: a few more lines here,
 * and nothing in a component can produce a class that doesn't exist. Adding an
 * enum member without a mapping is a type error, not a silently broken style.
 */

export const BADGE_TONE_CLASS: Record<BadgeTone, string> = {
  [BadgeTone.Green]: "jk-badge--green",
  [BadgeTone.Blue]: "jk-badge--blue",
  [BadgeTone.Hazard]: "jk-badge--hazard",
  [BadgeTone.Steel]: "jk-badge--steel",
  [BadgeTone.Void]: "jk-badge--void",
  [BadgeTone.Alert]: "jk-badge--alert",
};

export const BUTTON_VARIANT_CLASS: Record<ButtonVariant, string> = {
  [ButtonVariant.Hazard]: "jk-btn--hazard",
  [ButtonVariant.Blue]: "jk-btn--blue",
  [ButtonVariant.Metal]: "jk-btn--metal",
  [ButtonVariant.Hud]: "jk-btn--hud",
  [ButtonVariant.Ghost]: "jk-btn--ghost",
};

export const BUTTON_SIZE_CLASS: Record<ButtonSize, string> = {
  [ButtonSize.Sm]: "jk-btn--sm",
  [ButtonSize.Md]: "jk-btn--md",
  [ButtonSize.Lg]: "jk-btn--lg",
};

/** Plate is the default styling and carries no modifier — hence the empty string. */
export const PANEL_TONE_CLASS: Record<PanelTone, string> = {
  [PanelTone.Plate]: "",
  [PanelTone.Void]: "jk-window--void",
};

export const HEADING_TONE_CLASS: Record<HeadingTone, string> = {
  [HeadingTone.Light]: "",
  [HeadingTone.Dim]: "jk-section-heading__title--dim",
};

export const MARQUEE_TONE_CLASS: Record<MarqueeTone, string> = {
  [MarqueeTone.Void]: "jk-marquee--void",
  [MarqueeTone.Hazard]: "jk-marquee--hazard",
};

export const PRESENCE_CLASS: Record<PresenceStatus, string> = {
  [PresenceStatus.Online]: "jk-guestbook__status--online",
  [PresenceStatus.Offline]: "",
};

export const PRESENCE_LABEL: Record<PresenceStatus, string> = {
  [PresenceStatus.Online]: "online",
  [PresenceStatus.Offline]: "offline",
};

/** Lucide SVGs in public/icons, tinted by --icon-tint to sit in the piss-filter palette. */
export const ICON_SRC: Record<IconName, string> = {
  [IconName.ArrowRight]: "/icons/arrow-right.svg",
  [IconName.CircleUser]: "/icons/circle-user.svg",
  [IconName.Disc]: "/icons/disc.svg",
  [IconName.Folder]: "/icons/folder.svg",
  [IconName.Globe]: "/icons/globe.svg",
  [IconName.Link]: "/icons/link.svg",
  [IconName.Linkedin]: "/icons/linkedin.svg",
  [IconName.Mail]: "/icons/mail.svg",
  [IconName.Monitor]: "/icons/monitor.svg",
  [IconName.MousePointer2]: "/icons/mouse-pointer-2.svg",
  [IconName.RefreshCw]: "/icons/refresh-cw.svg",
  [IconName.Save]: "/icons/save.svg",
  [IconName.Star]: "/icons/star.svg",
  [IconName.Terminal]: "/icons/terminal.svg",
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  [ProjectStatus.Maintained]: "maintained",
  [ProjectStatus.Archived]: "archived",
  [ProjectStatus.Done]: "done",
  [ProjectStatus.Wip]: "wip",
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
