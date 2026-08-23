import { describe, expect, it } from 'vitest';

import {
  boundsOf,
  MEMBRANOUS_PART_IDS,
  parsePathData,
  pathPoints,
  REQUIRED_PARTS,
  type PlatePartId,
} from '@/lib/plate';
import { describePlateContract } from '@/test/plateContract';
import { allPoints } from '@/test/plateGeometry';

import { AESHNA_CYANEA as SPECIES } from './aeshna-cyanea';
import { AESHNA_CYANEA_PLATE as PLATE } from './aeshna-cyanea.plate';

/**
 * The southern hawker, checked.
 *
 * The shared contract covers what every plate must be. What is only true here
 * is that the wings are **windows** — this is the plate the `opacity` field was
 * added for — that the eyes meet on top of the head, and that the abdomen is
 * most of the animal.
 */

function count(id: PlatePartId): number {
  return PLATE.parts.filter((part) => part.id === id).length;
}

function boundsOfPart(id: PlatePartId) {
  const part = PLATE.parts.find((candidate) => candidate.id === id);

  return boundsOf(pathPoints(parsePathData(part?.d ?? 'M0 0')));
}

describe('the Aeshna cyanea plate', () => {
  describePlateContract(PLATE, SPECIES);

  it('makes both wings membranes, which is the whole reason the field exists', () => {
    const membranes = PLATE.parts.filter((part) => part.opacity === 'membrane');

    expect(membranes.map((part) => part.id).sort()).toStrictEqual(['forewing', 'hindwing']);

    for (const part of membranes) {
      expect(MEMBRANOUS_PART_IDS, part.id).toContain(part.id);
    }
  });

  it('leaves everything that is not a wing solid', () => {
    for (const part of PLATE.parts) {
      if (part.id === 'forewing' || part.id === 'hindwing') continue;

      expect(part.opacity, part.id).toBeUndefined();
    }
  });

  it('draws the compound eyes rather than a generic eye', () => {
    // On an aeshnid the eyes wrap most of the head and meet along the top of
    // it, which is the identification at a glance and the reason the schema has
    // the id at all.
    expect(count('compound-eye')).toBe(1);
    expect(count('eye')).toBe(0);
    expect(REQUIRED_PARTS.odonata).toContain('compound-eye');

    const eye = boundsOfPart('compound-eye');
    const head = boundsOfPart('head');

    // The authored (right) eye starts close to the axis and reaches most of the
    // way to the edge of the head.
    expect(eye?.minX ?? 99).toBeLessThan(20);
    expect(eye?.maxX ?? 0).toBeGreaterThan((head?.maxX ?? 0) * 0.7);
  });

  it('gives the vertex its three ocelli', () => {
    // One on the axis and a pair either side of it.
    const onAxis = PLATE.parts.filter((part) => part.id === 'ocellus' && part.mirror === false);
    const paired = PLATE.parts.filter((part) => part.id === 'ocellus' && part.mirror !== false);

    expect(onAxis).toHaveLength(1);
    expect(paired).toHaveLength(1);
  });

  it('makes the abdomen most of the animal, and segments it', () => {
    const abdomen = boundsOfPart('abdomen');
    const length = (abdomen?.maxY ?? 0) - (abdomen?.minY ?? 0);

    // Two-thirds of the body axis, which is what a hawker looks like. Drawn
    // shorter it is a darter.
    expect(length).toBeGreaterThan(600);
    // Ten segments in life; the rings between them are what shows from above.
    expect(count('abdomen-segment')).toBeGreaterThanOrEqual(8);
  });

  it('draws six legs, thrust forward under the head', () => {
    for (const pair of ['foreleg', 'midleg', 'hindleg'] as const) {
      expect(count(`${pair}-femur`), pair).toBe(1);
      // The shaft plus its two spines.
      expect(count(`${pair}-tibia`), pair).toBe(3);
      expect(count(`${pair}-tarsus`), pair).toBeGreaterThanOrEqual(3);
    }

    const foreleg = boundsOfPart('foreleg-femur');

    // The fore leg reaches up past the front of the head, which is how the
    // reference draws it and how the animal holds it.
    expect(foreleg?.minY ?? 999).toBeLessThan(150);
  });

  it('gives it the claspers at the tip, and no sting', () => {
    expect(count('cercus')).toBe(1);
    expect(count('stinger')).toBe(0);
  });

  it('nets both wings, and clips every vein to the wing it is drawn on', () => {
    const veins = PLATE.parts.filter((part) => part.id === 'wing-vein');

    // Enough to read as a net and few enough to read as an engraving. Lucas
    // draws several hundred cells a wing; this draws twenty-one strokes.
    expect(veins.length).toBeGreaterThanOrEqual(14);
    expect(veins.length).toBeLessThanOrEqual(30);

    for (const vein of veins) {
      expect(['forewing', 'hindwing']).toContain(vein.clipTo);
    }
  });

  it('marks a pterostigma on each wing', () => {
    const stigmata = PLATE.parts.filter((part) => part.id === 'wing-marking');

    expect(stigmata).toHaveLength(2);
    expect(new Set(stigmata.map((part) => part.clipTo))).toEqual(new Set(['forewing', 'hindwing']));
  });

  it('spans wider than the body is long, because the wings are held out', () => {
    const points = allPoints(PLATE);
    const half = points.reduce((most, point) => Math.max(most, Math.abs(point.x)), 0);

    expect(half).toBeGreaterThan(600);
  });

  it('agrees with the record about clear wings and bristle antennae', () => {
    expect(SPECIES.morphology.wingCover).toBe('membranous');
    expect(SPECIES.morphology.antennae).toBe('setaceous');
    // Two bristles, which is why the order's required parts do not ask for them
    // and why they are detail rank here.
    expect(REQUIRED_PARTS.odonata).not.toContain('antenna');
    expect(PLATE.parts.find((part) => part.id === 'antenna')?.rank).toBe('detail');
  });
});
