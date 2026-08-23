import { describe, expect, it } from 'vitest';

import {
  boundsOf,
  parsePathData,
  pathPoints,
  PLATE_ORDERS,
  REQUIRED_PARTS,
  type PlatePartId,
} from '@/lib/plate';
import { describePlateContract } from '@/test/plateContract';
import { capsuleWidth, flattenClosed, inside } from '@/test/plateGeometry';

import { CARABUS_VIOLACEUS_PLATE } from './carabus-violaceus.plate';
import { GRYLLUS_CAMPESTRIS as SPECIES } from './gryllus-campestris';
import { GRYLLUS_CAMPESTRIS_PLATE as PLATE } from './gryllus-campestris.plate';

/**
 * The field cricket, checked.
 *
 * The archive's first Orthoptera, so this file has two jobs. The usual one —
 * what is true of this animal and no other — and one that will not need doing
 * again: proving that the order the plate schema gained is wired up, that its
 * required parts are the right ones, and that the `tegmina` wing covering the
 * record vocabulary gained means something.
 */

function parts(id: PlatePartId) {
  return PLATE.parts.filter((part) => part.id === id);
}

function boundsOfPart(id: PlatePartId) {
  return boundsOf(pathPoints(parsePathData(parts(id)[0]?.d ?? 'M0 0')));
}

describe('the Gryllus campestris plate', () => {
  describePlateContract(PLATE, SPECIES);

  it('is drawn against an order the schema now knows about', () => {
    expect(PLATE_ORDERS).toContain('orthoptera');
    expect(PLATE.order).toBe('orthoptera');

    // And everything the order asks for is here, which is the check that would
    // have caught a required-parts list written for the wrong animal.
    for (const id of REQUIRED_PARTS.orthoptera) {
      expect(parts(id), id).not.toHaveLength(0);
    }
  });

  it('answers tegmina, which is a state the collection had to invent', () => {
    // Leathery rather than hard, and overlapping rather than meeting at a seam.
    // `elytra` and `membranous` were both wrong and the union grew rather than
    // the record being made to answer approximately.
    expect(SPECIES.morphology.wingCover).toBe('tegmina');
  });

  it('draws no hindwings, because a field cricket cannot fly', () => {
    // Vestigial and folded away underneath, where nothing can see them, which
    // is why `REQUIRED_PARTS.orthoptera` does not ask. Drawing them would be
    // drawing something the animal does not show.
    expect(parts('hindwing')).toHaveLength(0);
    expect(parts('forewing')).toHaveLength(1);
  });

  it('gives it the pair of cerci the order is asked for', () => {
    const cerci = parts('cercus');
    const tip = boundsOfPart('abdomen');
    const reach = Math.max(...cerci.flatMap((part) => flattenClosed(part.d).map((p) => p.y)));

    // Two joints, mirrored into a pair, reaching well past the abdomen. `cercus`
    // had been sitting in `PLATE_PART_IDS` unused since the schema was written,
    // with a comment saying it was for a cricket's tails.
    expect(cerci.length).toBeGreaterThanOrEqual(2);
    for (const cercus of cerci) expect(cercus.mirror).not.toBe(false);
    expect(reach).toBeGreaterThan((tip?.maxY ?? 0) + 150);
  });

  it('gives it a leg it can jump with', () => {
    const hind = capsuleWidth(parts('hindleg-femur')[0]?.d ?? 'M0 0');
    const fore = capsuleWidth(parts('foreleg-femur')[0]?.d ?? 'M0 0');

    // The saltatorial femur is the order at a glance: nearly three times the
    // depth of the fore femur on the same animal. Drawn at the ground beetle's
    // proportions this cricket cannot jump.
    expect(hind / fore).toBeGreaterThan(2.2);
    expect(hind).toBeGreaterThan(capsuleWidth(CARABUS_VIOLACEUS_PLATE.parts[0]?.d ?? 'M0 0') * 2);
  });

  it('veins the tegmen both ways, because a leathery wing shows it', () => {
    const veins = parts('wing-vein');

    // Five lengthwise and four across. A membranous wing gets suggested
    // venation; a tegmen's is coarse enough to draw stroke for stroke.
    expect(veins.length).toBeGreaterThanOrEqual(8);
    for (const vein of veins) expect(vein.clipTo).toBe('forewing');
  });

  it('marks the mirror on the tegmen, which is what a male sings with', () => {
    const marks = PLATE.parts.filter((part) => part.id === 'marking' && part.clipTo === 'forewing');
    const outline = flattenClosed(parts('forewing')[0]?.d ?? 'M0 0');

    // The oval cell in the stridulatory field, and the pale patch at the wing
    // base. Both on the tegmen, and both wholly on it.
    expect(marks).toHaveLength(2);
    expect(PLATE.sex).toBe('male');

    for (const mark of marks) {
      const off = flattenClosed(mark.d).filter((point) => !inside(outline, point));

      expect(off, mark.fill).toHaveLength(0);
    }
  });

  it('gives it a cricket head rather than a grasshopper one', () => {
    const head = boundsOfPart('head');
    const pronotum = boundsOfPart('pronotum');

    // Large, rounded and as wide as the pronotum. A grasshopper's is drawn out
    // and slanted and much narrower than its thorax, and that is the difference
    // between the two suborders at thumbnail size.
    expect(head?.maxX ?? 0).toBeGreaterThan((pronotum?.maxX ?? 0) * 0.8);
    expect(parts('ocellus').length).toBeGreaterThanOrEqual(2);
  });

  it('sweeps the antennae further than the animal is long', () => {
    const antennae = parts('antenna');
    const reach = Math.max(
      ...antennae.flatMap((part) => flattenClosed(part.d).map((point) => Math.abs(point.y))),
    );

    // Filiform and very long, which is a cricket. Three open strokes rather
    // than a chain of joints: the segments are far too fine to draw and what
    // has to read is the sweep.
    expect(antennae.length).toBeGreaterThanOrEqual(3);
    expect(reach).toBeGreaterThan(300);
    expect(SPECIES.morphology.antennae).toBe('filiform');
  });
});
