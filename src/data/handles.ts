import { PresenceStatus } from "@/models";
import type { Handle } from "@/models";

/**
 * Every handle its owner has used, current first.
 *
 * Only the current one is online. The retired ones are offline on purpose, so the
 * presence dot is doing something other than decoration.
 */
export const HANDLES: Handle[] = [
  { name: "jaakofalltrade", status: PresenceStatus.Online },
  { name: "jaakoaandes", status: PresenceStatus.Offline },
  { name: "jaako", status: PresenceStatus.Offline },
];
