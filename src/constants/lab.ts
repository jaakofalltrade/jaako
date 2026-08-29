import { BadgeTone, LabStatus } from "@/models";

/**
 * Fixed values for the lab index. Same arrangement as PLAYBACK_BADGE in
 * constants/spotify.ts: a state maps to a label and a tone, in one table, so no
 * component ever builds either out of a variable.
 */

export const LAB_STATUS_BADGE: Record<
  LabStatus,
  { label: string; tone: BadgeTone }
> = {
  // Cyan is the accent and there is nothing live yet. When there is, it should be the
  // only cyan thing on the index.
  [LabStatus.Live]: { label: "live", tone: BadgeTone.Cyan },
  [LabStatus.Building]: { label: "building", tone: BadgeTone.Steel },
  // Ghost is the retired tone elsewhere on the site. It reads correctly here too: an
  // idea nobody has started is quiet in exactly the same way an archived thing is.
  [LabStatus.Planned]: { label: "planned", tone: BadgeTone.Ghost },
};
