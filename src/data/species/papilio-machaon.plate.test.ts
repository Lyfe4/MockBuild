import { describe, expect, it } from 'vitest';

import { boundsOf, parsePathData, pathPoints, REQUIRED_PARTS, type PlatePartId } from '@/lib/plate';
import { describePlateContract } from '@/test/plateContract';
import { allPoints } from '@/test/plateGeometry';

import { PAPILIO_MACHAON as SPECIES } from './papilio-machaon';
import { PAPILIO_MACHAON_PLATE as PLATE } from './papilio-machaon.plate';

/**
 * The swallowtail, checked.
 *
 * The shared contract covers what every plate must be. What is only true here
 * is the wing geometry — a forewing whose apex is thrown forward, a hindwing
 * with a tail — and the deliberate *absence* of legs, which is the sort of gap
 * that looks like an oversight and needs a test saying it is not.
 */

function count(id: PlatePartId): number {
  return PLATE.parts.filter((part) => part.id === id).length;
}

function boundsOfPart(id: PlatePartId) {
  const part = PLATE.parts.find((candidate) => candidate.id === id);

  return boundsOf(pathPoints(parsePathData(part?.d ?? 'M0 0')));
}

describe('the Papilio machaon plate', () => {
  describePlateContract(PLATE, SPECIES);

  it('gives it four wings, authored as two and reflected', () => {
    expect(count('forewing')).toBe(1);
    expect(count('hindwing')).toBe(1);

    for (const wing of ['forewing', 'hindwing'] as const) {
      expect(PLATE.parts.find((part) => part.id === wing)?.mirror, wing).not.toBe(false);
    }
  });

  it('draws no legs, because a spread-wing butterfly shows none from above', () => {
    // Deliberate, not forgotten: `REQUIRED_PARTS.lepidoptera` does not ask for
    // them, and drawing legs the reference does not contain would be inventing
    // the animal rather than tracing it.
    const legs = PLATE.parts.filter((part) => /^(fore|mid|hind)leg-/.test(part.id));

    expect(legs).toHaveLength(0);
    expect(REQUIRED_PARTS.lepidoptera.some((id) => id.includes('leg'))).toBe(false);
  });

  it('throws the forewing apex forward of the wing base, as a swallowtail does', () => {
    const forewing = boundsOfPart('forewing');

    // The apex is the topmost point of the wing and it is well outboard: a
    // rounded wing whose widest point is level with the body is a different
    // family entirely.
    expect(forewing?.minY ?? 0).toBeLessThan(-200);
    expect(forewing?.maxX ?? 0).toBeGreaterThan(1200);
  });

  it('draws the tail, which is what the family is named for', () => {
    const hindwing = boundsOfPart('hindwing');
    const abdomen = boundsOfPart('abdomen');

    // The tail hangs below the tip of the abdomen. Without it the outline is a
    // fritillary.
    expect(hindwing?.maxY ?? 0).toBeGreaterThan(abdomen?.maxY ?? 0);
  });

  it('spans far wider than it is long, because the wings are the animal', () => {
    const points = allPoints(PLATE);
    const half = points.reduce((most, point) => Math.max(most, Math.abs(point.x)), 0);

    // Body 1000 units head to abdomen tip; the wings reach past 1400 either
    // way. A butterfly framed like a beetle is a butterfly with clipped wings.
    expect(half).toBeGreaterThan(1200);
  });

  it('veins both wings, and clips every vein to the wing it is drawn on', () => {
    const veins = PLATE.parts.filter((part) => part.id === 'wing-vein');

    expect(veins.length).toBeGreaterThanOrEqual(8);

    for (const vein of veins) {
      expect(['forewing', 'hindwing'], vein.d.slice(0, 12)).toContain(vein.clipTo);
    }
  });

  it('carries the pattern a key would ask for: a border, lunules and one ocellus', () => {
    const markings = PLATE.parts.filter((part) => part.id === 'wing-marking');
    const pale = markings.filter((part) => part.fill === 'surface');
    const dark = markings.filter((part) => part.fill === 'pigment-deep');
    const colour = markings.filter((part) => part.fill === 'pigment');

    expect(dark.length).toBeGreaterThanOrEqual(2);
    expect(pale.length).toBeGreaterThanOrEqual(4);
    // The blue lunules and the one orange eyespot.
    expect(colour.length).toBeGreaterThanOrEqual(5);
  });

  it('paints nothing as a membrane, because a scaled wing is not a window', () => {
    expect(PLATE.parts.every((part) => part.opacity === undefined)).toBe(true);
    expect(SPECIES.morphology.wingCover).toBe('scaled');
  });

  it('agrees with the record about bands and clubbed antennae', () => {
    expect(SPECIES.morphology.markings).toBe('bands');
    expect(SPECIES.morphology.antennae).toBe('clavate');
    // A club at the end of the antenna is what separates a butterfly from a
    // moth, so it is a filled part rather than the end of a tapering line.
    expect(count('antenna')).toBeGreaterThanOrEqual(3);
    expect(PLATE.parts.some((part) => part.id === 'antenna' && part.fill === 'pigment-deep')).toBe(
      true,
    );
  });
});
