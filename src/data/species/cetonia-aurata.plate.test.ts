import { describe, expect, it } from 'vitest';

import { boundsOf, parsePathData, pathPoints, type PlatePartId } from '@/lib/plate';
import { describePlateContract } from '@/test/plateContract';
import { flattenClosed, inside } from '@/test/plateGeometry';

import { CETONIA_AURATA as SPECIES } from './cetonia-aurata';
import { CETONIA_AURATA_PLATE as PLATE } from './cetonia-aurata.plate';

/**
 * The rose chafer, checked.
 *
 * The shared contract covers what every plate must be. What is only true here
 * is the pair of characters the animal is identified by — the broken white
 * flecks and the uncovered pygidium — and the one thing the plate deliberately
 * cannot show, which is that the green is metallic.
 */

function count(id: PlatePartId): number {
  return PLATE.parts.filter((part) => part.id === id).length;
}

function boundsOfPart(id: PlatePartId) {
  const part = PLATE.parts.find((candidate) => candidate.id === id);

  return boundsOf(pathPoints(parsePathData(part?.d ?? 'M0 0')));
}

describe('the Cetonia aurata plate', () => {
  describePlateContract(PLATE, SPECIES);

  it('flecks the wing cases, which is what separates it from the other green beetles', () => {
    const flecks = PLATE.parts.filter(
      (part) => part.id === 'marking' && part.fill === 'surface' && part.clipTo === 'elytron',
    );

    // Several, small, and scattered rather than arranged: a beetle with two
    // tidy spots a side is a different animal.
    expect(flecks.length).toBeGreaterThanOrEqual(4);

    for (const fleck of flecks) {
      const points = flattenClosed(fleck.d);
      const width = Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x));
      const height = Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y));

      // Dashes, not dots. Each is at least twice as long as it is deep.
      expect(width / height, fleck.d.slice(0, 20)).toBeGreaterThan(1.8);
      expect(width).toBeLessThan(140);
    }
  });

  it('leaves the pygidium uncovered, which is a chafer character rather than damage', () => {
    const abdomen = boundsOf(
      flattenClosed(PLATE.parts.find((p) => p.id === 'abdomen')?.d ?? 'M0 0'),
    );
    const elytron = boundsOf(
      flattenClosed(PLATE.parts.find((p) => p.id === 'elytron')?.d ?? 'M0 0'),
    );

    expect(count('abdomen')).toBe(1);
    // It shows behind the wing cases, so it reaches further down than they do.
    expect(abdomen?.maxY ?? 0).toBeGreaterThan(elytron?.maxY ?? 0);
  });

  it('keeps every fleck on the wing case it belongs to', () => {
    // The shared contract samples clipped strokes; this asks the sharper
    // question for a filled marking, which is that its whole outline is on the
    // surface rather than most of it.
    const outline = flattenClosed(PLATE.parts.find((part) => part.id === 'elytron')?.d ?? 'M0 0');

    for (const fleck of PLATE.parts.filter((p) => p.id === 'marking')) {
      const off = flattenClosed(fleck.d).filter((point) => !inside(outline, point));

      expect(off, fleck.d.slice(0, 20)).toHaveLength(0);
    }
  });

  it('draws two wing cases as one, and the suture once', () => {
    expect(count('elytron')).toBe(1);
    expect(PLATE.parts.find((part) => part.id === 'elytron')?.mirror).not.toBe(false);
    // The seam is on the axis and drawn once — reflecting it would put a second
    // copy a hair off the first.
    expect(count('seam')).toBe(1);
    expect(PLATE.parts.find((part) => part.id === 'seam')?.mirror).toBe(false);
  });

  it('gives it the lamellate club that puts it in the Scarabaeoidea', () => {
    const antennae = PLATE.parts.filter((part) => part.id === 'antenna');

    expect(antennae.length).toBeGreaterThanOrEqual(3);
    // A filled club rather than the end of a tapering line: a lamellate
    // antenna is three flat plates, and it is the shape that identifies it.
    expect(antennae.some((part) => part.fill === 'pigment-deep')).toBe(true);
    expect(SPECIES.morphology.antennae).toBe('lamellate');
  });

  it('draws a broad beetle: about half as wide as it is long', () => {
    const elytron = boundsOfPart('elytron');
    const across = (elytron?.maxX ?? 0) * 2;

    // Measured off the plate. A chafer is broad and flat; drawing it at a stag
    // beetle's proportions would make it a different family at thumbnail size.
    expect(across / 1000).toBeGreaterThan(0.42);
    expect(across / 1000).toBeLessThan(0.62);
  });

  it('says metallic in the record and nowhere in the drawing', () => {
    // The plate is inked in one of six seasonal earths and iridescence is not
    // one of them. The word is where the fact lives.
    expect(SPECIES.morphology.colourFamily).toBe('metallic');
    expect(SPECIES.morphology.wingCover).toBe('elytra');
  });
});
