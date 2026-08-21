import { PresenceStatus } from "@/models";
import type { GuestbookEntry } from "@/models";

export const GUESTBOOK: GuestbookEntry[] = [
  { who: "anon", message: "cool site, very 2003", status: PresenceStatus.Offline },
  { who: "keatrix", message: "go online, let's play deadlock", status: PresenceStatus.Online },
  { who: "kaaayels", message: "ship the portfolio already", status: PresenceStatus.Online },
];
