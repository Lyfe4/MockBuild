import { describe, expect, it } from 'vitest';

import { boundsOf, parsePathData, pathPoints, REQUIRED_PARTS, type PlatePartId } from '@/lib/plate';
import { describePlateContract } from '@/test/plateContract';
import { allPoints, flattenClosed } from '@/test/plateGeometry';

import { PALOMENA_PRASINA as SPECIES } from './palomena-prasina';
import { PALOMENA_PRASINA_PLATE as PLATE } from './palomena-prasina.plate';

/**
 * The green shield bug, checked.
 *
 * The shared contract covers what every plate must be. What is only true here
 * is the *shape* — a shield bug is identified as an outline before it is
 * identified as a species — and the two structures that outline is made of: a
 * scutellum long enough to matter and wing tips that reach past the end of the
 * abdomen.
 */

function count(id: PlatePartId): number {
  return PLATE.parts.filter((part) => part.id === id).length;
}

function boundsOfPart(id: PlatePartId) {
  const part = PLATE.parts.find((candidate) => candidate.id === id);

  return boundsOf(pathPoints(parsePathData(part?.d ?? 'M0 0')));
}

describe('the Palomena prasina plate', () => {
  describePlateContract(PLATE, SPECIES);

  it('draws a shield: broad, and widest behind the middle', () => {
    // Measured off the lithograph, the body is about 0.63 as wide as it is
    // long, and the widest point is at about three fifths of the way down. A
    // bug drawn widest at the shoulders is a beetle.
    const outline = flattenClosed(PLATE.parts.find((part) => part.id === 'abdomen')?.d ?? 'M0 0');
    const half = Math.max(...outline.map((point) => point.x));
    const widest = outline.reduce((most, point) => (point.x > most.x ? point : most), outline[0]!);

    expect((half * 2) / 1000).toBeGreaterThan(0.55);
    expect((half * 2) / 1000).toBeLessThan(0.72);
    expect(widest.y).toBeGreaterThan(500);
  });

  it('gives the scutellum a third of the animal, which is the order seen from above', () => {
    const scutellum = boundsOfPart('scutellum');
    const length = (scutellum?.maxY ?? 0) - (scutellum?.minY ?? 0);

    expect(count('scutellum')).toBe(1);
    expect(length / 1000).toBeGreaterThan(0.28);
    expect(length / 1000).toBeLessThan(0.45);
    // On the axis and drawn once — reflecting it would double the line down
    // the middle of the back.
    expect(PLATE.parts.find((part) => part.id === 'scutellum')?.mirror).toBe(false);
  });

  it('runs the wing tips past the end of the abdomen, which is what a hemelytron does', () => {
    const wing = boundsOf(flattenClosed(PLATE.parts.find((p) => p.id === 'forewing')?.d ?? 'M0 0'));
    const abdomen = boundsOf(
      flattenClosed(PLATE.parts.find((p) => p.id === 'abdomen')?.d ?? 'M0 0'),
    );

    expect(wing?.maxY ?? 0).toBeGreaterThan(abdomen?.maxY ?? 0);
  });

  it('paints the membrane rather than cutting a window in it', () => {
    // `opacity: 'membrane'` is for a wing you can see through, and nothing
    // shows through this one in the reference: it is opaque and pale. The
    // dragonfly is the plate that needs the real thing.
    const membrane = PLATE.parts.filter(
      (part) => part.id === 'wing-marking' && part.fill === 'surface',
    );

    expect(membrane.length).toBeGreaterThanOrEqual(1);
    expect(membrane.every((part) => part.clipTo === 'forewing')).toBe(true);
    expect(PLATE.parts.every((part) => part.opacity === undefined)).toBe(true);
  });

  it('draws no hindwings, because none of them shows from above', () => {
    // Deliberate, not forgotten. They are folded under the hemelytra, and
    // `REQUIRED_PARTS.hemiptera` does not ask for them.
    expect(count('hindwing')).toBe(0);
    expect(REQUIRED_PARTS.hemiptera).not.toContain('hindwing');
  });

  it('gives it six legs and two antennae, authored as three and one', () => {
    // The renderer supplies the other side; authoring both would be authoring
    // the plate twice and getting one of them wrong.
    for (const id of ['foreleg-femur', 'midleg-femur', 'hindleg-femur'] as const) {
      expect(count(id), id).toBe(1);
      expect(PLATE.parts.find((part) => part.id === id)?.mirror, id).not.toBe(false);
    }

    expect(count('antenna')).toBeGreaterThanOrEqual(3);
    expect(PLATE.parts.filter((p) => p.id === 'antenna').every((p) => p.mirror !== false)).toBe(
      true,
    );
  });

  it('reaches well outside the body with the antennae, which the frame has to allow for', () => {
    const ys = allPoints(PLATE).map((point) => point.y);

    // They sweep forward past the head, which is why plate space starts at the
    // head end rather than at the topmost ink.
    expect(Math.min(...ys)).toBeLessThan(-150);
  });

  it('agrees with the record about a plain green filiform bug', () => {
    // The drawing has always been a hemelytron — hard at the base, membranous
    // at the tip — and the record now has a state that says so.
    expect(SPECIES.morphology.wingCover).toBe('hemelytra');
    expect(SPECIES.morphology.antennae).toBe('filiform');
    expect(SPECIES.morphology.markings).toBe('none');
    expect(SPECIES.morphology.colourFamily).toBe('green');
    // No spots, bands or stripes on the wings — the pattern on this animal is
    // the connexivum showing at the margin, which is anatomy.
    expect(PLATE.parts.filter((part) => part.id === 'marking')).toHaveLength(0);
    expect(count('abdomen-segment')).toBeGreaterThanOrEqual(4);
  });
});
