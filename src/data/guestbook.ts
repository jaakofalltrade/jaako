import { PresenceStatus } from "@/models";
import type { GuestbookEntry } from "@/models";

/**
 * The signature log, signed by every handle its owner has used.
 *
 * It used to be three made-up visitors. It is the same guestbook, except the names
 * are all his — which is the joke, and the reason the messages had to be rewritten
 * with them: "go online, let's play deadlock" reads as a friend and not as a former
 * self.
 *
 * Only the current handle is online. The retired ones are offline on purpose, so the
 * presence dot is doing something other than decoration.
 */
export const GUESTBOOK: GuestbookEntry[] = [
  { who: "jaakofalltrade", message: "signing my own guestbook, as is tradition", status: PresenceStatus.Online },
  { who: "jaakoaandes", message: "the one the bank knows about", status: PresenceStatus.Offline },
  { who: "jaako", message: "got the short one before anybody else did", status: PresenceStatus.Offline },
  { who: "djacko", message: "we do not talk about the dj years", status: PresenceStatus.Offline },
];
