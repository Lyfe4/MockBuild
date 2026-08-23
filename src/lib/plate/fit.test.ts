import { describe, expect, it } from 'vitest';

import { plateViewBox, platePoints, viewBoxAttribute } from './fit';
import type { PlatePart, SpeciesPlate } from './types';

const REFERENCE = {
  title: 'Test reference',
  artist: 'Nobody',
  year: 1900,
  source: 'https://example.invalid/plate',
  licence: 'Public domain',
} as const;

function plate(parts: readonly PlatePart[]): SpeciesPlate {
  return {
    species: 'test',
    order: 'coleoptera',
    sex: 'unsexed',
    reference: REFERENCE,
    parts,
  };
}

describe('platePoints', () => {
  it('adds the reflection of every mirrored part', () => {
    const points = platePoints(
      plate([{ id: 'elytron', rank: 'outline', fill: 'pigment', d: 'M10 0 L40 100' }]),
    );

    expect(points).toEqual([
      { x: 10, y: 0 },
      { x: 40, y: 100 },
      { x: -10, y: 0 },
      { x: -40, y: 100 },
    ]);
  });

  it('leaves a midline part alone', () => {
    const points = platePoints(
      plate([
        { id: 'scutellum', rank: 'structure', fill: 'ink', d: 'M-20 0 L20 0', mirror: false },
      ]),
    );

    expect(points).toEqual([
      { x: -20, y: 0 },
      { x: 20, y: 0 },
    ]);
  });
});

describe('plateViewBox', () => {
  it('centres the frame on the midline, not on the drawing', () => {
    // The asymmetry is deliberate: a right-hand antenna reaching 200 and a
    // body reaching 40 means the *pair* is 200 wide either way, and the axis
    // of symmetry still belongs in the middle of the frame.
    const box = plateViewBox(
      plate([
        { id: 'head', rank: 'outline', fill: 'pigment', d: 'M0 0 L40 500' },
        { id: 'antenna', rank: 'structure', fill: 'none', d: 'M20 100 L200 40' },
      ]),
    );

    expect(box.minX).toBeCloseTo(-box.width / 2);
  });

  it('frames the whole animal with a margin', () => {
    const box = plateViewBox(
      plate([{ id: 'elytron', rank: 'outline', fill: 'pigment', d: 'M0 0 L100 1000' }]),
    );

    // Content is 200 wide once reflected and 1000 tall; the frame clears both.
    expect(box.width).toBeGreaterThan(200);
    expect(box.height).toBeGreaterThan(1000);
    expect(box.minY).toBeLessThan(0);
    expect(box.minY + box.height).toBeGreaterThan(1000);
  });

  it('grows the frame for a smaller species rather than shrinking the drawing', () => {
    const parts: PlatePart[] = [
      { id: 'elytron', rank: 'outline', fill: 'pigment', d: 'M0 0 L100 1000' },
    ];

    const full = plateViewBox(plate(parts), 1);
    const halved = plateViewBox(plate(parts), 0.5);

    // Twice the frame for the same animal, so it reads half the size beside a
    // neighbour drawn at 1 — and every stroke width it carries is unchanged,
    // because nothing about the geometry moved.
    expect(halved.width / full.width).toBeCloseTo(2);
    expect(halved.height / full.height).toBeCloseTo(2);
    // Still centred, and still centred on the same animal.
    expect(halved.minX).toBeCloseTo(-halved.width / 2);
    expect(halved.minY + halved.height / 2).toBeCloseTo(full.minY + full.height / 2);
  });

  it('keeps the animal upright, so a portrait beetle gets a portrait frame', () => {
    const box = plateViewBox(
      plate([{ id: 'elytron', rank: 'outline', fill: 'pigment', d: 'M0 0 L100 1000' }]),
    );

    expect(box.height).toBeGreaterThan(box.width);
  });

  it('clamps a nonsensical scale rather than dividing by zero', () => {
    const parts: PlatePart[] = [
      { id: 'elytron', rank: 'outline', fill: 'pigment', d: 'M0 0 L100 1000' },
    ];

    expect(Number.isFinite(plateViewBox(plate(parts), 0).width)).toBe(true);
    expect(plateViewBox(plate(parts), 4).width).toEqual(plateViewBox(plate(parts), 1).width);
  });

  it('throws on a plate with nothing in it, rather than returning an inverted box', () => {
    expect(() => plateViewBox(plate([]))).toThrow(/no geometry/);
  });
});

describe('viewBoxAttribute', () => {
  it('writes the four numbers, rounded to two places', () => {
    expect(viewBoxAttribute({ minX: -100.006, minY: -12.5, width: 200.014, height: 1300 })).toBe(
      '-100.01 -12.5 200.01 1300',
    );
  });
});
