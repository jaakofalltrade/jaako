import { HttpStatus } from "@/models";
import type { CollectionResponse } from "@/models";
import { deepcutsStore } from "@/server/deepcuts/store";
import { readVisitor } from "@/server/visitor";

// Reads a cookie. Nothing here may be prerendered or cached.
export const dynamic = "force-dynamic";

/**
 * The cards this browser has pulled.
 *
 * WHO IS ASKING COMES FROM THE COOKIE AND FROM NOWHERE ELSE, which is the only thing
 * about this route worth reading twice. There is no id in the URL and there must never
 * be one: a visitor id in a query string is an enumeration of everybody's collections,
 * and the ids are uuids in an httpOnly cookie precisely so that no script - ours or
 * anyone's - can lift one out of a browser and ask on its behalf.
 *
 * IT MINTS NOTHING. Every other route that touches the visitor cookie mints one when it
 * finds none, because they are about to write a row that needs an owner. This only reads,
 * so a browser with no cookie is not a browser to give an identity to - it is a browser
 * that has never opened a pack, and the honest answer is an empty list. Minting here
 * would hand a cookie to every visitor who so much as clicked the tab.
 *
 * A GET, UNLIKE THE RIP, because it changes nothing. It is force-dynamic and reads a
 * cookie, so nothing will cache it across visitors.
 *
 * AN EMPTY LIST IS THE ORDINARY ANSWER rather than a 404. No cookie, no rips yet, or an
 * unreachable database all come back the same way, and the tab renders an invitation to
 * open a pack. Only the last of those is a failure, and it is one the visitor can do
 * nothing about; see the store, where reads degrade.
 */
export const GET = async (request: Request) => {
  const visitor = readVisitor({ request });

  const cards = visitor ? await deepcutsStore.cardsFor({ visitor_id: visitor.id }) : [];

  return Response.json({ cards } satisfies CollectionResponse, {
    status: HttpStatus.Ok,
    /* Private and uncacheable, said out loud rather than left to the framework. This
       body is one person's collection, and a shared cache holding it would serve one
       visitor's cards to the next. */
    headers: { "Cache-Control": "private, no-store" },
  });
};
