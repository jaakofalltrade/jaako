/**
 * One-off helper: mints the long-lived Spotify refresh token for the
 * now_playing panel.
 *
 *   node scripts/spotify-token.mjs <client_id> <client_secret>
 *
 * or set SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET and run it with no args.
 *
 * The redirect URI below must be registered verbatim in the Spotify dashboard.
 * It uses the loopback literal rather than "localhost" on purpose — Spotify
 * rejects http://localhost outright; only HTTPS URLs and explicit loopback
 * addresses (127.0.0.1, [::1]) are accepted.
 */

import http from "node:http";

const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = "user-read-currently-playing user-read-recently-played user-top-read";

const clientId = process.argv[2] ?? process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.argv[3] ?? process.env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Missing credentials.\n  node scripts/spotify-token.mjs <client_id> <client_secret>");
  process.exit(1);
}

const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

const authorizeUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
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
    console.log("\nSPOTIFY_REFRESH_TOKEN=" + tokens.refresh_token);
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
  console.log("Open this URL in your browser and approve access:\n");
  console.log(authorizeUrl);
  console.log(`\nWaiting for the callback on ${REDIRECT_URI} …`);
});
