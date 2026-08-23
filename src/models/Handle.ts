import { PresenceStatus } from "./Ui";

/**
 * One handle its owner has gone by, and whether he is currently online under it.
 *
 * This was GuestbookEntry, with a `message` field, back when the cell was a guestbook
 * signed by three invented visitors. Both the framing and the field are gone: the
 * names are all his, so there was no one for a message to be from.
 */
export type Handle = {
  name: string;
  status: PresenceStatus;
};
