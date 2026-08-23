import { describe, expect, it } from 'vitest';

import { LINE_WEIGHTS, PIGMENTS } from '@/lib/insect';
import { PLATE_RANKS } from '@/lib/plate';

// `?raw` rather than reading the file: it goes through the same resolver the
// app uses, so the test cannot end up asserting against a stylesheet the build
// does not actually ship.
import CSS from './tokens.css?raw';

/**
 * Tokens are the one part of the design system a component cannot type-check
 * against. A season missing a pigment does not fail to compile — it falls back
 * to whatever the previous cascade layer said, which is the neutral default, so
 * a whole season would quietly render its specimens in the undressed palette.
 *
 * This reads the stylesheet as text on purpose. jsdom does not resolve
 * `var()` chains, so asking the DOM what `--pigment-3` computes to in winter
 * would answer nothing useful; the declaration itself is what has to exist.
 */

const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;

/** The body of one selector's block. */
function block(selector: string): string {
  const start = CSS.indexOf(`${selector} {`);

  expect(start, `no block for ${selector}`).toBeGreaterThanOrEqual(0);

  const end = CSS.indexOf('\n}', start);

  return CSS.slice(start, end);
}

/** Every custom property the block declares, mapped to its value. */
function declarations(source: string): Map<string, string> {
  const found = new Map<string, string>();

  for (const match of source.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;

    if (name !== undefined && value !== undefined) found.set(name, value.trim());
  }

  return found;
}

const PIGMENT_TOKENS = [
  ...PIGMENTS.map((index) => `--pigment-${String(index)}`),
  ...PIGMENTS.map((index) => `--pigment-deep-${String(index)}`),
];

describe('pigment tokens', () => {
  it('names six pigments and six deeps — twelve in all', () => {
    expect(PIGMENT_TOKENS).toHaveLength(12);
  });

  it.each(SEASONS)('%s defines all twelve', (season) => {
    const declared = declarations(block(`:root[data-season='${season}']`));

    for (const token of PIGMENT_TOKENS) {
      expect(declared.has(token), `${season} is missing ${token}`).toBe(true);
    }
  });

  it('defines all twelve on the undressed default, so a specimen is never unpainted', () => {
    // The palette that renders before ThemeProvider runs, and if it never does.
    const declared = declarations(block(':root'));

    for (const token of PIGMENT_TOKENS) {
      expect(declared.has(token), `the default palette is missing ${token}`).toBe(true);
    }
  });

  it.each([...SEASONS, null])('resolves every pigment to a primitive (%s)', (season) => {
    // Semantic tokens point at the primitive layer; a literal colour here would
    // be a raw value in the layer components consume.
    const declared = declarations(
      block(season === null ? ':root' : `:root[data-season='${season}']`),
    );

    for (const token of PIGMENT_TOKENS) {
      expect(declared.get(token)).toMatch(/^var\(--pigment-[\w-]+\)$/);
    }
  });

  it('gives every season its own set of pigments', () => {
    // Four seasons sharing one palette would make the whole layer decorative.
    const signatures = SEASONS.map((season) => {
      const declared = declarations(block(`:root[data-season='${season}']`));

      return PIGMENT_TOKENS.map((token) => declared.get(token) ?? '').join('|');
    });

    expect(new Set(signatures).size).toBe(SEASONS.length);
  });

  it('gives every primitive pigment a distinct value within its season', () => {
    // Two families resolving to the same hex would leave the seed picking
    // between colours a viewer cannot tell apart.
    for (const season of [...SEASONS, 'archive'] as const) {
      const values = [...declarations(block(':root')).entries()]
        .filter(([name]) => name.startsWith(`--pigment-${season}-`))
        .map(([, value]) => value);

      expect(values, `no primitives for ${season}`).toHaveLength(12);
      expect(new Set(values).size).toBe(12);
    }
  });
});

describe('the illustration line hierarchy', () => {
  const declared = declarations(block(':root'));

  it('gives every weight the generator can rank a line at a width', () => {
    for (const weight of LINE_WEIGHTS) {
      expect(declared.has(`--insect-stroke-${weight}`)).toBe(true);
    }
  });

  it('keeps the outline heaviest and the detail finest', () => {
    /**
     * The one rule in the hierarchy a change could quietly break. Inverting
     * two of these does not fail anything else — the drawing simply stops
     * reading from across the room, because the texture would be shouting over
     * the silhouette.
     */
    const width = (weight: string): number => Number(declared.get(`--insect-stroke-${weight}`));

    expect(width('outline')).toBeGreaterThan(width('structure'));
    expect(width('structure')).toBeGreaterThan(width('detail'));
    expect(width('detail')).toBeGreaterThan(0);
  });

  it('does not move with the season: line weight belongs to the plate', () => {
    for (const season of SEASONS) {
      const seasonal = declarations(block(`:root[data-season='${season}']`));

      for (const weight of LINE_WEIGHTS) {
        expect(seasonal.has(`--insect-stroke-${weight}`)).toBe(false);
      }
    }
  });

  /**
   * The hand-authored plates rank their lines the same way, in their own
   * coordinate space. Two sets of numbers, one hierarchy — and if the plate
   * ratios drift far from the generator's, the two stop looking like the same
   * hand, which is exactly what the comparison sheet exists to judge.
   */
  it('gives every plate rank a width, and keeps the same ranking', () => {
    const width = (name: string): number => Number(declared.get(name));

    for (const rank of PLATE_RANKS) {
      expect(declared.has(`--plate-stroke-${rank}`), rank).toBe(true);
    }

    expect(width('--plate-stroke-outline')).toBeGreaterThan(width('--plate-stroke-structure'));
    expect(width('--plate-stroke-structure')).toBeGreaterThan(width('--plate-stroke-detail'));
    expect(width('--plate-stroke-detail')).toBeGreaterThan(0);
  });

  it('scales the plate weights to plate space rather than reusing the insect numbers', () => {
    // A plate is drawn in a box roughly nine times the size of the generator's,
    // so its lines have to be roughly nine times the number to look the same
    // weight. This catches the mistake of copying one set over the other.
    const ratio =
      Number(declared.get('--plate-stroke-outline')) /
      Number(declared.get('--insect-stroke-outline'));

    expect(ratio).toBeGreaterThan(4);
    expect(ratio).toBeLessThan(16);
  });

  it('does not move the plate weights with the season either', () => {
    for (const season of SEASONS) {
      const seasonal = declarations(block(`:root[data-season='${season}']`));

      for (const rank of PLATE_RANKS) {
        expect(seasonal.has(`--plate-stroke-${rank}`)).toBe(false);
      }
    }
  });
});
