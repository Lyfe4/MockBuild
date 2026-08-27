/**
 * `npm run og:build` — draw `public/og-image.png`, the 1200 × 630 card a link
 * to this site unfurls into.
 *
 * ## Why a script and not a screenshot
 *
 * A screenshot of the site would be a picture of a browser window: chrome,
 * scrollbars, whatever season the machine happened to be in, and a fresh set of
 * pixels every time anything moved. This composes the card from the same two
 * things the site is made of — the stag beetle's own path data and the archive's
 * wordmark — so it is reproducible, diffable in the sense that matters, and
 * legible at the size a link preview actually renders.
 *
 * `LUCANUS_CERVUS_PLATE` is imported directly. Node's type stripping runs this
 * file as written, and the generated plate modules import only a *type* from
 * `@/lib/plate`, which is erased — so the alias never needs resolving. The same
 * trick `scripts/sources-builder` relies on.
 *
 * ## No `og:verify`
 *
 * Unlike `plate:verify` and `sources:verify`, this has no byte-equality check
 * and the PNG is committed as a binary. The SVG below is deterministic, but the
 * *raster* is produced by resvg and libpng, and their output moves between
 * versions and platforms for reasons that have nothing to do with this
 * repository. A verify step that failed on an unrelated upgrade would teach
 * people to skip it. Same call as the vendored fonts.
 *
 * ## What the renderer here does and does not share with the app
 *
 * The drawing loop below is a second, much smaller implementation of what
 * `components/SpeciesIllustration` does: mirror the right half, stack in array
 * order, three stroke ranks, five fills. It is deliberately not shared. The app's
 * renderer resolves its colours from CSS custom properties that a season
 * rewrites, and a card baked into a PNG has no season — so it takes literal
 * values from the neutral palette, and the two have nothing left in common but
 * the path data, which *is* shared.
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';
import { decompress } from 'wawoff2';

import { LUCANUS_CERVUS_PLATE as PLATE } from '../../src/data/species/lucanus-cervus.plate.ts';
import { INSTITUTION } from '../../src/data/institution.ts';
import { SITE } from '../../src/data/site.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const WIDTH = 1200;
const HEIGHT = 630;

/**
 * Literal values from the neutral palette in `src/styles/tokens.css`, before any
 * season is applied — `--paper-linen-50`, `--ink-sepia-900` and their
 * neighbours. Copied rather than imported because a PNG cannot hold a custom
 * property, and the neutral palette is the one that is not a season's opinion.
 */
const INK = '#2b2317';
const INK_MUTED = '#6b5c42';
const PAPER = '#f5f1e8';
const SURFACE = '#fbf8f1';
const LINE = '#dcd4c4';
const PIGMENT = '#c9b38a';
const PIGMENT_DEEP = '#8f7440';

/** The three stroke ranks, in plate units. Mirrors `--plate-stroke-*`. */
const STROKE: Record<string, number> = { outline: 9, structure: 5.5, detail: 3 };

const FILL: Record<string, string> = {
  none: 'none',
  surface: SURFACE,
  pigment: PIGMENT,
  'pigment-deep': PIGMENT_DEEP,
  ink: INK,
};

/**
 * The drawing's own bounds, control points included.
 *
 * `src/lib/plate/fit.ts` does this properly and is not imported: it reaches its
 * neighbours through extensionless specifiers, which Node will not resolve. The
 * numbers only have to frame one drawing on one card, so a regex over the path
 * data is enough — and being wrong here is visible in the output rather than
 * silent.
 */
function bounds(parts: readonly { d: string; mirror?: false }[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const part of parts) {
    const values = (part.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

    for (let i = 0; i + 1 < values.length; i += 2) {
      const x = values[i] ?? 0;
      const y = values[i + 1] ?? 0;
      const xs = part.mirror === false ? [x] : [x, -x];

      for (const candidate of xs) {
        minX = Math.min(minX, candidate);
        maxX = Math.max(maxX, candidate);
      }

      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  return { minX, maxX, minY, maxY };
}

function escapeXml(text: string): string {
  return text.replace(/[<>&]/g, (c) => (c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;'));
}

function plateGroup(): string {
  const box = bounds(PLATE.parts);
  const drawnWidth = box.maxX - box.minX;
  const drawnHeight = box.maxY - box.minY;

  // The plate sits in the left third of the card, full bleed top to bottom with
  // a margin, and is scaled to whichever of its own dimensions runs out first.
  const frame = { x: 96, y: 74, width: 330, height: HEIGHT - 148 };
  const scale = Math.min(frame.width / drawnWidth, frame.height / drawnHeight);
  const tx = frame.x + frame.width / 2 - ((box.minX + box.maxX) / 2) * scale;
  const ty = frame.y + frame.height / 2 - ((box.minY + box.maxY) / 2) * scale;

  const clipped = new Set(
    PLATE.parts.flatMap((part) => (part.clipTo === undefined ? [] : [part.clipTo])),
  );

  const defs = [...clipped]
    .map((id) => {
      const shapes = PLATE.parts
        .filter((part) => part.id === id)
        .flatMap((part) => [
          `<path d="${part.d}"/>`,
          part.mirror === false ? '' : `<path d="${part.d}" transform="scale(-1,1)"/>`,
        ])
        .join('');

      return `<clipPath id="clip-${id}">${shapes}</clipPath>`;
    })
    .join('');

  // The array is the stacking, for both halves: each mirrored part is emitted
  // followed immediately by its own reflection. Grouping the mirrored parts and
  // the midline ones separately is the bug the app's renderer has a comment
  // about, and it would look the same here.
  const paths = PLATE.parts
    .flatMap((part) => {
      const attributes =
        `fill="${FILL[part.fill] ?? 'none'}" stroke="${INK}" ` +
        `stroke-width="${String(STROKE[part.rank] ?? 4)}" ` +
        `stroke-linecap="round" stroke-linejoin="round"` +
        (part.clipTo === undefined ? '' : ` clip-path="url(#clip-${part.clipTo})"`);
      const one = `<path d="${part.d}" ${attributes}/>`;

      return part.mirror === false
        ? [one]
        : [one, `<path d="${part.d}" ${attributes} transform="scale(-1,1)"/>`];
    })
    .join('');

  return `<defs>${defs}</defs><g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(5)})">${paths}</g>`;
}

function card(): string {
  const text = 508;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${String(WIDTH)}" height="${String(HEIGHT)}" viewBox="0 0 ${String(WIDTH)} ${String(HEIGHT)}">
  <rect width="${String(WIDTH)}" height="${String(HEIGHT)}" fill="${PAPER}"/>
  <rect x="28" y="28" width="${String(WIDTH - 56)}" height="${String(HEIGHT - 56)}" fill="none" stroke="${LINE}" stroke-width="2"/>
  ${plateGroup()}
  <line x1="${String(text - 44)}" y1="96" x2="${String(text - 44)}" y2="${String(HEIGHT - 96)}" stroke="${LINE}" stroke-width="2"/>
  <text x="${String(text)}" y="196" font-family="JetBrains Mono" font-size="21" letter-spacing="3.4" fill="${INK_MUTED}">EST. ${String(INSTITUTION.founded)}</text>
  <text x="${String(text)}" y="286" font-family="Fraunces" font-size="86" font-weight="600" fill="${INK}">Thornfield</text>
  <text x="${String(text)}" y="356" font-family="Fraunces" font-size="46" font-weight="400" fill="${INK}">Entomological Archive</text>
  <text x="${String(text)}" y="432" font-family="Fraunces" font-size="27" font-weight="400" fill="${INK_MUTED}">${escapeXml('Eighteen species, drawn by hand from')}</text>
  <text x="${String(text)}" y="470" font-family="Fraunces" font-size="27" font-weight="400" fill="${INK_MUTED}">${escapeXml('public-domain references.')}</text>
  <text x="${String(text)}" y="${String(HEIGHT - 108)}" font-family="JetBrains Mono" font-size="19" letter-spacing="2.6" fill="${INK_MUTED}">TEA-0001 · LUCANUS CERVUS</text>
</svg>`;
}

/**
 * Decompress one vendored WOFF2 into a temporary TTF and return its path.
 *
 * resvg reads TTF, not WOFF2, so the faces are converted with the same library
 * the fonts README records converting them with in the first place. It has a
 * `fontBuffers` option that would avoid the round trip through the disk, and it
 * is undocumented and absent from the package's own type declarations at 2.6.2 —
 * it works, and building on an API the author has not committed to is how a
 * script breaks on a patch release. `fontFiles` is the documented one.
 */
async function ttf(dir: string, name: string): Promise<string> {
  const source = await readFile(join(ROOT, 'public', 'fonts', name));
  const path = join(dir, name.replace(/\.woff2$/, '.ttf'));

  await writeFile(path, Buffer.from(await decompress(source)));

  return path;
}

async function main(): Promise<void> {
  const svg = card();
  let png: Buffer;

  /**
   * resvg reads TTF, not WOFF2, so the vendored faces are decompressed in
   * memory with the same library the fonts README records converting them with
   * in the first place. Nothing is written to disk but the PNG.
   *
   * Two of the rasteriser's limits shape what this card can be, and both are
   * limits rather than choices:
   *
   *   · `font-weight` reaches the variable `wght` axis, but
   *     `font-variation-settings` does not — resvg ignores it. So the wordmark
   *     is set at Fraunces' default optical size rather than the display
   *     `opsz` 96 the site's own masthead uses.
   *   · Registering the roman and the italic under one family name gets the
   *     roman for both, so the italic face is not loaded and no text here asks
   *     for it. Nothing on the card is a scientific name, which is the only
   *     thing the site sets in italic anyway.
   */
  const fonts = await mkdtemp(join(tmpdir(), 'thornfield-og-'));

  try {
    const renderer = new Resvg(svg, {
      font: {
        fontFiles: [
          await ttf(fonts, 'fraunces-latin.woff2'),
          await ttf(fonts, 'jetbrains-mono.woff2'),
        ],
        loadSystemFonts: false,
        defaultFontFamily: 'Fraunces',
      },
      fitTo: { mode: 'width', value: WIDTH },
    });

    png = renderer.render().asPng();
  } finally {
    await rm(fonts, { recursive: true, force: true });
  }

  const out = join(ROOT, 'public', SITE.ogImagePath.replace(/^\//, ''));

  await writeFile(out, png);
  console.log(
    `og:build — wrote public${SITE.ogImagePath} (${String(WIDTH)}x${String(HEIGHT)}, ${String(Math.round(png.length / 1024))} kB)`,
  );
}

await main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
