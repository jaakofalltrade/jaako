import http from "node:http";
import { randomUUID } from "node:crypto";
import { loadEnvLocal } from "./loadEnv.mjs";

/**
 * One-off helper: mints a long-lived Spotify refresh token.
 *
 *     pnpm token:read     the three read scopes
 *     pnpm token:write    playlist-modify-public, and nothing else
 *
 * Credentials come from .env.local. They can still be passed instead:
 *
 *     node scripts/spotify-token.mjs <client_id> <client_secret> [read|write]
 *
 * TWO TOKENS, NOT ONE. Spotify's scopes are verbs rather than resources, so no token
 * can be restricted to a single playlist. The site holds two for the same account
 * instead: everything it reads runs on one, and the single route that adds a track
 * holds the other. That matters most for the lab's search proxy, which is public and
 * unauthenticated and spends the read token.
 *
 * THE SPLIT IS INTENT, NOT ENFORCEMENT, AND IT IS WORTH KNOWING WHICH. Spotify grants
 * scopes per (user, application), not per token, so approving the write scope here
 * widens every token this application already holds for the account, retroactively.
 * "pnpm token:check" reports exactly that. Real isolation needs a second Spotify app
 * with its own client id.
 *
 * playlist-modify-PRIVATE is deliberately never requested, so a leak of the write
 * token cannot reach a private playlist. What it could reach is the public playlists
 * on this account; that residual is accepted, and docs/suggest-setup.md says what
 * would close it.
 *
 * THIS SCRIPT USED TO FAIL SILENTLY, AND MOST OF WHAT IS BELOW GUARDS AGAINST THAT.
 * It printed whatever token came back under whichever variable name you had asked for,
 * without ever checking that the two agreed. Ask for a write token, have the browser
 * open a cached authorize URL from an earlier read run, and you got a READ token
 * labelled SPOTIFY_WRITE_REFRESH_TOKEN. That then failed weeks later as a 403 inside a
 * route, while somebody was trying to add a song. Three things stop it now:
 *
 *   state         a per-run nonce, so a callback belonging to a DIFFERENT run of this
 *                 script is refused rather than quietly exchanged and mislabelled.
 *   show_dialog   forces the consent screen every time, even for an account that has
 *                 approved this app before, so the permission is always visible.
 *   scope check   granted is compared against requested, and a token that does not
 *                 carry what was asked for IS NOT PRINTED AT ALL.
 *
 * A mistyped set is refused for the same reason: "token:wrtie" used to fall through to
 * the default and mint exactly the wrong thing without a word.
 *
 * The redirect URI must be registered verbatim in the Spotify dashboard. It uses the
 * loopback literal rather than "localhost" on purpose: Spotify rejects
 * http://localhost outright, and accepts only HTTPS URLs and explicit loopback
 * addresses (127.0.0.1, [::1]).
 */

const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;

/**
 * The two sets. One token is minted for exactly one of them.
 *
 * `playlist-read-private` IS THE ONE SCOPE HERE THAT IS NOT NAMED FOR WHAT IT UNLOCKS.
 * /lab/deepcuts needs to list the playlists on this account, and the name suggests the
 * scope only reaches the private ones. It does not: WITHOUT it, both
 * GET /me/playlists and GET /users/{id}/playlists answer 403 — the second even for
 * playlists that are public and open in a browser with no account at all. Measured
 * against the live API on 2026-09-05 rather than read off the documentation.
 *
 * So it is not requested in order to reach private playlists, and the page it serves
 * does not render them: deepcutsLibrary.ts keeps only what this account owns AND has
 * made public, because that page is public and a private playlist's name is not. The
 * scope is what Spotify charges for a list; the filter is ours.
 *
 * playlist-read-COLLABORATIVE is still never requested, for the same reason
 * playlist-modify-private is not: nothing here has a use for it.
 */
const SCOPE_SETS = {
  read:
    "user-read-currently-playing user-read-recently-played user-top-read " +
    "playlist-read-private",
  write: "playlist-modify-public",
};

/** Which variable the printed line names, so the output can be pasted as it stands. */
const VARIABLE = {
  read: "SPOTIFY_REFRESH_TOKEN",
  write: "SPOTIFY_WRITE_REFRESH_TOKEN",
};

const rule = (char) => char.repeat(66);

loadEnvLocal();

/*
 * Object.hasOwn rather than `in`, which walks the prototype chain and would have
 * accepted "constructor" or "toString" as the name of a scope set.
 */
const isSet = (value) => Object.hasOwn(SCOPE_SETS, value);

const positional = process.argv.slice(2);
const setArgs = positional.filter(isSet);
const credentials = positional.filter((value) => !isSet(value));

if (setArgs.length > 1) {
  console.error(`Pick one set, not ${setArgs.length}: ${setArgs.join(", ")}`);
  process.exit(1);
}

/*
 * A MISTYPED SET USED TO BE A READ TOKEN, SILENTLY: it matched nothing, fell through
 * to the default, and minted the wrong credential without a word.
 *
 * A LONE LEFTOVER ARGUMENT IS THE TYPO, and catching it needs this rule rather than a
 * pattern match on the value. Credentials come in pairs or not at all, so one of them
 * on its own is never a real invocation, while "wrtie" lands here every time. Guessing
 * from the shape of the string would be the fragile version of the same check, and it
 * would quietly accept the next typo that happens to look like a client id.
 */
if (credentials.length === 1) {
  console.error(
    `Unrecognised argument: ${credentials[0]}\n\n` +
      `The set has to be exactly "read" or "write". Credentials are taken from\n` +
      `.env.local, or passed as a pair:\n\n` +
      `  pnpm token:read\n` +
      `  pnpm token:write\n` +
      `  node scripts/spotify-token.mjs <client_id> <client_secret> [read|write]`
  );
  process.exit(1);
}

if (credentials.length > 2) {
  console.error(
    `Unrecognised argument(s): ${credentials.slice(2).join(", ")}\n` +
      `The set has to be exactly "read" or "write".`
  );
  process.exit(1);
}

// Defaults to read, which is what the original command did. A default that quietly
// asked for write access would be the wrong way round.
const set = setArgs[0] ?? "read";
const scopes = SCOPE_SETS[set];
const wanted = scopes.split(" ");

const clientId = credentials[0] ?? process.env.SPOTIFY_CLIENT_ID;
const clientSecret = credentials[1] ?? process.env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "Missing credentials.\n\n" +
      "Put SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env.local, then:\n" +
      "  pnpm token:read     mints the read token\n" +
      "  pnpm token:write    mints the write token\n\n" +
      "Or pass them: node scripts/spotify-token.mjs <client_id> <client_secret> [read|write]"
  );
  process.exit(1);
}

const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

/*
 * The nonce that ties a callback to THIS run. Spotify hands it back untouched, so a
 * code arriving from an authorize page opened by an earlier run carries a different
 * one and can be told apart instead of exchanged.
 */
const state = randomUUID();

const authorizeUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: scopes,
    state,
    // Always ask, even for an account that has approved this app before. Skipping the
    // dialog is what makes it possible to grant something without having seen it.
    show_dialog: "true",
  });

const exchange = async (code) => {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return response.json();
};

const reply = (res, status, body) =>
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" }).end(body);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }

  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const returned = url.searchParams.get("state");

  /*
   * Deliberately does NOT close the server. A stale tab landing here is the whole case
   * this check exists for, and shutting down on it would leave the real callback,
   * which may be one click away, with nowhere to arrive.
   */
  if (returned !== state) {
    reply(
      res,
      400,
      "That authorization came from a different run of the script. Close this tab and open the newest URL from your terminal."
    );
    console.warn(
      "\n  Ignored a callback from an earlier run of this script.\n" +
        "  A stale authorize page was still open in the browser. Use the URL above,\n" +
        "  which is still waiting.\n"
    );
    return;
  }

  if (error || !code) {
    reply(res, 400, `Authorization failed: ${error ?? "no code"}`);
    console.error(`\nAuthorization failed: ${error ?? "no code returned"}`);
    server.close();
    process.exitCode = 1;
    return;
  }

  try {
    const tokens = await exchange(code);
    const granted = (tokens.scope ?? "").split(" ").filter(Boolean);
    const missing = wanted.filter((scope) => !granted.includes(scope));

    /*
     * THE TOKEN IS NOT PRINTED WHEN IT IS THE WRONG ONE. Printing it under a warning
     * would be read past and pasted anyway, which is exactly how this failed before.
     */
    if (missing.length) {
      reply(res, 200, "The wrong permissions were granted. See your terminal.");
      console.error(
        `\n${rule("=")}\n` +
          `  WRONG SCOPES. The token has NOT been printed.\n` +
          `${rule("=")}\n\n` +
          `  asked for : ${wanted.join(" ")}\n` +
          `  granted   : ${granted.join(" ") || "(none)"}\n` +
          `  missing   : ${missing.join(" ")}\n\n` +
          `  Almost always this is the browser opening a cached authorize URL from an\n` +
          `  earlier run. Close every Spotify authorization tab, run\n` +
          `  "pnpm token:${set}" again, and copy the URL rather than letting the\n` +
          `  address bar autocomplete it.\n`
      );
      server.close();
      process.exitCode = 1;
      return;
    }

    reply(res, 200, `Done. The ${set} token is in your terminal. You can close this tab.`);

    console.log(
      `\n${rule("=")}\n` +
        `  OK. Granted exactly the ${set} scopes.\n` +
        `${rule("=")}\n\n` +
        `  asked for : ${wanted.join(" ")}\n` +
        `  granted   : ${granted.join(" ")}\n\n` +
        `Paste this line into .env.local:\n\n` +
        `${VARIABLE[set]}=${tokens.refresh_token}\n\n` +
        `Then confirm both tokens with:  pnpm token:check\n`
    );
  } catch (err) {
    reply(res, 500, "The token exchange failed. See your terminal.");
    console.error("\nToken exchange failed:", err.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `\n${rule("=")}\n` +
      `  Minting the ${set.toUpperCase()} token  ->  ${VARIABLE[set]}\n` +
      `${rule("=")}\n\n` +
      `  scopes requested : ${scopes}\n\n` +
      `1. Open this URL. Copy it; do not let the address bar autocomplete an old one.\n\n` +
      `${authorizeUrl}\n\n` +
      `2. The consent screen should name this and nothing else:\n\n` +
      `     ${scopes}\n\n` +
      `Waiting for the callback on ${REDIRECT_URI} ...\n`
  );
});
