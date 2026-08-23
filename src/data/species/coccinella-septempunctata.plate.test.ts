import { describe, expect, it } from 'vitest';

import { boundsOf, parsePathData, pathPoints, type PlatePartId } from '@/lib/plate';
import { describePlateContract } from '@/test/plateContract';
import { allPoints, capsuleWidth, flattenClosed, inside } from '@/test/plateGeometry';

import { COCCINELLA_SEPTEMPUNCTATA as SPECIES } from './coccinella-septempunctata';
import { COCCINELLA_SEPTEMPUNCTATA_PLATE as PLATE } from './coccinella-septempunctata.plate';

/**
 * The seven-spot, checked.
 *
 * The shared contract covers what every plate must be. What is only true of
 * *this* animal is the spot count — seven, which is the species — and the
 * silhouette, which is nearly circular and comes out as a beetle-shaped oval
 * unless somebody is watching.
 */

function count(id: PlatePartId): number {
  return PLATE.parts.filter((part) => part.id === id).length;
}

describe('the Coccinella septempunctata plate', () => {
  describePlateContract(PLATE, SPECIES);

  it('draws seven spots, which is the name of the animal', () => {
    // Three a wing case, mirrored, plus one on the axis behind the scutellum,
    // plus the two pale pronotal patches which are markings too — so the count
    // is done on the black ones.
    const spots = PLATE.parts.filter((part) => part.id === 'marking' && part.fill === 'ink');
    const paired = spots.filter((part) => part.mirror !== false);
    const onAxis = spots.filter((part) => part.mirror === false);

    expect(paired).toHaveLength(3);
    expect(onAxis).toHaveLength(1);
    expect(paired.length * 2 + onAxis.length).toBe(7);
  });

  it('draws the scutellar spot once, on the axis, rather than as a mirrored half', () => {
    const onAxis = PLATE.parts.find(
      (part) => part.id === 'marking' && part.fill === 'ink' && part.mirror === false,
    );
    const bounds = boundsOf(pathPoints(parsePathData(onAxis?.d ?? 'M0 0')));

    // Cut down the middle and reflected, the two halves show the join.
    expect(Math.abs((bounds?.minX ?? 0) + (bounds?.maxX ?? 0))).toBeLessThan(1);
  });

  it('keeps every spot on the wing case it belongs to', () => {
    const elytron = PLATE.parts.find((part) => part.id === 'elytron');
    const outline = flattenClosed(elytron?.d ?? 'M0 0');
    const spots = PLATE.parts.filter(
      (part) => part.id === 'marking' && part.fill === 'ink' && part.mirror !== false,
    );

    for (const spot of spots) {
      for (const point of pathPoints(parsePathData(spot.d))) {
        expect(inside(outline, point), `a spot strays off the elytron at ${String(point.y)}`).toBe(
          true,
        );
      }
    }
  });

  it('draws a nearly circular animal, not a beetle-shaped oval', () => {
    const elytron = PLATE.parts.find((part) => part.id === 'elytron');
    const bounds = boundsOf(pathPoints(parsePathData(elytron?.d ?? 'M0 0')));
    const across = (bounds?.maxX ?? 0) * 2;
    const along = (bounds?.maxY ?? 0) - (bounds?.minY ?? 0);

    // Measured off the lithograph the wing cases are about 0.85 as wide as they
    // are long. A stag beetle is 0.35, and drawing a seven-spot at that reads
    // as a different family before any of the pattern resolves.
    expect(across / along).toBeGreaterThan(0.7);
    expect(across / along).toBeLessThan(1);
  });

  it('gives it the two pale pronotal patches that separate it from a harlequin', () => {
    const pale = PLATE.parts.filter((part) => part.id === 'marking' && part.fill === 'surface');

    // One authored, two drawn.
    expect(pale).toHaveLength(1);
    expect(pale[0]?.mirror).not.toBe(false);
  });

  it('keeps the legs short and thick, which is what a ladybird has', () => {
    for (const pair of ['foreleg', 'midleg', 'hindleg'] as const) {
      expect(count(`${pair}-femur`), pair).toBe(1);
      expect(count(`${pair}-tibia`), pair).toBe(1);
      // Three segments and two claws.
      expect(count(`${pair}-tarsus`), pair).toBe(5);

      const femur = PLATE.parts.find((part) => part.id === `${pair}-femur`);

      // Thicker in proportion than the stag beetle's, which is the whole point:
      // at a stag's proportions a seven-spot reads as a ground beetle.
      expect(capsuleWidth(femur?.d ?? 'M0 0'), pair).toBeGreaterThan(24);
    }
  });

  it('agrees with the record about spots and about being red', () => {
    expect(SPECIES.morphology.markings).toBe('spots');
    expect(SPECIES.morphology.colourFamily).toBe('red');
    expect(SPECIES.morphology.bodyShape).toBe('round');
  });

  it('reaches wider than it is long, because the legs are out', () => {
    const points = allPoints(PLATE);
    const half = points.reduce((most, point) => Math.max(most, Math.abs(point.x)), 0);

    expect(half).toBeGreaterThan(400);
  });
});
