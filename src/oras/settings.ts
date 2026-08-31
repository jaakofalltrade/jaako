import { Settings } from "luxon";

/**
 * Luxon's global switches, set once. Imported for the side effect, exports nothing.
 *
 * THROWONINVALID IS ON, and that is a deliberate reversal of how shortDate used to
 * behave. It returned "" for anything unparseable, so a bad value rendered as a blank
 * table cell. That was the right call while the function was defensive by habit, and
 * it is the wrong one here, because NOTHING IN THIS APP LETS A HUMAN TYPE A DATE.
 * Every date in the system arrives from one of three places: our own clock, Neon, or
 * Spotify's API. An invalid one is therefore not bad input, it is a bug - a mapper
 * reading the wrong field, a column that quietly changed type - and a silent blank
 * cell is precisely the shape of failure that survives to production unnoticed.
 *
 * With this on, luxon throws where it would otherwise hand back an object whose every
 * method answers "Invalid DateTime", and the throw names the reason it could not parse.
 *
 * The one genuinely external date is Spotify's added_at, so that is checked at the
 * mapper where it enters rather than by making every formatter downstream defensive
 * all over again. See toQueueEntry in server/spotify/mappers.ts.
 *
 * SETTINGS.NOW IS DELIBERATELY NOT SET. It defaults to `() => Date.now()`, which means
 * vi.setSystemTime moves luxon and the plain-number helpers in oras/milliseconds
 * together, from one call, with nothing to remember to stub. Assigning a custom clock
 * here would break that for the half of the folder that never imports luxon.
 */
Settings.throwOnInvalid = true;

/**
 * The locale every format token is resolved against, pinned rather than inherited.
 *
 * THIS IS NOT COSMETIC, AND LEAVING IT OUT IS A REAL BUG rather than a preference.
 * Luxon resolves `LLL` - the short month name in DATE_TIME_FORMAT.short_day - against
 * the ambient locale, which in the browser is the visitor's. Without this line a
 * reader whose browser is set to French sees "30 août" and one set to German sees
 * "30 Mai", in a column sitting directly beneath fixed-width coordinates and plate
 * numbers, and the layout is built on the assumption that the column is three
 * characters wide.
 *
 * en-GB rather than the reader's own, and that is a deliberate loss carried over from
 * the shortDate this folder replaces. It is the same decision the site makes for every
 * other readout: the ZONE is the visitor's, so they see their own Tuesday; the SHAPE
 * is not, so everybody's Tuesday is written the same way.
 */
Settings.defaultLocale = "en-GB";

/**
 * The type-level half of the switch above, and it has to be written separately.
 *
 * `Settings.throwOnInvalid = true` is a runtime assignment; TypeScript cannot see it,
 * so without this augmentation every toISO() and toISODate() in the folder is typed
 * `string | null` and every call site grows a null check for a branch that now throws
 * instead of returning null. Declaring it here collapses those types to `string`.
 *
 * The interface is @types/luxon's own hook for exactly this - see the example on
 * Settings.throwOnInvalid in its settings.d.ts. The two must agree: change one and the
 * types start describing a runtime that does something else.
 */
declare module "luxon" {
  interface TSSettings {
    throwOnInvalid: true;
  }
}
