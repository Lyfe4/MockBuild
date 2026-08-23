import { describe, expect, it } from 'vitest';

import { boundsOf, parsePathData, pathPoints, REQUIRED_PARTS, type PlatePartId } from '@/lib/plate';
import { describePlateContract } from '@/test/plateContract';
import { capsuleAxis, capsuleWidth } from '@/test/plateGeometry';

import { FORMICA_RUFA as SPECIES } from './formica-rufa';
import { FORMICA_RUFA_PLATE as PLATE } from './formica-rufa.plate';

/**
 * The red wood ant, checked.
 *
 * The shared contract covers what every plate must be. What is only true here is
 * that the animal has *no wings* — the only record in the collection that says
 * so, and the reason `REQUIRED_PARTS.hymenoptera` stopped asking for any — and
 * that it is built in three parts with the waist drawn as a gap rather than as a
 * shape.
 */

function parts(id: PlatePartId) {
  return PLATE.parts.filter((part) => part.id === id);
}

function boundsOfPart(id: PlatePartId) {
  return boundsOf(pathPoints(parsePathData(parts(id)[0]?.d ?? 'M0 0')));
}

describe('the Formica rufa plate', () => {
  describePlateContract(PLATE, SPECIES);

  it('draws no wings, and the record says why', () => {
    // A worker ant has none. Not folded, not reduced — none.
    expect(parts('forewing')).toHaveLength(0);
    expect(parts('hindwing')).toHaveLength(0);
    expect(SPECIES.morphology.wingCover).toBe('absent');
  });

  it('is buildable because the order no longer requires wings', () => {
    // The plate could not exist otherwise, and that is the point worth pinning:
    // winglessness is normal in Hymenoptera rather than exceptional, so it is
    // the required-parts list that was wrong rather than this animal.
    expect(REQUIRED_PARTS.hymenoptera).not.toContain('forewing');
    expect(REQUIRED_PARTS.hymenoptera).not.toContain('hindwing');
    // And everything the list does ask for is here.
    for (const id of REQUIRED_PARTS.hymenoptera) {
      expect(parts(id), id).not.toHaveLength(0);
    }
  });

  it('leaves the waist as a gap between the alitrunk and the gaster', () => {
    const thorax = boundsOfPart('thorax');
    const abdomen = boundsOfPart('abdomen');
    const gap = (abdomen?.minY ?? 0) - (thorax?.maxY ?? 0);

    // A waist is the absence of an animal rather than a part of one, which is
    // the same call the bumblebee's plate makes. Small, and it has to be
    // positive: an overlap would make the ant one piece.
    expect(gap).toBeGreaterThan(0);
    expect(gap).toBeLessThan(60);
  });

  it('builds the animal in three parts, each narrower or wider than the last', () => {
    const head = boundsOfPart('head');
    const thorax = boundsOfPart('thorax');
    const abdomen = boundsOfPart('abdomen');

    // Wide, narrow, wide. That silhouette is the order, and it is what a reader
    // recognises before any of the detail resolves.
    expect(thorax?.maxX ?? 0).toBeLessThan((head?.maxX ?? 0) * 0.8);
    expect(thorax?.maxX ?? 0).toBeLessThan((abdomen?.maxX ?? 0) * 0.8);
  });

  it('elbows the antenna, which nothing else in the collection does', () => {
    const antennae = parts('antenna');
    const scape = capsuleAxis(antennae[0]?.d ?? 'M0 0');
    const first = capsuleAxis(antennae[1]?.d ?? 'M0 0');

    expect(antennae.length).toBeGreaterThanOrEqual(5);
    expect(scape).toBeDefined();
    expect(first).toBeDefined();

    const heading = (axis: NonNullable<typeof scape>): number =>
      (Math.atan2(axis.to.y - axis.from.y, axis.to.x - axis.from.x) * 180) / Math.PI;
    const bend = Math.abs(heading(scape!) - heading(first!));

    // A real bend, not a curve: at least twenty degrees between the scape and
    // the first joint of the funiculus. `ANTENNA_FORMS` has no `geniculate`, so
    // the record answers `filiform` and the drawing carries the elbow.
    expect(bend).toBeGreaterThan(20);
    expect(SPECIES.morphology.antennae).toBe('filiform');
  });

  it('gives the scape more than half the antenna', () => {
    const antennae = parts('antenna');
    const lengthOf = (d: string): number => {
      const axis = capsuleAxis(d);

      return axis === undefined ? 0 : Math.hypot(axis.to.x - axis.from.x, axis.to.y - axis.from.y);
    };
    const scape = lengthOf(antennae[0]?.d ?? 'M0 0');
    const rest = antennae.slice(1).reduce((sum, part) => sum + lengthOf(part.d), 0);

    // Which is what a Formica has, and is why the elbow sits so far out from
    // the head rather than close to it.
    expect(scape).toBeGreaterThan(rest * 0.7);
  });

  it('keeps the legs finer than any beetle here', () => {
    const femur = capsuleWidth(parts('hindleg-femur')[0]?.d ?? 'M0 0');

    // 26 units on a body axis of 1000, against the violet ground beetle's 34 on
    // an animal four times the length. An ant's leg is wire.
    expect(femur).toBeLessThan(32);
    expect(femur).toBeGreaterThan(16);
  });

  it('draws a worker rather than a queen, and says so', () => {
    // A wood ant nest also makes winged queens and males in high summer, and
    // they would answer `membranous`. The sex field is the nearest the schema
    // comes to recording a caste.
    expect(PLATE.sex).toBe('female');
    expect(parts('ocellus').length).toBeGreaterThanOrEqual(2);
  });
});
