import { loadEnvLocal } from "./loadEnv.mjs";

/**
 * Prints what each stored refresh token is actually allowed to do.
 *
 *     pnpm token:check
 *
 * This exists because minting the wrong one is silent. `pnpm token:read` and
 * `pnpm token:write` differ by one word, the values they print look identical, and a
 * write token that was really a read token fails much later, as a 403 from Spotify
 * inside a route, at the moment somebody is trying to add a song. Asking the token
 * itself takes a second and turns that into a line of output.
 *
 * Read-only. It refreshes each token, which is what the site does on every request
 * anyway, and prints the granted scopes. No secret is printed and nothing is written.
 */

loadEnvLocal();

const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env;

if (!id || !secret) {
  console.error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are not set. See .env.local.");
  process.exit(1);
}

const basic = Buffer.from(`${id}:${secret}`).toString("base64");

/** What each token is FOR, so the check can say whether it is fit for that. */
const EXPECTED = {
  SPOTIFY_REFRESH_TOKEN: {
    label: "read  (now-playing, statistics, lab search)",
    wants: ["user-read-currently-playing", "user-read-recently-played", "user-top-read"],
  },
  SPOTIFY_WRITE_REFRESH_TOKEN: {
    label: "write (adding a track to the lab playlist)",
    wants: ["playlist-modify-public"],
  },
};

const check = async (variable) => {
  const { label, wants } = EXPECTED[variable];
  const refresh = process.env[variable];

  console.log(`\n${variable}`);
  console.log(`  for: ${label}`);

  if (!refresh) {
    console.log("  NOT SET");
    return false;
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
  });

  if (!response.ok) {
    // Status only. The body can echo credential detail.
    console.log(`  REFRESH FAILED: ${response.status}`);
    return false;
  }

  const { scope } = await response.json();
  const granted = (scope ?? "").split(" ").filter(Boolean);

  console.log(`  granted: ${granted.join(", ") || "(none)"}`);

  const missing = wants.filter((want) => !granted.includes(want));
  if (missing.length) {
    console.log(`  MISSING: ${missing.join(", ")}`);
    return false;
  }

  /*
   * EXCESS IS AS INTERESTING AS MISSING, AND CHECKING ONLY ONE OF THEM IS HOW THIS
   * SCRIPT ONCE REPORTED "ok" FOR A READ TOKEN THAT COULD WRITE.
   *
   * Spotify grants scopes per (user, application), not per token. Approving a new
   * permission widens EVERY refresh token that application already holds for that
   * account: the read token here was minted with three scopes, was never re-minted,
   * and gained playlist-modify-public the moment the write token was approved.
   *
   * So a token cannot be confined to a subset of what its application has been
   * granted, and the only real separation is a second Spotify app with its own
   * client id.
   */
  const excess = granted.filter((scope) => !wants.includes(scope));
  if (excess.length) {
    console.log(`  EXCESS : ${excess.join(", ")}`);
    if (excess.some((scope) => scope.startsWith("playlist-modify"))) {
      console.log("  This token can WRITE, and is not supposed to be able to.");
    }
    return false;
  }

  console.log("  ok");
  return true;
};

const results = [];
for (const variable of Object.keys(EXPECTED)) {
  results.push(await check(variable));
}

if (results.every(Boolean)) {
  console.log("\nBoth tokens carry exactly what they need, and nothing else.");
} else {
  console.log(
    "\nMISSING means the wrong set was minted. Re-mint it:\n" +
      "  pnpm token:read     then paste into SPOTIFY_REFRESH_TOKEN\n" +
      "  pnpm token:write    then paste into SPOTIFY_WRITE_REFRESH_TOKEN\n" +
      "The two commands differ by one word and the values look alike.\n\n" +
      "EXCESS cannot be fixed by re-minting. Spotify grants scopes per application,\n" +
      "not per token, so approving a permission widens every token that application\n" +
      "holds for the account. Separating read from write means a second Spotify app\n" +
      "with its own client id. See docs/spotify-setup.md."
  );
  process.exitCode = 1;
}
