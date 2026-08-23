import { describe, expect, it } from 'vitest';

import { boundsOf, parsePathData, pathPoints, type PlatePartId } from '@/lib/plate';
import { describePlateContract } from '@/test/plateContract';
import { capsuleAxis, capsuleWidth } from '@/test/plateGeometry';

import { CARABUS_VIOLACEUS_PLATE } from './carabus-violaceus.plate';
import { CHRYSOLINA_COERULANS as SPECIES } from './chrysolina-coerulans';
import { CHRYSOLINA_COERULANS_PLATE as PLATE } from './chrysolina-coerulans.plate';

/**
 * The blue mint beetle, checked.
 *
 * The shared contract covers what every plate must be. What is only true here is
 * the *outline* — this is the broadest animal in the collection and being broad
 * is the identification — and the short legs that go with it. Both are asserted
 * against the violet ground beetle rather than in the abstract, because "broad"
 * only means something beside something narrower and the two plates were drawn
 * from the same book by the same hand.
 */

function parts(id: PlatePartId) {
  return PLATE.parts.filter((part) => part.id === id);
}

/** How wide a plate's wing cases are, as a fraction of the body axis. */
function elytralRatio(plate: typeof PLATE): number {
  const elytron = plate.parts.find((part) => part.id === 'elytron');
  const bounds = boundsOf(pathPoints(parsePathData(elytron?.d ?? 'M0 0')));

  return ((bounds?.maxX ?? 0) * 2) / 1000;
}

/** The length of a limb segment, measured off the drawing. */
function lengthOf(id: PlatePartId): number {
  const axis = capsuleAxis(parts(id)[0]?.d ?? 'M0 0');

  if (axis === undefined) return 0;

  return Math.hypot(axis.to.x - axis.from.x, axis.to.y - axis.from.y);
}

describe('the Chrysolina coerulans plate', () => {
  describePlateContract(PLATE, SPECIES);

  it('draws the broadest beetle in the collection', () => {
    // 0.65 off the lithograph — 108 pixels across a body 167 long. Asserted as
    // a band rather than a number, because the margin was measured by eye and
    // will be adjusted; asserted at all, because this is the character.
    expect(elytralRatio(PLATE)).toBeGreaterThan(0.58);
    expect(elytralRatio(PLATE)).toBeLessThan(0.72);
  });

  it('is half again as broad as the ground beetle two accessions earlier', () => {
    // The comparison is the point. Both were traced from Hochdanz's plates for
    // Calwer's Käferbuch and both are `bodyShape: 'oval'` on the record, which
    // is true of both and says nothing; the drawings are what carry the
    // difference, and a plate that lost it would key out as the wrong family.
    expect(elytralRatio(PLATE) / elytralRatio(CARABUS_VIOLACEUS_PLATE)).toBeGreaterThan(1.4);
  });

  it('keeps the legs short, as a beetle that lives on one plant has them', () => {
    const leg = lengthOf('hindleg-femur') + lengthOf('hindleg-tibia');

    // The whole hind leg, femur and tibia, is about a third of the body axis.
    // A Carabus runs prey down on the ground and its hind leg is more than half;
    // drawn at those proportions this animal becomes a different family.
    expect(leg / 1000).toBeLessThan(0.45);
    expect(leg / 1000).toBeGreaterThan(0.2);
  });

  it('thickens the antenna towards the tip rather than tapering it', () => {
    const widths = parts('antenna').map((part) => capsuleWidth(part.d));
    const first = widths[0] ?? 0;
    const widest = Math.max(...widths);

    // As far towards a club as `filiform` goes: the outer joints are as thick as
    // the scape or thicker, where the ground beetle's taper all the way. One
    // more step and the record would have to say `clavate`.
    expect(parts('antenna').length).toBeGreaterThanOrEqual(6);
    expect(SPECIES.morphology.antennae).toBe('filiform');
    expect(widest).toBeGreaterThan(first * 0.7);
  });

  it('tucks the head under the pronotum, which is a Chrysomelidae character', () => {
    const head = boundsOf(pathPoints(parsePathData(parts('head')[0]?.d ?? 'M0 0')));
    const pronotum = boundsOf(pathPoints(parsePathData(parts('pronotum')[0]?.d ?? 'M0 0')));

    // The pronotum's front margin is above the back of the head, so the two
    // overlap: a leaf beetle's head is retracted, and drawn clear of the
    // pronotum it would be a longhorn.
    expect(pronotum?.minY ?? 0).toBeLessThan(head?.maxY ?? 0);
    // And the pronotum is much the wider of the two.
    expect(pronotum?.maxX ?? 0).toBeGreaterThan((head?.maxX ?? 0) * 1.8);
  });

  it('rows the punctures rather than scattering them', () => {
    const rows = parts('stria');

    // A Chrysolina's punctures fall into rough longitudinal rows, which is what
    // separates it from the evenly granulate ground beetle. Six of them.
    expect(rows.length).toBeGreaterThanOrEqual(5);
    for (const row of rows) expect(row.clipTo).toBe('elytron');
  });

  it('says metallic in the record and nowhere in the drawing', () => {
    // The animal is structurally blue-green and the plate is inked in one
    // seasonal earth. The word is where the fact lives.
    expect(SPECIES.morphology.colourFamily).toBe('metallic');
    expect(SPECIES.morphology.wingCover).toBe('elytra');
  });
});
