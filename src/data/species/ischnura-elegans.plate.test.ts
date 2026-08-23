import { describe, expect, it } from 'vitest';

import { boundsOf, parsePathData, pathPoints, type PlatePartId } from '@/lib/plate';
import { describePlateContract } from '@/test/plateContract';
import { flattenClosed, inside } from '@/test/plateGeometry';

import { AESHNA_CYANEA_PLATE } from './aeshna-cyanea.plate';
import { ISCHNURA_ELEGANS as SPECIES } from './ischnura-elegans';
import { ISCHNURA_ELEGANS_PLATE as PLATE } from './ischnura-elegans.plate';

/**
 * The blue-tailed damselfly, checked.
 *
 * The shared contract covers what every plate must be. What is only true here is
 * the *build*, and it is asserted against the southern hawker rather than in the
 * abstract: `bodyShape` says `slender` for both animals, which is true of both
 * and says nothing, and the whole reason this species is in the collection is
 * that the two drawings do not look remotely alike.
 *
 * Then the two markings the record turns on — the antehumeral stripes and the
 * blue eighth segment — because between them they are the identification.
 */

function parts(id: PlatePartId) {
  return PLATE.parts.filter((part) => part.id === id);
}

/** How wide a plate's abdomen is at its widest, in plate units. */
function abdomenWidth(plate: typeof PLATE): number {
  const abdomen = plate.parts.find((part) => part.id === 'abdomen');
  const bounds = boundsOf(pathPoints(parsePathData(abdomen?.d ?? 'M0 0')));

  return (bounds?.maxX ?? 0) * 2;
}

describe('the Ischnura elegans plate', () => {
  describePlateContract(PLATE, SPECIES);

  it('draws an abdomen that is a needle', () => {
    // Under forty units across a body a thousand long. This is the one number
    // that says damselfly rather than dragonfly, and it is what a plate drawn
    // from a hawker's proportions would lose.
    expect(abdomenWidth(PLATE)).toBeLessThan(50);
  });

  it('is half the hawker across, on the same axis', () => {
    // The comparison is the point. Both plates run the body from y = 0 to
    // y = 1000, so their widths are directly comparable, and both records say
    // `slender` — which is where the record stops being able to help.
    //
    // Half rather than the third the animals actually differ by: the hawker's
    // plate draws its abdomen a little narrow, and the fix for that is to
    // redraw the hawker rather than to draw this one wrong.
    expect(abdomenWidth(PLATE) * 1.8).toBeLessThan(abdomenWidth(AESHNA_CYANEA_PLATE));
    expect(SPECIES.morphology.bodyShape).toBe('slender');
  });

  it('stripes the thorax head to tail, which is what the record means', () => {
    const stripes = PLATE.parts.filter((part) => part.id === 'marking' && part.clipTo === 'thorax');

    expect(SPECIES.morphology.markings).toBe('stripes');
    expect(stripes.length).toBeGreaterThanOrEqual(2);

    for (const stripe of stripes) {
      const bounds = boundsOf(flattenClosed(stripe.d));
      const width = (bounds?.maxX ?? 0) - (bounds?.minX ?? 0);
      const height = (bounds?.maxY ?? 0) - (bounds?.minY ?? 0);

      // Head to tail, not across: three times as long as it is wide, at least.
      // A stripe drawn the other way is a band, and the hawker is the one with
      // those.
      expect(height / width, stripe.fill).toBeGreaterThan(3);
      // Mirrored, so there are two of each and they are symmetric.
      expect(stripe.mirror).not.toBe(false);
    }
  });

  it('keeps the stripes on the thorax', () => {
    const outline = flattenClosed(parts('thorax')[0]?.d ?? 'M0 0');

    for (const stripe of PLATE.parts.filter((part) => part.clipTo === 'thorax')) {
      const off = flattenClosed(stripe.d).filter((point) => !inside(outline, point));

      expect(off, stripe.fill).toHaveLength(0);
    }
  });

  it('lights the eighth segment and no other', () => {
    const light = PLATE.parts.filter((part) => part.id === 'marking' && part.clipTo === 'abdomen');
    const bounds = boundsOf(flattenClosed(light[0]?.d ?? 'M0 0'));
    const rings = parts('abdomen-segment');

    expect(light).toHaveLength(1);
    expect(light[0]?.fill).toBe('surface');
    expect(light[0]?.mirror).toBe(false);

    // Segment eight of ten, so it sits in the last quarter of the abdomen and
    // is short: a mark half the abdomen long would be a different animal, and
    // one at the very tip would be a different one again.
    const centre = ((bounds?.minY ?? 0) + (bounds?.maxY ?? 0)) / 2;

    expect(centre).toBeGreaterThan(780);
    expect(centre).toBeLessThan(940);
    expect((bounds?.maxY ?? 0) - (bounds?.minY ?? 0)).toBeLessThan(120);
    // And the rings are there for it to sit between.
    expect(rings.length).toBeGreaterThanOrEqual(6);
  });

  it("sets the eyes apart, where a hawker's meet on top of its head", () => {
    const eyes = parts('compound-eye');
    const bounds = boundsOf(flattenClosed(eyes[0]?.d ?? 'M0 0'));

    // The character that separates the two suborders at a glance. Authored on
    // the right half, so "apart" means the inner edge does not reach the axis.
    expect(eyes).toHaveLength(1);
    expect(bounds?.minX ?? 0).toBeGreaterThan(8);
  });

  it('draws four narrow wings, all of them windows', () => {
    const wings = [...parts('forewing'), ...parts('hindwing')];

    expect(wings).toHaveLength(2);

    for (const wing of wings) {
      const bounds = boundsOf(flattenClosed(wing.d));
      const length = (bounds?.maxX ?? 0) - (bounds?.minX ?? 0);
      const depth = (bounds?.maxY ?? 0) - (bounds?.minY ?? 0);

      // `membrane`, because four of these overlap each other and the abdomen and
      // what is behind them is the point.
      expect(wing.opacity, wing.id).toBe('membrane');
      // And narrow: a damselfly's wing is a lens on a stalk, not the hawker's
      // triangle. Measured on the bounding box, which for a wing swept up and
      // out overstates the depth, so the threshold is generous.
      expect(length / depth, wing.id).toBeGreaterThan(1.8);
    }
  });

  it('gives each wing its one opaque cell', () => {
    const stigmas = PLATE.parts.filter((part) => part.id === 'wing-marking');

    // The pterostigma: the only mark on an otherwise clear wing, and worth
    // drawing for exactly that reason.
    expect(stigmas).toHaveLength(2);
    expect(stigmas.map((part) => part.clipTo).sort()).toStrictEqual(['forewing', 'hindwing']);
  });

  it('draws the claspers, which is why this plate commits to a sex', () => {
    expect(parts('cercus')).toHaveLength(1);
    expect(PLATE.sex).toBe('male');
  });
});
