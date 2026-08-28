/**
 * Rasterises src/app/icon.svg into the two binaries browsers still ask for.
 *
 *   node scripts/build-icons.mjs
 *
 * Outputs, both committed:
 *
 *   src/app/favicon.ico     16 + 32 + 48, served at /favicon.ico
 *   src/app/apple-icon.png  180 x 180, the iOS home-screen tile
 *
 * Next serves icon.svg itself, and every current browser prefers it over the .ico when
 * both <link>s are present. The .ico is there for the clients that never look at the
 * markup at all — feed readers, link unfurlers, and anything that just GETs
 * /favicon.ico — and apple-icon.png exists because the apple-icon convention takes png
 * or jpeg only, no svg.
 *
 *
 * THE MARK
 *
 * A J and an A run together into one continuous stroke. The J is the cup on the left,
 * the A is the arch on the right, and they share the middle riser, so the pair is drawn
 * without lifting the pen. It reads as a letter pair up close and as a worm at a
 * glance, which is the intent. The two terminals say which way to read it: the short
 * one is capped at the top left where a J starts, the long one runs to the foot of the
 * tile where the A's right leg ends.
 *
 * This commentary lives here rather than in icon.svg because that file is served
 * verbatim to every visitor, and a design memo is not worth the bytes on a favicon.
 *
 * GEOMETRY IS PLAIN ARITHMETIC, not a traced glyph. Three parallel risers 20 apart,
 * joined by two half-circles of r=10, so each turn is tangent to the risers it joins
 * and no join is visible at an 11 stroke. Round caps stand in for the rounded terminals
 * of the display face.
 *
 * WHAT CONSTRAINS EVERY NUMBER IS THE 16px RENDER, where one viewBox unit is a quarter
 * of a pixel. The counters are 9 units, a hair over 2px there, and the stroke is 11
 * rather than the 12 the drawing wants because at 12 the counters close up and the
 * three risers merge into one orange block. Check them first if the geometry moves.
 *
 * COLOURS ARE THE MASTHEAD'S OWN PAIRING, #0f2136 (--text-strong, the ink the name is
 * set in) against #c2470c (--p-ember, the colour of the word "andes."). Nothing else on
 * the site puts those two together at this size, which is the point of using them here.
 *
 * 3.25:1, AND THAT IS THE FLOOR. Ember on this ink clears the 3:1 non-text bar and
 * nothing else in the palette does better while staying dark: the same ember on
 * #1d3f63 measures 2.16:1 and the mark turns to a smudge. If the ink ever lightens,
 * re-measure — there are about two hundredths of headroom.
 *
 * THAT NUMBER WAS MEASURED HERE, not inherited. tokens/_colors.scss chose #c2470c
 * through the multiply blend it sits in on the page, and vouches for exactly one flat
 * use of it: the contact block, where the ground is bright. A flat ember on a dark
 * ground is a case that file does not cover, so it carries no blessing from upstream
 * and the ratio above is this tile's own.
 *
 * THE TILE IS FILLED rather than a mark on transparency because the tab strip is
 * whatever colour the browser theme says it is, and a mark on nothing loses one of the
 * two themes.
 *
 * THE APPLE TILE IS SQUARED BY FLATTENING, not by a second copy of the geometry. iOS
 * applies its own mask, and an icon that arrives pre-rounded gets rounded twice, which
 * leaves four light nicks in the corners. Compositing onto the tile's own colour fills
 * the transparent corners back in, so one source file covers both shapes.
 *
 *
 * SHARP IS NOT A DEPENDENCY of this project and should not become one for a script that
 * runs by hand every few months. Next ships it as an optional dependency for the image
 * optimiser, so a copy is already on disk; the loader below finds that one.
 */

import { createRequire } from "node:module";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src/app/icon.svg");
const ICO_SIZES = [16, 32, 48];
const APPLE_SIZE = 180;

/** The tile colour, read out of the source so that the two cannot drift apart. */
const tileColour = (svg) => {
  const match = /<rect[^>]*\sfill="(#[0-9a-fA-F]{3,8})"/.exec(svg);
  if (!match) {
    throw new Error(`No tile fill found in ${source}; the apple icon needs one to square its corners.`);
  }
  return match[1];
};

/**
 * A missing store is a normal state here rather than a failure: see loadSharp. Nothing
 * else is. This tree lives under Documents, which on Windows is routinely redirected
 * into OneDrive, so EACCES and an unhydrated placeholder are both live possibilities —
 * and swallowing either would send the reader to `pnpm install`, which fixes neither.
 */
const entriesIn = (dir) => {
  try {
    return readdirSync(dir);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

/**
 * The three places sharp can be, in the order they are worth trying.
 *
 * pnpm links an optional transitive dependency into its own store rather than into
 * node_modules/, so under this repo's own layout the bare "sharp" specifier does not
 * resolve at all and the versioned store path is the one that answers. The bare
 * specifier is still worth keeping last, for a clone installed with npm or yarn or with
 * pnpm's hoisted node-linker. The store itself may be missing outright, which is what a
 * fresh worktree looks like before it gets its own install.
 */
const loadSharp = () => {
  const require = createRequire(import.meta.url);
  const store = path.join(root, "node_modules/.pnpm");
  // Newest first. readdir hands these back alphabetically, which would put an older
  // sharp@0.34.0 ahead of sharp@0.35.3 and build the icons with the older renderer
  // without saying so — two versions in one store is what a second dependency pinning
  // its own sharp looks like. Numeric collation also gets 0.9 and 0.10 the right way
  // round, which a plain sort does not.
  const versioned = entriesIn(store)
    .filter((entry) => entry.startsWith("sharp@"))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];
  const candidates = [
    versioned && path.join(store, versioned, "node_modules/sharp"),
    path.join(store, "node_modules/sharp"),
    "sharp",
  ].filter(Boolean);

  // Resolving before requiring is what keeps the two failures apart. sharp being
  // absent and sharp being present but unable to load are different problems with
  // different fixes, and the second is the likelier one once a lockfile has been
  // installed on a different OS or architecture. A path that does not resolve is just
  // the wrong place to look, so the loop moves on; a path that resolves and then throws
  // is sharp's own binding failing, and that error says which runtime it wanted and is
  // far more use than anything this function could write in its place, so it goes up
  // untouched.
  for (const candidate of candidates) {
    try {
      require.resolve(candidate);
    } catch {
      continue;
    }
    return require(candidate);
  }

  throw new Error(
    `sharp was not found in any of:\n  ${candidates.join("\n  ")}\n` +
      "Run `pnpm install`, or `pnpm add -D sharp` to force a copy.",
  );
};

/**
 * The viewBox is 64 units wide and sharp rasterises SVG at 72dpi, so units land on
 * pixels 1:1 at that default. Scaling the density is what renders the curves at the
 * target size rather than rendering them once and resampling a 64px bitmap.
 *
 * Both outputs go through here rather than each inlining its own chain, so that a
 * change to how one is rendered cannot quietly leave the other behind. `background` is
 * the only difference between them, and it is what squares the apple tile.
 */
const render = (sharp, svg, size, background) => {
  const image = sharp(svg, { density: Math.round((72 * size) / 64) }).resize(size, size);
  return (background ? image.flatten({ background }) : image)
    .png({ compressionLevel: 9 })
    .toBuffer();
};

/**
 * An .ico is a six-byte header, one sixteen-byte directory entry per image, then the
 * payloads. The payloads here are PNGs rather than the older BMP form, which every
 * browser and every Windows since Vista reads, and which keeps the file a tenth the
 * size. A dimension of 256 would be written as 0; nothing here is that big.
 */
const ico = (images) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const directory = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size & 0xff, 0); // 256 is written as 0, which is why this masks
    entry.writeUInt8(size & 0xff, 1);
    entry.writeUInt8(0, 2); // palette size, 0 for truecolour
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...directory, ...images.map(({ data }) => data)]);
};

const sharp = loadSharp();
const svg = readFileSync(source);

// Everything that can fail on the source is resolved before anything is written. The
// two files are a pair, and a throw between the two writes would leave a fresh .ico
// beside a stale tile with nothing to say so.
const tile = tileColour(svg.toString());

const images = await Promise.all(
  ICO_SIZES.map(async (size) => ({ size, data: await render(sharp, svg, size) })),
);
const apple = await render(sharp, svg, APPLE_SIZE, tile);

writeFileSync(path.join(root, "src/app/favicon.ico"), ico(images));
writeFileSync(path.join(root, "src/app/apple-icon.png"), apple);

console.log(`favicon.ico     ${ICO_SIZES.join(" + ")}`);
console.log(`apple-icon.png  ${APPLE_SIZE}x${APPLE_SIZE} on ${tile}`);
console.log(`rendered by sharp ${sharp.versions.sharp}`);
