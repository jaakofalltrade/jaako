/**
 * One-off helper: mints a long-lived Spotify refresh token.
 *
 *   node scripts/spotify-token.mjs <client_id> <client_secret> [read|write]
 *
 * or set SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET and pass only the set.
 *
 * TWO TOKENS, NOT ONE, AND THE SPLIT IS THE POINT.
 *
 * Spotify's scopes are verbs rather than resources: there is no way to say "this
 * playlist only". So the site holds two refresh tokens for the same account instead,
 * each carrying the least it can.
 *
 *   read    what the now-playing panel and the listening statistics need, and nothing
 *           that can write. SPOTIFY_REFRESH_TOKEN. This matters most for the search
 *           proxy the lab will add: that route is public and unauthenticated, and this
 *           is the credential it spends.
 *
 *   write   playlist-modify-public and nothing else, for the one route that adds a
 *           track to the lab playlist. SPOTIFY_WRITE_REFRESH_TOKEN.
 *
 * playlist-modify-PRIVATE is deliberately absent, so a leak of the write token cannot
 * reach a private playlist at all. What it could reach is the public playlists on this
 * account. That residual is accepted rather than solved, and the thing that would solve
 * it is a second Spotify account owning the lab playlist; see docs/suggest-setup.md.
 *
 * MINT THE WRITE TOKEN FIRST AND CHECK THE PANEL STILL WORKS. Two refresh tokens for
 * one app and one account are expected to coexist, and that is not something Spotify
 * documents as a guarantee. The granted-scope line this prints is how you confirm each
 * token carries only what was asked for, rather than everything the app has ever been
 * granted.
 *
 * The redirect URI below must be registered verbatim in the Spotify dashboard.
 * It uses the loopback literal rather than "localhost" on purpose — Spotify
 * rejects http://localhost outright; only HTTPS URLs and explicit loopback
 * addresses (127.0.0.1, [::1]) are accepted.
 */

import http from "node:http";

const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
/** The two sets. One token is minted for exactly one of them. */
const SCOPE_SETS = {
  read: "user-read-currently-playing user-read-recently-played user-top-read",
  write: "playlist-modify-public",
};

/** Which variable the printed line names, so the output can be pasted as it stands. */
const VARIABLE = {
  read: "SPOTIFY_REFRESH_TOKEN",
  write: "SPOTIFY_WRITE_REFRESH_TOKEN",
};

// The set is found wherever it appears rather than taken by position, so the command
// documented before this script grew a second mode still works unchanged.
const positional = process.argv.slice(2);
const setArg = positional.find((value) => value in SCOPE_SETS);
const credentials = positional.filter((value) => !(value in SCOPE_SETS));

// Defaults to read, which is what the original command did. A default that quietly
// asked for write access would be the wrong way round.
const set = setArg ?? "read";

const clientId = credentials[0] ?? process.env.SPOTIFY_CLIENT_ID;
const clientSecret = credentials[1] ?? process.env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Missing credentials.\n  node scripts/spotify-token.mjs <client_id> <client_secret> [read|write]");
  process.exit(1);
}

const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

const authorizeUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPE_SETS[set],
  });

async function exchange(code) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
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
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }

  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");

  if (error || !code) {
    res.writeHead(400, { "Content-Type": "text/plain" }).end(`Authorization failed: ${error ?? "no code"}`);
    console.error(`\nAuthorization failed: ${error ?? "no code returned"}`);
    server.close();
    process.exitCode = 1;
    return;
  }

  try {
    const tokens = await exchange(code);
    res.writeHead(200, { "Content-Type": "text/plain" }).end("Done. Refresh token printed in your terminal — you can close this tab.");
    console.log("\n" + VARIABLE[set] + "=" + tokens.refresh_token);
    // Spotify echoes what it actually granted. Worth reading rather than assuming:
    // it is how a token that came back carrying more than was asked for is caught.
    console.log("\ngranted scopes: " + (tokens.scope || "(none reported)"));
    console.log("\nAdd that to .env.local alongside your client id and secret.");
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" }).end("Token exchange failed — see terminal.");
    console.error("\nToken exchange failed:", err.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Minting the " + set + " token: " + SCOPE_SETS[set] + "\n");
  console.log("Open this URL in your browser and approve access:\n");
  console.log(authorizeUrl);
  console.log(`\nWaiting for the callback on ${REDIRECT_URI} …`);
});
