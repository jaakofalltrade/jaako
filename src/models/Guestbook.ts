import { PresenceStatus } from "./Ui";

export type GuestbookEntry = {
  who: string;
  message: string;
  status: PresenceStatus;
};
