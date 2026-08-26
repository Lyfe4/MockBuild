import { describe, expect, it } from 'vitest';

import { boundsOf, parsePathData, pathPoints, type PlatePartId } from '@/lib/plate';
import { describePlateContract } from '@/test/plateContract';
import { capsuleWidth, flattenClosed, inside } from '@/test/plateGeometry';

import { ANOPLOGNATHUS_VIRIDIAENEUS_PLATE as CHRISTMAS_BEETLE } from './anoplognathus-viridiaeneus.plate';
import { EUPOECILA_AUSTRALASIAE as SPECIES } from './eupoecila-australasiae';
import { EUPOECILA_AUSTRALASIAE_PLATE as PLATE } from './eupoecila-australasiae.plate';

/**
 * The fiddler beetle, checked.
 *
 * The shared contract covers what every plate must be. What is only true here is
 * the fiddle — its shape, its waist, and above all which way round it is drawn.
 * This is the one plate in the collection whose ground is the *pale* fill and
 * whose pattern is the dark one, and getting that backwards produces a drawing
 * that satisfies every other test and looks like a different insect. So it is
 * asserted directly.
 */

function count(id: PlatePartId): number {
  return PLATE.parts.filter((part) => part.id === id).length;
}

function partsWith(id: PlatePartId) {
  return PLATE.parts.filter((part) => part.id === id);
}

function boundsOfPart(id: PlatePartId, plate = PLATE) {
  const part = plate.parts.find((candidate) => candidate.id === id);

  return boundsOf(pathPoints(parsePathData(part?.d ?? 'M0 0')));
}

/** The dark figure on one wing case — the fiddle itself. */
const FIDDLE = partsWith('marking').find(
  (part) => part.clipTo === 'elytron' && part.fill === 'pigment-deep',
);

describe('the Eupoecila australasiae plate', () => {
  describePlateContract(PLATE, SPECIES);

  it('draws a pale wing case with a dark figure on it, and not the other way round', () => {
    // The identification, and the one mistake this plate can make that nothing
    // else would catch. A fiddler beetle is a yellow-green insect with a black
    // pattern; drawn as a black insect with yellow marks it keys out on the same
    // six characters and reads as another animal entirely.
    const elytron = PLATE.parts.find((part) => part.id === 'elytron');

    expect(elytron?.fill).toBe('pigment');
    expect(FIDDLE?.fill).toBe('pigment-deep');
    expect(SPECIES.morphology.colourFamily).toBe('yellow');
  });

  it('waists the fiddle, which is the whole reason for the name', () => {
    const points = flattenClosed(FIDDLE?.d ?? 'M0 0');
    const bounds = boundsOf(points);
    const top = bounds?.minY ?? 0;
    const bottom = bounds?.maxY ?? 0;

    /** How far the dark field reaches from the midline at one height. */
    const reachAt = (y: number): number => {
      const band = points.filter((point) => Math.abs(point.y - y) < (bottom - top) / 14);

      return band.length === 0 ? 0 : Math.max(...band.map((point) => point.x));
    };

    const span = bottom - top;
    const upperBout = reachAt(top + span * 0.2);
    const waist = reachAt(top + span * 0.42);
    const lowerBout = reachAt(top + span * 0.62);

    // A violin: wide, narrow, wide. Without the middle term this is a stripe,
    // and a stripe down a chafer's back is a dozen other beetles.
    expect(waist).toBeLessThan(upperBout);
    expect(waist).toBeLessThan(lowerBout);
    expect(upperBout).toBeGreaterThan(0);
  });

  it('keeps the fiddle on the wing case, whole rather than mostly', () => {
    // The shared contract samples clipped strokes and allows a tenth outside.
    // A filled marking gets the sharper question: its entire outline is on the
    // surface it claims to be on, because the clip is a safety net and not the
    // drawing.
    const outline = flattenClosed(PLATE.parts.find((part) => part.id === 'elytron')?.d ?? 'M0 0');
    const off = flattenClosed(FIDDLE?.d ?? 'M0 0').filter((point) => !inside(outline, point));

    expect(off).toHaveLength(0);
  });

  it('carries the rust band as a line, because a plate has two pigments and not three', () => {
    // Donovan's figure has a black field, a rust band and a pale margin. The
    // third colour is drawn as the boundary of the second, which is also what
    // an engraver working in one ink did with it — and it is what survives at
    // eighty pixels, where the fills have flattened into each other.
    const boundary = partsWith('marking').find(
      (part) => part.fill === 'none' && part.rank === 'structure',
    );

    expect(boundary).toBeDefined();
    expect(boundary?.clipTo).toBe('elytron');
  });

  it('edges the black pronotum with the same pale fill as the wing cases', () => {
    // Donovan's specific description opens with these — "margin of the thorax,
    // and two small lines yellow" — before it reaches the wing cases at all.
    const bands = partsWith('marking').filter((part) => part.clipTo === 'pronotum');

    expect(bands).toHaveLength(1);
    // `pigment` and not `surface`: the yellow along this shield is the same
    // yellow as the wing cases, so it wants the fill they have. Bare paper made
    // two hard white patches that read as a second pair of eyes.
    expect(bands[0]?.fill).toBe('pigment');
    expect(PLATE.parts.find((part) => part.id === 'pronotum')?.fill).toBe('pigment-deep');
  });

  it('marks the record as striped rather than banded', () => {
    // The two answers a key offers next to each other. The fiddle runs the
    // length of the animal, so `stripes`; `bands` would put this beetle in with
    // the hornet on the character that separates them.
    expect(SPECIES.morphology.markings).toBe('stripes');
  });

  it('is a slighter animal than the Christmas beetle, on slighter legs', () => {
    const mine = PLATE.parts.find((part) => part.id === 'hindleg-femur');
    const theirs = CHRISTMAS_BEETLE.parts.find((part) => part.id === 'hindleg-femur');

    // Both plates run the body from y = 0 to y = 1000 and both animals are
    // scarabs, so this is the comparison the two drawings exist to support: one
    // digs, one visits flowers, and the femora say which is which. Measured
    // across the capsule rather than off a bounding box, which for a limb drawn
    // at an angle reports the pose instead of the thickness.
    expect(capsuleWidth(mine?.d ?? 'M0 0')).toBeLessThan(capsuleWidth(theirs?.d ?? 'M0 0'));
    expect(SPECIES.sizeMm.max).toBeLessThan(28);
  });

  it('draws no pygidium, because the reference shows none', () => {
    // The Christmas beetle's shows and is drawn. This figure rounds the wing
    // cases off over it, `REQUIRED_PARTS` does not ask a beetle for an abdomen,
    // and inventing one from what the family usually does would be drawing
    // something nobody measured.
    expect(count('abdomen')).toBe(0);
  });

  it('draws two wing cases as one, and the suture once', () => {
    expect(count('elytron')).toBe(1);
    expect(PLATE.parts.find((part) => part.id === 'elytron')?.mirror).not.toBe(false);
    expect(count('seam')).toBe(1);
    expect(PLATE.parts.find((part) => part.id === 'seam')?.mirror).toBe(false);
  });

  it('was traced from the same sheet as the Christmas beetle', () => {
    // Two Australian animals, one hand, one year — the same reason three of the
    // European plates come from Hochdanz. Pinned so a later substitution has to
    // be a decision rather than an accident.
    expect(PLATE.reference.artist).toBe(CHRISTMAS_BEETLE.reference.artist);
    expect(PLATE.reference.year).toBe(CHRISTMAS_BEETLE.reference.year);
    expect(PLATE.reference.source).toBe(CHRISTMAS_BEETLE.reference.source);
    expect(PLATE.reference.title).toMatch(/Cetonia australasiae/);
  });

  it('draws an oval about half as wide as it is long', () => {
    const across = (boundsOfPart('elytron')?.maxX ?? 0) * 2;

    expect(across / 1000).toBeGreaterThan(0.44);
    expect(across / 1000).toBeLessThan(0.62);
  });
});
