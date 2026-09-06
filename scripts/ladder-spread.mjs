import { loadEnvLocal } from "./loadEnv.mjs";
import { listOwnPublicPlaylists } from "./spotifyShelf.mjs";

/**
 * Where the ladder should be anchored, argued from the catalogue rather than from taste.
 *
 *     pnpm ladder:spread              sample 25 playlists
 *     pnpm ladder:spread 60           sample 60
 *
 * WHAT THIS IS FOR. DEEPCUT_TIER_FLOOR is eight thresholds and rarity.ts says plainly
 * that they are tuning constants: what is fixed is the SHAPE, one rung per order of
 * magnitude, and what is open is where that ladder is anchored, because that depends on
 * the kind of music on the account. It also says to move them when there is enough real
 * data to see it. This is that data.
 *
 * THE NUMBERS ARE LAST.FM SCROBBLES AND THAT IS THE WHOLE PROBLEM. A scrobble is a play
 * somebody's client reported to last.fm, and only a minority of listeners run one, so a
 * scrobble count is a small and biased sample of a stream count - a track showing 2m on
 * last.fm may be a nine-figure song on Spotify. Spotify's API does not expose play counts
 * at all, so there is no second column to calibrate against; what the ladder can be
 * anchored on is the SHAPE OF THIS ACCOUNT'S OWN DISTRIBUTION, which is exactly what this
 * prints.
 *
 * IT GOES THROUGH THE APP'S OWN ROUTE, like lastfm-check.mjs and for the same reason: a
 * second copy of the matching rules here would report a match rate the site does not get.
 * So this needs `pnpm dev` running. It spends the same caches the page does, and the
 * route scores at most SCORED_TRACK_LIMIT tracks per playlist, so a long playlist
 * contributes a sample of itself rather than all of it.
 *
 * Read-only. It reads playlists and prints arithmetic.
 */

loadEnvLocal();

const SITE = process.env.CHECK_ORIGIN ?? "http://localhost:3000";

/** Commonest first, the same order as DEEPCUT_LADDER. */
const LADDER = ["ANTHEM", "CHART", "ROTATION", "ALBUM", "DEEPCUT", "UNHEARD", "GHOST", "LOST"];

/**
 * The floors as they ship today, in the same order.
 *
 * Kept as a literal rather than imported: src/constants is TypeScript behind the `@/`
 * alias and a plain node script cannot reach it. The consequence is that this can fall
 * out of step with the constant, so it is PRINTED in the report - if the "as it ships"
 * histogram here disagrees with what /lab/deepcuts shows, this list is the stale one.
 */
const SHIPPED = [500_000_000, 100_000_000, 10_000_000, 1_000_000, 100_000, 10_000, 1_000, 0];

/**
 * The ladders worth arguing about, each one a rule somebody can say out loud.
 *
 * Add to this rather than reading the families above by eye. A candidate that cannot be
 * described in the string beside it does not belong on a page with a legend on it.
 */
const CANDIDATES = {
  "A. decades, top rung clipped to 30M":
    [30_000_000, 10_000_000, 1_000_000, 100_000, 10_000, 1_000, 100, 0],
  "B. five times a rung":
    [20_000_000, 5_000_000, 1_000_000, 200_000, 40_000, 8_000, 1_000, 0],
  "C. rounded target share":
    [5_000_000, 1_000_000, 200_000, 30_000, 8_000, 2_000, 200, 0],
  "D. a fifth of the rung above, from 5M":
    [5_000_000, 1_000_000, 200_000, 40_000, 8_000, 1_600, 320, 0],
};

const nf = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** The rung a count lands on, walking highest floor first exactly as rarityOf does. */
const rungOf = (plays, floors) => {
  for (let index = 0; index < LADDER.length; index += 1) {
    if (plays >= floors[index]) return LADDER[index];
  }
  return LADDER[LADDER.length - 1];
};

const histogram = (counts, floors) => {
  const bucket = Object.fromEntries(LADDER.map((rung) => [rung, 0]));
  for (const plays of counts) bucket[rungOf(plays, floors)] += 1;
  return bucket;
};

/** Nearest-rank, on an already-sorted array. Good enough for a thousand samples. */
const percentile = (sorted, fraction) =>
  sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1))];

const printHistogram = (label, bucket, total) => {
  console.log(`\n  ${label}`);
  for (const rung of LADDER) {
    const count = bucket[rung];
    const share = total ? (count / total) * 100 : 0;
    const bar = "#".repeat(Math.round(share / 2));
    console.log(
      `    ${rung.padEnd(9)} ${String(count).padStart(4)}  ${share.toFixed(1).padStart(5)}%  ${bar}`
    );
  }
  /* THE NUMBER THAT DECIDES IT. A rung with nothing on it is a rung the app never deals
     and the legend still prints, and the hit slot's weight falls off it onto whatever is
     below - so an anchor that empties three rungs has quietly made the ladder five rungs
     long. */
  const empty = LADDER.filter((rung) => bucket[rung] === 0);
  console.log(`    empty rungs: ${empty.length ? empty.join(", ") : "none"}`);
};

const main = async () => {
  const sampleSize = Number(process.argv[2] ?? 25);

  const playlists = (await listOwnPublicPlaylists()).slice(0, sampleSize);
  console.log(`\nSampling ${playlists.length} playlists through ${SITE} ...\n`);

  const counts = [];
  let scored = 0;
  let unmatched = 0;

  for (const playlist of playlists) {
    let response;
    try {
      response = await fetch(`${SITE}/api/lab/deepcuts/pack?id=${encodeURIComponent(playlist.id)}`);
    } catch {
      console.error(`Could not reach ${SITE}. Is "pnpm dev" running?`);
      process.exit(1);
    }

    if (!response.ok) {
      console.log(`  ${playlist.name.padEnd(40).slice(0, 40)}  route ${response.status}, skipped`);
      continue;
    }

    const pack = await response.json();

    if (!pack.scored) {
      console.error("last.fm is not switched on: LASTFM_API_KEY is empty. See .env.local.");
      process.exit(1);
    }

    const matched = pack.tracks.filter((track) => track.plays !== null);
    scored += pack.tracks.length;
    unmatched += pack.tracks.length - matched.length;
    for (const track of matched) counts.push(track.plays);

    console.log(
      `  ${playlist.name.padEnd(40).slice(0, 40)}  ${String(matched.length).padStart(3)} scored`
    );
  }

  if (counts.length === 0) {
    console.error("\nNothing scored. Nothing to report.");
    process.exit(1);
  }

  const sorted = [...counts].sort((a, b) => a - b);

  console.log(`\n${"=".repeat(72)}`);
  console.log(`\n${counts.length} matched tracks, ${unmatched} unmatched of ${scored} scored\n`);

  console.log("  the distribution, in scrobbles:");
  for (const [label, fraction] of [
    ["min", 0],
    ["p5", 0.05],
    ["p10", 0.1],
    ["p25", 0.25],
    ["median", 0.5],
    ["p75", 0.75],
    ["p90", 0.9],
    ["p95", 0.95],
    ["p99", 0.99],
    ["max", 1],
  ]) {
    const value = percentile(sorted, fraction);
    console.log(`    ${label.padEnd(7)} ${nf.format(value).padStart(7)}   ${value.toLocaleString("en-US")}`);
  }

  printHistogram("as it ships now:", histogram(counts, SHIPPED), counts.length);

  /* MOVING THE WHOLE LADDER, WHICH IS THE MOVE rarity.ts SANCTIONS. It fixes one rung per
     decade and leaves the anchor open, so the candidates are the shipped floors divided
     by ten, by a hundred, and so on. Printing several lets the choice be made by looking
     at which one fills eight rungs rather than by picking a number. */
  for (const shift of [1, 2, 3]) {
    const floors = SHIPPED.map((floor, index) =>
      index === SHIPPED.length - 1 ? 0 : Math.round(floor / 10 ** shift)
    );
    printHistogram(
      `${shift} decade${shift > 1 ? "s" : ""} lower  (${floors.map((f) => nf.format(f)).join(" / ")}):`,
      histogram(counts, floors),
      counts.length
    );
  }

  /* A FINER STEP, WHICH IS THE OTHER KNOB AND THE ONE THE DATA MAY ARGUE FOR. Eight rungs
     one decade apart need seven decades of range to fill. Scrobbles are a fraction of
     streams, so this account's whole catalogue may not span that - in which case no
     anchor fills the ladder and the STEP has to shrink instead. A half decade is 10^0.5,
     about 3.16x per rung, which is still a log scale and still one rule: it just measures
     the ladder in half decades rather than whole ones. */
  for (const top of [30_000_000, 10_000_000, 3_000_000]) {
    const floors = LADDER.map((_, index) =>
      index === LADDER.length - 1 ? 0 : Math.round(top / 10 ** (index * 0.5))
    );
    printHistogram(
      `half decades from ${nf.format(top)}  (${floors.map((f) => nf.format(f)).join(" / ")}):`,
      histogram(counts, floors),
      counts.length
    );
  }

  /* AND THE ANSWER THAT IGNORES THE SHAPE ENTIRELY, printed as a yardstick rather than a
     recommendation. Choose the floors so that each rung holds a designed share of the
     catalogue, and the ladder is a set of quantiles: guaranteed to fill every rung and
     to put the rare end where the rare songs are. What it gives up is the property that
     makes the ladder legible - "one rung per order of magnitude" is a sentence anybody
     can check against a play count, and "the 96th percentile of jaako's playlists" is
     not, and it moves every time a playlist is added. */
  const TARGET = [0.28, 0.24, 0.19, 0.14, 0.09, 0.04, 0.015, 0.005];
  let remaining = 1;
  const quantile = LADDER.map((_, index) => {
    if (index === LADDER.length - 1) return 0;
    remaining -= TARGET[index];
    return percentile(sorted, remaining);
  });
  printHistogram(
    `by target share  (${quantile.map((f) => nf.format(f)).join(" / ")}):`,
    histogram(counts, quantile),
    counts.length
  );

  /* NAMED CANDIDATES, which is where a family of curves turns into a decision. Each of
     these is a readable rule as well as a set of numbers, because a ladder nobody can
     state in a sentence is a ladder the legend cannot print. */
  for (const [label, floors] of Object.entries(CANDIDATES)) {
    printHistogram(`${label}  (${floors.map((f) => nf.format(f)).join(" / ")}):`, histogram(counts, floors), counts.length);
  }

  console.log("");
};

await main();
