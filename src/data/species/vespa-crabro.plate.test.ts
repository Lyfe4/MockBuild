import { describe, expect, it } from 'vitest';

import { MEMBRANOUS_PART_IDS, REQUIRED_PARTS, type PlatePartId } from '@/lib/plate';
import { describePlateContract } from '@/test/plateContract';
import { capsuleWidth, flattenClosed, jointAngle } from '@/test/plateGeometry';

import { VESPA_CRABRO as SPECIES } from './vespa-crabro';
import { VESPA_CRABRO_PLATE as PLATE } from './vespa-crabro.plate';

/**
 * The hornet, checked.
 *
 * The shared contract covers what every plate must be. What is only true here
 * is the waist — which `REQUIRED_PARTS.hymenoptera` cannot ask for, because it
 * is a gap rather than a part — and the difference between a segment line and a
 * band, which is the difference between anatomy and pattern.
 */

function count(id: PlatePartId): number {
  return PLATE.parts.filter((part) => part.id === id).length;
}

function outlineOf(id: PlatePartId) {
  return flattenClosed(PLATE.parts.find((part) => part.id === id)?.d ?? 'M0 0');
}

/**
 * The narrowest the animal gets between the widest point of the thorax and the
 * widest point of the abdomen — which is the waist, wherever it happens to fall.
 * Measured by scanning rather than at a chosen station, so a redrawn thorax
 * moves the measurement instead of invalidating it.
 */
function waist(): { narrowest: number; widest: number } {
  const both = [...outlineOf('thorax'), ...outlineOf('abdomen')];
  const widest = Math.max(...both.map((point) => point.x)) * 2;
  const at = (points: { x: number; y: number }[]): number =>
    points.reduce((most, point) => (point.x > most.x ? point : most), points[0]!).y;
  const from = at(outlineOf('thorax'));
  const to = at(outlineOf('abdomen'));

  let narrowest = Infinity;

  for (let y = from; y <= to; y += 2) {
    const near = both.filter((point) => Math.abs(point.y - y) < 4);

    narrowest = Math.min(narrowest, near.length === 0 ? 0 : Math.max(...near.map((p) => p.x)) * 2);
  }

  return { narrowest, widest };
}

describe('the Vespa crabro plate', () => {
  describePlateContract(PLATE, SPECIES);

  it('has a waist, which is the order and which no required part can enforce', () => {
    // The gap between the back of the thorax and the front of the abdomen. A
    // thorax drawn a little long or an abdomen a little forward closes it, and
    // a wasp without a waist is a fly — so it is measured here rather than
    // trusted.
    const { narrowest, widest } = waist();

    expect(widest).toBeGreaterThan(300);
    // Pinched to a third of the widest the animal gets, or less.
    expect(narrowest / widest).toBeLessThan(0.34);
    expect(REQUIRED_PARTS.hymenoptera).not.toContain('petiole' as PlatePartId);
  });

  it('tells a segment line apart from a band', () => {
    // `abdomen-segment` is the join between tergites — anatomy, and there on a
    // plain brown wasp. `marking` is the pattern. Drawing only one of them
    // leaves either a banded tube with no segments or a segmented tube with no
    // hornet on it.
    const segments = PLATE.parts.filter((part) => part.id === 'abdomen-segment');
    const bands = PLATE.parts.filter((part) => part.id === 'marking');

    expect(segments.length).toBeGreaterThanOrEqual(4);
    expect(bands.length).toBeGreaterThanOrEqual(3);
    expect(segments.every((part) => part.fill === 'none')).toBe(true);
    expect(bands.every((part) => part.fill === 'pigment-deep')).toBe(true);
    expect(bands.every((part) => part.clipTo === 'abdomen')).toBe(true);
    expect(SPECIES.morphology.markings).toBe('bands');
  });

  it('notches each band back down the midline, which is what crabro does', () => {
    // The band runs across the tergite and sends a point back towards the tail
    // on the axis. It is the notch rather than the band that separates a hornet
    // from the yellowjackets it shares the reference plate with.
    for (const band of PLATE.parts.filter((part) => part.id === 'marking')) {
      const points = flattenClosed(band.d);
      const onAxis = points.filter((point) => Math.abs(point.x) < 8).map((point) => point.y);
      const outboard = points.filter((point) => Math.abs(point.x) > 90).map((point) => point.y);

      expect(onAxis.length).toBeGreaterThan(0);
      // The lowest point on the axis is below the lowest point out at the side.
      expect(Math.max(...onAxis)).toBeGreaterThan(Math.max(...outboard));
    }
  });

  it('makes all four wings windows, because the legs pass under them', () => {
    const wings = PLATE.parts.filter((part) => part.id === 'forewing' || part.id === 'hindwing');

    expect(wings).toHaveLength(2);
    expect(wings.every((part) => part.opacity === 'membrane')).toBe(true);
    // And nothing else claims to be one — the validator rejects it, but the
    // rule is worth stating where a reader of this plate will see it.
    for (const part of PLATE.parts) {
      if (part.opacity === 'membrane') expect(MEMBRANOUS_PART_IDS).toContain(part.id);
    }
  });

  it('spreads the wings well past the body, as a pinned specimen has them', () => {
    const wing = flattenClosed(PLATE.parts.find((part) => part.id === 'forewing')?.d ?? 'M0 0');
    const abdomen = flattenClosed(PLATE.parts.find((part) => part.id === 'abdomen')?.d ?? 'M0 0');

    expect(Math.max(...wing.map((p) => p.x))).toBeGreaterThan(
      Math.max(...abdomen.map((p) => p.x)) * 3,
    );
  });

  it('commits to a sex, and the plate says which', () => {
    // The reference caption names the male, and a male hornet's antennae are
    // longer than a worker's. A plate that draws one and labels neither is a
    // plate that cannot be checked.
    const antennae = PLATE.parts.filter((part) => part.id === 'antenna');
    const tip = Math.min(...antennae.flatMap((part) => flattenClosed(part.d)).map((p) => p.y));

    expect(PLATE.sex).toBe('male');
    // Reaching well past the front of the head, which is the male's character.
    expect(tip).toBeLessThan(Math.min(...outlineOf('head').map((point) => point.y)) - 100);
  });

  it('draws the antenna as two filled segments with the elbow between them', () => {
    const antennae = PLATE.parts.filter((part) => part.id === 'antenna');
    const [scape, flagellum] = antennae;

    // A scape and a flagellum, both capsules. It was a scape and two `structure`
    // strokes: 4.6 units across a frame two thousand wide, a fifth of a pixel at
    // eighty, so the hornet lost its antennae at the size the contact sheet
    // judges it at. Fewer paths and heavier ones, which is the trade a thumbnail
    // wants in both directions.
    expect(count('antenna')).toBe(2);
    expect(antennae.every((part) => part.fill === 'pigment-deep')).toBe(true);

    for (const part of antennae) {
      expect(capsuleWidth(part.d), part.id).toBeGreaterThanOrEqual(8);
    }

    // Geniculate, and drawn as an angle rather than as a smoothed curve — a
    // curve through both segments rounds the bend off and the bend is what
    // says this is a wasp's antenna and not a beetle's.
    expect(jointAngle(scape?.d ?? '', flagellum?.d ?? '')).toBeGreaterThan(20);
  });

  it('gives it three ocelli on the vertex, two mirrored and one on the axis', () => {
    const ocelli = PLATE.parts.filter((part) => part.id === 'ocellus');

    expect(ocelli).toHaveLength(2);
    expect(ocelli.filter((part) => part.mirror === false)).toHaveLength(1);
  });
});
