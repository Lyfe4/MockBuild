import { describe, expect, it } from 'vitest';

import { SEASONS } from '@/types';

import { GLYPH_VIEW_BOX, SEASON_GLYPHS } from './seasonGlyphs';

/**
 * The glyphs are path data, so this is the only place they can be checked at
 * all: nothing downstream knows whether a curve leaves its box, and a glyph
 * drawn half outside the view box renders as a clipped smear at 48px and as
 * nothing worth noticing in a diff.
 *
 * The whole file rests on the vocabulary rule stated in `seasonGlyphs.ts` —
 * absolute `M`, `L`, `C`, `Z` and nothing else — because in that subset every
 * number is half of an `x y` pair. That is what lets a coordinate be measured
 * here without a path parser, and the first test is the one that keeps it true.
 */

/** The stroke the dial draws these at, in view-box units. */
const STROKE_WIDTH = 1.6;

interface Segment {
  readonly command: string;
  readonly numbers: readonly number[];
}

/** Splits `d` into commands and their numbers. Assumes nothing about which. */
function segmentsOf(d: string): readonly Segment[] {
  return [...d.matchAll(/([A-Za-z])([^A-Za-z]*)/g)].map(([, command, rest]) => ({
    command: command ?? '',
    numbers: (rest?.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number),
  }));
}

/** Every point in `d`, valid only because the vocabulary is absolute. */
function pointsOf(d: string): readonly (readonly [number, number])[] {
  const points: [number, number][] = [];

  for (const { numbers } of segmentsOf(d)) {
    for (let index = 0; index + 1 < numbers.length; index += 2) {
      points.push([numbers[index] ?? 0, numbers[index + 1] ?? 0]);
    }
  }

  return points;
}

const everyPath = (): readonly { season: string; d: string }[] =>
  SEASONS.flatMap((season) => SEASON_GLYPHS[season].paths.map((d) => ({ season, d })));

describe('the seasonal glyphs', () => {
  it('has one for each season and nothing else', () => {
    expect(Object.keys(SEASON_GLYPHS).sort()).toStrictEqual([...SEASONS].sort());
  });

  it('draws them all in the same box, which is what makes them a set', () => {
    // A glyph in a larger box would be drawn smaller by the same CSS, and read
    // as a quieter season rather than as a different one.
    for (const season of SEASONS) {
      expect(SEASON_GLYPHS[season].viewBox, season).toBe(GLYPH_VIEW_BOX);
    }

    expect(GLYPH_VIEW_BOX.split(' ').map(Number)).toStrictEqual([0, 0, 24, 24]);
  });

  it('uses only absolute M, L, C and Z, so a coordinate is a coordinate', () => {
    /*
      The rule the rest of this file depends on. An `A` takes seven numbers of
      which two are a point; a lowercase command makes every number a delta. Let
      either in and `pointsOf` above silently starts measuring the wrong things.
    */
    for (const { season, d } of everyPath()) {
      for (const { command, numbers } of segmentsOf(d)) {
        expect(['M', 'L', 'C', 'Z'], `${season}: ${d}`).toContain(command);

        if (command === 'Z') expect(numbers, `${season}: ${d}`).toHaveLength(0);
        // M and L take points; C takes three of them. Both are even.
        else expect(numbers.length % 2, `${season}: ${d}`).toBe(0);
      }
    }
  });

  it('starts every path with a move, so no path inherits where the last one ended', () => {
    for (const { season, d } of everyPath()) {
      expect(d.trimStart().startsWith('M'), `${season}: ${d}`).toBe(true);
    }
  });

  it('keeps every stroke inside the view box', () => {
    /*
      Half the stroke width of margin, because a stroke straddles its path: a
      ray ending at y = 24 would be inked to 24.8 and the box would no longer
      describe the drawing. SVG does not clip to a view box, so this fails
      nowhere at runtime — it just quietly makes `--glyph-size` a lie.
    */
    const margin = STROKE_WIDTH / 2;

    for (const { season, d } of everyPath()) {
      for (const [x, y] of pointsOf(d)) {
        expect(x, `${season} x in ${d}`).toBeGreaterThanOrEqual(margin);
        expect(x, `${season} x in ${d}`).toBeLessThanOrEqual(24 - margin);
        expect(y, `${season} y in ${d}`).toBeGreaterThanOrEqual(margin);
        expect(y, `${season} y in ${d}`).toBeLessThanOrEqual(24 - margin);
      }
    }
  });

  it('gives every glyph enough ink to be read, and none of it duplicated', () => {
    for (const season of SEASONS) {
      const { paths } = SEASON_GLYPHS[season];

      expect(paths.length, season).toBeGreaterThan(0);
      // A repeated path is a copy-paste that overdraws itself: invisible on
      // screen, and half the strokes the author thinks they have.
      expect(new Set(paths).size, season).toBe(paths.length);
    }
  });

  it('draws four different things', () => {
    // Two seasons sharing a skeleton is the failure mode these were designed
    // around — a sprout and a bare branch are both a stem with two things on it.
    const drawings = SEASONS.map((season) => SEASON_GLYPHS[season].paths.join('|'));

    expect(new Set(drawings).size).toBe(SEASONS.length);
  });

  it('says what each one draws', () => {
    const descriptions = SEASONS.map((season) => SEASON_GLYPHS[season].description);

    for (const description of descriptions) expect(description.length).toBeGreaterThan(20);

    expect(new Set(descriptions).size).toBe(SEASONS.length);
  });

  it('centres the summer disc on the box, which is what the rays are drawn around', () => {
    // The one glyph whose parts have to agree with each other: eight rays
    // pointing at a disc that is not where they think it is looks broken in a
    // way no bounds check would catch.
    const [disc] = SEASON_GLYPHS.summer.paths;
    const points = pointsOf(disc ?? '');
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);

    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(12, 1);
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(12, 1);
  });
});
