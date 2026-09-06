/**
 * Every URL this site can point at, in one table.
 *
 * Two objects rather than one, because they are addressed by different callers for
 * different reasons: `routes` is where a visitor can be sent, `endpoints` is what the
 * browser fetches from. Nothing navigates to an endpoint and nothing fetches a route,
 * so keeping them apart means neither list has to be read past to find the other.
 *
 * Both mirror the App Router file layout under src/app, and nothing enforces that —
 * a wrong string here is a 404 at runtime, not a build error. It is still the better
 * trade: these paths used to be written out at every call site, where a rename had a
 * chance to be missed at each one instead of exactly one place to change.
 *
 * The builders take args objects like everything else in the codebase, so a call site
 * says which value it is passing — `routes.project({ slug })` rather than a bare
 * string argument that could be anything.
 */

export const routes = {
  home: "/",

  /**
   * A section of the homepage.
   *
   * Always absolute, never a bare `#about`. The nav and the footer render on /work
   * and /experience too, where a bare fragment would look for a section that isn't
   * on the page instead of going home to it.
   */
  section: (args: { id: string }) => `/#${args.id}`,

  experience: "/experience",

  work: "/work",

  /** One project's case page. `slug` comes from the Project, never from a title. */
  project: (args: { slug: string }) => `/work/${args.slug}`,

  /**
   * The lab and the apps in it.
   *
   * Written out rather than built from a LabAppId, because a builder would mean the
   * enum value doubles as a URL segment and the two are allowed to differ. Writing
   * them out also means every path on the site can still be found by searching this
   * file for the string in the address bar.
   *
   * Nested for the same reason `endpoints.spotify` is: these belong together and
   * flattening them would drop the whole lab in among the portfolio's paths.
   */
  lab: {
    index: "/lab",
    slots: "/lab/slots",
    suggest: "/lab/suggest",
    roast: "/lab/roast",
    deepcuts: "/lab/deepcuts",
  },
} as const;

/**
 * Our own API. Not Spotify's and not Resend's — those are upstream base URLs and
 * they live in serverConfig, because unlike these they can differ per deployment.
 *
 * Keys are the path segment with the hyphen swapped for an underscore, so the table
 * can be read against the route folders without translating.
 */
/* The two segments every route below is built from, so the prefix is written once. A
   typo in a literal path is a 404 nobody notices until a feature quietly stops working;
   a typo here does not compile. */
const API = "/api";
const LAB = `${API}/lab`;

export const endpoints = {
  contact: `${API}/contact`,

  spotify: {
    now_playing: `${API}/spotify/now-playing`,
    top_items: `${API}/spotify/top-items`,
  },

  /**
   * The lab's own routes. Nested to match the folders under src/app/api, so this table
   * reads against the file layout without translating.
   */
  lab: {
    suggest: {
      search: `${LAB}/suggest/search`,
      add: `${LAB}/suggest/add`,
    },
    deepcuts: {
      /**
       * Fills the play-count cache for one playlist and answers nothing.
       *
       * Fired when a pointer enters a pack on the shelf, so the scoring is already done
       * by the time somebody clicks and rips. It replaced a route that returned the whole
       * scored track list on click: a sealed pack shows nothing of its contents, so there
       * was nothing left for that response to render.
       */
      warm: `${LAB}/deepcuts/warm`,
      /** Opening one. POST, takes ?id=<spotify playlist id>. */
      rip: `${LAB}/deepcuts/rip`,
      /** Every card this browser has pulled, rarest first. Takes no parameters: who is
          asking comes from the visitor cookie, and could not come from anywhere else. */
      cards: `${LAB}/deepcuts/cards`,
    },
  },
} as const;
