import { describe, expect, it } from 'vitest';

import { boundsOf, parsePathData, pathPoints, type PlatePartId } from '@/lib/plate';
import { describePlateContract } from '@/test/plateContract';
import { capsuleAxis, capsuleWidth, flattenClosed, inside } from '@/test/plateGeometry';

import { CARABUS_VIOLACEUS as SPECIES } from './carabus-violaceus';
import { CARABUS_VIOLACEUS_PLATE as PLATE } from './carabus-violaceus.plate';

/**
 * The violet ground beetle, checked.
 *
 * The shared contract covers what every plate must be. What is only true here
 * is the border — the one place the animal is violet at all — and the runner's
 * legs, which are the character a plate drawn at a chafer's proportions loses.
 */

function parts(id: PlatePartId) {
  return PLATE.parts.filter((part) => part.id === id);
}

function widthOf(id: PlatePartId): number {
  return capsuleWidth(parts(id)[0]?.d ?? 'M0 0');
}

function lengthOf(id: PlatePartId): number {
  const axis = capsuleAxis(parts(id)[0]?.d ?? 'M0 0');

  if (axis === undefined) return 0;

  return Math.hypot(axis.to.x - axis.from.x, axis.to.y - axis.from.y);
}

describe('the Carabus violaceus plate', () => {
  describePlateContract(PLATE, SPECIES);

  it('borders each wing case, which is the only violet on the animal', () => {
    const border = parts('marking').filter((part) => part.clipTo === 'elytron');

    expect(border).toHaveLength(1);
    expect(border[0]?.fill).toBe('pigment-deep');

    // A band, not a wash: it follows the outer margin and reaches nowhere near
    // the suture. Half the wing case in deep pigment would be a different
    // beetle, and one with no border at all would not be this one.
    const points = flattenClosed(border[0]?.d ?? 'M0 0');
    const nearest = Math.min(...points.map((point) => point.x));

    expect(nearest).toBeGreaterThan(60);
  });

  it('keeps the border on the wing case it belongs to', () => {
    // A filled band asked the sharp question rather than the sampled one: the
    // whole of its outline is on the surface, not most of it.
    const outline = flattenClosed(parts('elytron')[0]?.d ?? 'M0 0');
    const off = flattenClosed(
      parts('marking').find((part) => part.clipTo === 'elytron')?.d ?? 'M0 0',
    ).filter((point) => !inside(outline, point));

    expect(off).toHaveLength(0);
  });

  it("gives it a runner's legs: the hind tarsi reach past the wing cases", () => {
    const elytron = boundsOf(pathPoints(parsePathData(parts('elytron')[0]?.d ?? 'M0 0')));
    const tarsi = parts('hindleg-tarsus').flatMap((part) =>
      pathPoints(parsePathData(part.d)).map((point) => point.y),
    );

    // A quarter of a body length past the apex, which is what the lithograph
    // shows and what a beetle that hunts on foot needs.
    expect(Math.max(...tarsi)).toBeGreaterThan((elytron?.maxY ?? 0) + 250);
  });

  it('draws the tibia longer than the femur, as a ground beetle has it', () => {
    // The proportion that separates a runner from a digger. A chafer's fore
    // tibia is short, toothed and about as long as its femur; this one is half
    // again as long.
    expect(lengthOf('hindleg-tibia')).toBeGreaterThan(lengthOf('hindleg-femur'));
    expect(widthOf('hindleg-tibia')).toBeLessThan(widthOf('hindleg-femur'));
  });

  it('keeps the limbs off the reference rather than off another plate', () => {
    const across =
      (boundsOf(pathPoints(parsePathData(parts('elytron')[0]?.d ?? 'M0 0')))?.maxX ?? 0) * 2;

    // CLAUDE.md's rule is femora at roughly six per cent of the width across
    // the wing cases and tibiae at four. A Carabus is narrower than a chafer,
    // so the same limb is a larger fraction of it; nine and six, measured.
    expect(widthOf('hindleg-femur') / across).toBeGreaterThan(0.06);
    expect(widthOf('hindleg-femur') / across).toBeLessThan(0.12);
    expect(widthOf('hindleg-tibia') / across).toBeLessThan(0.09);
  });

  it('chains the antenna rather than clubbing it', () => {
    const antennae = parts('antenna');
    const widths = antennae.map((part) => capsuleWidth(part.d));

    // Filiform: every joint about as thick as the one before, tapering a
    // little to the tip. A lamellate antenna widens at the end, and that is the
    // character this beetle is being separated from the scarabs on.
    expect(antennae.length).toBeGreaterThanOrEqual(6);
    expect(SPECIES.morphology.antennae).toBe('filiform');

    for (const [index, width] of widths.entries()) {
      const before = widths[index - 1];

      if (before === undefined) continue;

      expect(width, `joint ${String(index)}`).toBeLessThanOrEqual(before);
    }
  });

  it('draws a beetle narrower than a chafer and wider than a stag beetle', () => {
    const elytron = boundsOf(pathPoints(parsePathData(parts('elytron')[0]?.d ?? 'M0 0')));
    const across = (elytron?.maxX ?? 0) * 2;

    // 0.39 off the lithograph — 157 pixels across a body 405 long.
    expect(across / 1000).toBeGreaterThan(0.33);
    expect(across / 1000).toBeLessThan(0.45);
  });

  it('crosses the head with mandibles, and mirrors them', () => {
    const mandibles = parts('mandible');

    expect(mandibles).toHaveLength(1);
    // Drawn once on the right and reflected — which is the whole bilateral
    // mechanism, and why a plate cannot come out with three mandibles.
    expect(mandibles[0]?.mirror).not.toBe(false);
    expect(
      Math.min(...pathPoints(parsePathData(mandibles[0]?.d ?? 'M0 0')).map((p) => p.y)),
    ).toBeLessThan(-40);
  });
});
