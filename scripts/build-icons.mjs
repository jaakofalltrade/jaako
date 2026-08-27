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
 * THE APPLE TILE IS SQUARED BY FLATTENING, not by a second copy of the geometry. iOS
 * applies its own mask, and an icon that arrives pre-rounded gets rounded twice, which
 * leaves four light nicks in the corners. Compositing onto the tile's own colour fills
 * the transparent corners back in, so one source file covers both shapes.
 *
 * SHARP IS NOT A DEPENDENCY of this project and should not become one for a script
 * that runs by hand every few months. Next ships it as an optional dependency for the
 * image optimiser, so a copy is already on disk; the loader below finds that one, and
 * falls back to a plain import in case the layout ever changes.
 */

import { createRequire } from "node:module";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src/app/icon.svg");
const ICO_SIZES = [16, 32, 48];
const APPLE_SIZE = 180;

/** The tile colour, and so the fill for the corners the apple tile has to lose. */
const TILE = "#0f2136";

const loadSharp = async () => {
  const require = createRequire(import.meta.url);
  const store = path.join(root, "node_modules/.pnpm");
  const vendored = readdirSync(store).find((entry) => entry.startsWith("sharp@"));
  const candidates = [
    vendored && path.join(store, vendored, "node_modules/sharp"),
    "sharp",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // Try the next one.
    }
  }
  throw new Error("sharp not found. Run `pnpm install`, or `pnpm add -D sharp` to force a copy.");
};

/**
 * The viewBox is 64 units wide and sharp rasterises SVG at 72dpi, so units land on
 * pixels 1:1 at that default. Scaling the density is what renders the curves at the
 * target size rather than rendering them once and resampling a 64px bitmap.
 */
const render = (sharp, svg, size) =>
  sharp(svg, { density: Math.round((72 * size) / 64) })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();

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
    entry.writeUInt8(size, 0);
    entry.writeUInt8(size, 1);
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

const sharp = await loadSharp();
const svg = readFileSync(source);

const images = await Promise.all(
  ICO_SIZES.map(async (size) => ({ size, data: await render(sharp, svg, size) })),
);
writeFileSync(path.join(root, "src/app/favicon.ico"), ico(images));

const apple = await sharp(svg, { density: Math.round((72 * APPLE_SIZE) / 64) })
  .resize(APPLE_SIZE, APPLE_SIZE)
  .flatten({ background: TILE })
  .png({ compressionLevel: 9 })
  .toBuffer();
writeFileSync(path.join(root, "src/app/apple-icon.png"), apple);

console.log(`favicon.ico  ${ICO_SIZES.join(" + ")}`);
console.log(`apple-icon.png  ${APPLE_SIZE}x${APPLE_SIZE}`);
