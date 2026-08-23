import { describe, expect, it } from 'vitest';

import { boundsOf, parsePathData, pathPoints, type PlatePartId } from '@/lib/plate';
import { describePlateContract } from '@/test/plateContract';
import { capsuleAxis, capsuleWidth, flattenClosed, inside } from '@/test/plateGeometry';

import { GRAPHOSOMA_ITALICUM as SPECIES } from './graphosoma-italicum';
import { GRAPHOSOMA_ITALICUM_PLATE as PLATE } from './graphosoma-italicum.plate';
import { PALOMENA_PRASINA_PLATE } from './palomena-prasina.plate';

/**
 * The Italian striped shield bug, checked.
 *
 * The shared contract covers what every plate must be. What is only true here is
 * the pair of characters that separate this bug from the green shield bug: the
 * six stripes running head to tail, and the scutellum that reaches almost to the
 * tip of the abdomen instead of stopping a third of the way down it.
 */

function parts(id: PlatePartId) {
  return PLATE.parts.filter((part) => part.id === id);
}

function boundsOfPart(id: PlatePartId) {
  return boundsOf(pathPoints(parsePathData(parts(id)[0]?.d ?? 'M0 0')));
}

/** Every stripe on one surface. */
function stripesOn(surface: PlatePartId) {
  return PLATE.parts.filter((part) => part.id === 'marking' && part.clipTo === surface);
}

describe('the Graphosoma italicum plate', () => {
  describePlateContract(PLATE, SPECIES);

  it('runs six stripes head to tail, three a side', () => {
    const pronotum = stripesOn('pronotum');
    const scutellum = stripesOn('scutellum');

    expect(SPECIES.morphology.markings).toBe('stripes');
    // Three a side on each of the two big surfaces, mirrored into six. Drawn
    // separately per side they would be one specimen's asymmetry.
    expect(pronotum).toHaveLength(3);
    expect(scutellum).toHaveLength(3);

    for (const stripe of [...pronotum, ...scutellum]) {
      const axis = capsuleAxis(stripe.d);

      expect(axis, stripe.d.slice(0, 24)).toBeDefined();
      expect(stripe.mirror).not.toBe(false);

      const along = Math.hypot(axis!.to.x - axis!.from.x, axis!.to.y - axis!.from.y);

      // Measured along the capsule's own spine rather than off a bounding box,
      // which for a stripe drawn at an angle reports the angle rather than the
      // shape. Twice as long as it is wide at the least: a stripe that is not
      // is a spot, and one drawn across the animal is a band.
      expect(along / capsuleWidth(stripe.d)).toBeGreaterThan(2);
      // And it runs head to tail: more of its length is down the animal than
      // across it.
      expect(Math.abs(axis!.to.y - axis!.from.y)).toBeGreaterThan(
        Math.abs(axis!.to.x - axis!.from.x),
      );
    }
  });

  it('carries the stripes onto the head as well', () => {
    // Which is what makes the animal read as striped end to end rather than as
    // a striped back with a plain head stuck on the front.
    expect(stripesOn('head').length).toBeGreaterThanOrEqual(2);
  });

  it('keeps every stripe on the surface it is drawn on', () => {
    for (const surface of ['pronotum', 'scutellum', 'head'] as const) {
      const outline = flattenClosed(parts(surface)[0]?.d ?? 'M0 0');

      for (const stripe of stripesOn(surface)) {
        const off = flattenClosed(stripe.d).filter((point) => !inside(outline, point));

        // The sharp question rather than the sampled one, because a stripe is a
        // filled shape: all of it is on the bug or it is beside the bug.
        expect(off, `${surface} stripe`).toHaveLength(0);
      }
    }
  });

  it('runs the scutellum almost to the tip of the abdomen', () => {
    const scutellum = boundsOfPart('scutellum');
    const abdomen = boundsOfPart('abdomen');
    const reach =
      ((scutellum?.maxY ?? 0) - (scutellum?.minY ?? 0)) /
      ((abdomen?.maxY ?? 0) - (abdomen?.minY ?? 0));

    // Four fifths of the abdomen and more. This is the character, and it is why
    // the hemelytra here are a strip down each side rather than half a wing.
    expect(reach).toBeGreaterThan(0.7);
  });

  it('gives the scutellum twice the reach the green shield bug has', () => {
    const reachOf = (plate: typeof PLATE): number => {
      const scutellum = boundsOf(
        pathPoints(parsePathData(plate.parts.find((p) => p.id === 'scutellum')?.d ?? 'M0 0')),
      );
      const abdomen = boundsOf(
        pathPoints(parsePathData(plate.parts.find((p) => p.id === 'abdomen')?.d ?? 'M0 0')),
      );

      return (
        ((scutellum?.maxY ?? 0) - (scutellum?.minY ?? 0)) /
        ((abdomen?.maxY ?? 0) - (abdomen?.minY ?? 0))
      );
    };

    // The comparison the second Hemiptera exists for. Both plates run the body
    // from y = 0 to y = 1000, so the fractions are directly comparable.
    expect(reachOf(PLATE)).toBeGreaterThan(reachOf(PALOMENA_PRASINA_PLATE) * 1.4);
  });

  it('draws a bug nearly as wide as it is long', () => {
    const abdomen = boundsOfPart('abdomen');
    const across = (abdomen?.maxX ?? 0) * 2;

    // 0.72 from the published measurements — 8 to 12 mm long and 7 to 9 across
    // — which the reference is too small to give and which `bodyShape: 'round'`
    // is the record's way of saying.
    expect(across / 1000).toBeGreaterThan(0.62);
    expect(across / 1000).toBeLessThan(0.82);
    expect(SPECIES.morphology.bodyShape).toBe('round');
  });

  it('reduces the hemelytron to a strip down the side', () => {
    const wing = boundsOfPart('forewing');
    const width = (wing?.maxX ?? 0) - (wing?.minX ?? 0);
    const height = (wing?.maxY ?? 0) - (wing?.minY ?? 0);

    // Long and narrow, because the scutellum has taken the middle of the
    // animal. On the green shield bug the same part is half the back.
    expect(height / width).toBeGreaterThan(1.6);
    expect(SPECIES.morphology.wingCover).toBe('hemelytra');
  });

  it('bands the rim of the abdomen that shows outside the wings', () => {
    const bands = parts('abdomen-segment');

    // The connexivum: banded black and red on the animal, and the only place
    // the abdomen itself is visible from above.
    expect(bands.length).toBeGreaterThanOrEqual(5);
    for (const band of bands) expect(band.clipTo).toBe('abdomen');
  });
});
