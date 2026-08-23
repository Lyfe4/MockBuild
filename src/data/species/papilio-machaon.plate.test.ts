import { describe, expect, it } from 'vitest';

import {
  boundsOf,
  parsePathData,
  pathPoints,
  PLATE_BODY_LENGTH,
  REQUIRED_PARTS,
  type PlatePartId,
} from '@/lib/plate';
import { describePlateContract } from '@/test/plateContract';
import { allPoints, flattenClosed, type Point } from '@/test/plateGeometry';

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

/** The hindwing measured on the curve, so the tail tip is where the ink is. */
function hindwingBounds() {
  return boundsOf(flattenClosed(PLATE.parts.find((part) => part.id === 'hindwing')?.d ?? 'M0 0'));
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

  it('runs the tail out to the length the reference gives it', () => {
    // Measured off `references/papilio-machaon.jpg`: the tail tip sits 185 px
    // below the abdomen tip on a body 340 px long, so 0.54 of a body length.
    // The first pass reached 0.47 and the tail read as a torn corner rather
    // than as the thing the family is named for. A range, not a number — the
    // coordinates are traced by hand and will be adjusted.
    const hindwing = boundsOfPart('hindwing');
    const abdomen = boundsOfPart('abdomen');
    const drop = ((hindwing?.maxY ?? 0) - (abdomen?.maxY ?? 0)) / PLATE_BODY_LENGTH;

    expect(drop).toBeGreaterThan(0.5);
    expect(drop).toBeLessThan(0.62);
  });

  it('draws the tail narrow, and inks it', () => {
    // A tail as wide as it is long is a lobe. The reference gives roughly three
    // to one, and the ink runs to the tip rather than stopping at the margin.
    const outline = flattenClosed(PLATE.parts.find((part) => part.id === 'hindwing')?.d ?? 'M0 0');
    const abdomen = boundsOfPart('abdomen');
    const below = outline.filter((point) => point.y > (abdomen?.maxY ?? 0) + 330);
    const widest = Math.max(...below.map((p) => p.x)) - Math.min(...below.map((p) => p.x));

    expect(below.length).toBeGreaterThan(0);
    expect(widest).toBeLessThan(70);

    const inked = PLATE.parts.filter(
      (part) =>
        part.id === 'wing-marking' && part.clipTo === 'hindwing' && part.fill === 'pigment-deep',
    );
    const reach = Math.max(...inked.flatMap((part) => flattenClosed(part.d).map((p) => p.y)));

    // Within a stroke's width of the tip, so no pale spike is left hanging off
    // the end of a black tail.
    expect((hindwingBounds()?.maxY ?? 0) - reach).toBeLessThan(20);
  });

  it('shades the costa rather than blotting the wing base', () => {
    // The lithograph darkens the front third of the forewing, from the base out
    // to where the apical border takes over. An earlier pass put that ink in a
    // rounded patch at the *trailing* corner of the wing base, which read as a
    // smudge. Two things say it is a costal band and not a blob: it runs most
    // of the length of the wing, and at every station along it the ink stays in
    // the half of the wing nearest the leading edge.
    const forewing = flattenClosed(PLATE.parts.find((part) => part.id === 'forewing')?.d ?? 'M0 0');
    const band = PLATE.parts.find(
      (part) =>
        part.id === 'wing-marking' && part.clipTo === 'forewing' && part.fill === 'pigment-deep',
    );
    const ink = flattenClosed(band?.d ?? 'M0 0');

    const span = (points: Point[]): number =>
      Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x));

    expect(span(ink) / span(forewing)).toBeGreaterThan(0.75);

    for (const x of [300, 600, 900, 1150]) {
      const wing = forewing.filter((p) => Math.abs(p.x - x) < 30).map((p) => p.y);
      const dark = ink.filter((p) => Math.abs(p.x - x) < 30).map((p) => p.y);

      expect(dark.length, `no ink at x = ${String(x)}`).toBeGreaterThan(0);

      const costa = Math.min(...wing);
      const depth = Math.max(...wing) - costa;

      // The whole band, not just its middle, inside the costal half.
      expect((Math.max(...dark) - costa) / depth, `band at x = ${String(x)}`).toBeLessThan(0.5);
    }
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
