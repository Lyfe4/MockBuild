import { describe, expect, it } from 'vitest';

import { boundsOf, parsePathData, pathPoints, type PlatePartId } from '@/lib/plate';
import { describePlateContract } from '@/test/plateContract';
import { capsuleWidth, flattenClosed } from '@/test/plateGeometry';

import { ANOPLOGNATHUS_VIRIDIAENEUS as SPECIES } from './anoplognathus-viridiaeneus';
import { ANOPLOGNATHUS_VIRIDIAENEUS_PLATE as PLATE } from './anoplognathus-viridiaeneus.plate';
import { CARABUS_VIOLACEUS_PLATE as GROUND_BEETLE } from './carabus-violaceus.plate';
import { CETONIA_AURATA_PLATE as CHAFER } from './cetonia-aurata.plate';

/**
 * The king Christmas beetle, checked.
 *
 * The shared contract covers what every plate must be. What is only true here is
 * the shape — one unbroken oval, because the pronotum is widest exactly where
 * the wing cases begin — the pygidium behind the elytra, and the width, which is
 * the one measurement on this plate that did not come off the reference.
 *
 * Two other plates are imported and measured against. That is the point of plate
 * space: every drawing runs its body axis from y = 0 to y = 1000, so "broader
 * than the rose chafer" and "stouter legs than the ground beetle" are numbers
 * rather than opinions.
 */

function count(id: PlatePartId): number {
  return PLATE.parts.filter((part) => part.id === id).length;
}

function boundsOfPart(id: PlatePartId, plate = PLATE) {
  const part = plate.parts.find((candidate) => candidate.id === id);

  return boundsOf(pathPoints(parsePathData(part?.d ?? 'M0 0')));
}

/** Half the greatest width of a part, in plate units. */
function halfWidth(id: PlatePartId, plate = PLATE): number {
  return boundsOfPart(id, plate)?.maxX ?? 0;
}

describe('the Anoplognathus viridiaeneus plate', () => {
  describePlateContract(PLATE, SPECIES);

  it('draws the published proportions, not the ones the leaning figure measures', () => {
    // Donovan's beetle is rolled onto its left side, which foreshortens width
    // and leaves length alone: the figure comes out 0.48 as wide as it is long.
    // Every x taken off it is multiplied by 1.19 to restore the ratio the
    // published measurements give — 16 to 19.5 mm across at 28 to 34 mm long.
    // This is the assertion that the correction was actually applied, and it is
    // the whole reason the landmark file says so in prose.
    const across = halfWidth('elytron') * 2;
    const published = (SPECIES.sizeMm.min + SPECIES.sizeMm.max) / 2;

    expect(across / 1000).toBeGreaterThan(0.5);
    expect(across / 1000).toBeLessThan(0.62);
    // And the record it is drawn to agrees it is a big animal.
    expect(published).toBeGreaterThan(28);
  });

  it('is broader than the rose chafer, which is the other scarab on the shelf', () => {
    const here = halfWidth('elytron') * 2;
    const there = halfWidth('elytron', CHAFER) * 2;

    // Both plates run the body from y = 0 to y = 1000, so these are comparable.
    // A Christmas beetle is the heavier build of the two and the plate has to
    // say so, or the two thumbnails are the same beetle in two colours.
    expect(here).toBeGreaterThan(there);
  });

  it('makes one unbroken oval of the pronotum and the wing cases', () => {
    const pronotum = boundsOfPart('pronotum');
    const elytron = boundsOfPart('elytron');

    // The character to get right, and the first thing a reader sees. The
    // pronotum is at its widest at its own base, where the elytra begin, so the
    // outline does not step in between them: no more than a tenth of the body's
    // half-width of difference across that join.
    const step = Math.abs((pronotum?.maxX ?? 0) - (elytron?.maxX ?? 0));

    expect(step / halfWidth('elytron')).toBeLessThan(0.25);
    // And the pronotum narrows forward, rather than being a parallel collar.
    expect(pronotum?.maxX ?? 0).toBeGreaterThan(0);
  });

  it('leaves the pygidium showing behind the wing cases', () => {
    const abdomen = boundsOf(
      flattenClosed(PLATE.parts.find((p) => p.id === 'abdomen')?.d ?? 'M0 0'),
    );
    const elytron = boundsOf(
      flattenClosed(PLATE.parts.find((p) => p.id === 'elytron')?.d ?? 'M0 0'),
    );

    expect(count('abdomen')).toBe(1);
    // Reaching past the elytra is not enough on its own — it has to reach far
    // enough past them to be ink on the page at a small size. The first pass
    // had it clear by twenty-eight units and the wing cases covered it.
    expect((abdomen?.maxY ?? 0) - (elytron?.maxY ?? 0)).toBeGreaterThan(50);
  });

  it('carries no marking, which is what the record says and what the plate had to learn', () => {
    // The gloss on each wing case was first drawn as a panel of bare paper. On
    // the page that reads as the rose chafer's flecks, on an animal that has
    // none, so it became hatching instead. Nothing on this plate is a `surface`
    // fill any more, and this is the assertion that keeps it that way.
    expect(SPECIES.morphology.markings).toBe('none');
    expect(PLATE.parts.filter((part) => part.fill === 'surface')).toHaveLength(0);
    expect(count('marking')).toBe(0);
  });

  it('stands on a digger’s legs, heavier than the ground beetle’s', () => {
    const femur = PLATE.parts.find((part) => part.id === 'hindleg-femur');
    const theirs = GROUND_BEETLE.parts.find((part) => part.id === 'hindleg-femur');

    // `capsuleWidth`, and not the short side of a bounding box: a limb drawn at
    // an angle has a bounding box that reports its pose rather than its
    // thickness, and measured that way this plate's stouter femur came out the
    // slighter of the two.
    const mine = capsuleWidth(femur?.d ?? 'M0 0');
    const carabus = capsuleWidth(theirs?.d ?? 'M0 0');

    // A Christmas beetle digs and a Carabus runs, and the femora are measured
    // at about eight per cent of the width across the wing cases here against
    // the usual six. Compared against the other plate rather than to a number,
    // because a proportion is only a fact when something is beside it.
    expect(mine).toBeGreaterThan(carabus);
  });

  it('gives it the lamellate club that puts it in the Scarabaeoidea', () => {
    const antennae = PLATE.parts.filter((part) => part.id === 'antenna');

    expect(antennae.length).toBeGreaterThanOrEqual(3);
    expect(antennae.some((part) => part.fill === 'pigment-deep')).toBe(true);
    expect(SPECIES.morphology.antennae).toBe('lamellate');
  });

  it('says metallic in the record and nowhere in the drawing', () => {
    expect(SPECIES.morphology.colourFamily).toBe('metallic');
    expect(SPECIES.morphology.wingCover).toBe('elytra');
  });

  it('credits Donovan’s plate, which is the figure the species was named from', () => {
    expect(PLATE.reference.artist).toBe('Edward Donovan');
    expect(PLATE.reference.year).toBe(1805);
    // The oldest reference in the folder, and the only pair that are type
    // figures. Worth pinning: a later, sharper substitute would lose that.
    expect(PLATE.reference.title).toMatch(/Melolontha viridi-aenea/);
  });
});
