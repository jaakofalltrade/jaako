import { ContactRequest, ContactResponse } from "@/models";

/**
 * The browser's calls to our own contact route.
 */

const CONTACT_URL = "/api/contact";

const send = async (args: {
  request: ContactRequest;
  /** Honeypot. Empty for a human; whatever a bot typed into the off-screen field otherwise. */
  website: string;
}): Promise<ContactResponse> => {
  const { request, website } = args;

  try {
    const response = await fetch(CONTACT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...request, website }),
    });

    return (await response.json()) as ContactResponse;
  } catch {
    // The request never reached the route.
    return { ok: false, error: "Couldn't reach the server. Try the e-mail link instead." };
  }
};

export const contactApi = {
  send,
};
