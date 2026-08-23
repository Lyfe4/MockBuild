import { describe, expect, it } from 'vitest';

import { boundsOf, parsePathData, pathPoints, type PlatePartId } from '@/lib/plate';
import { describePlateContract } from '@/test/plateContract';
import { capsuleWidth, flattenClosed } from '@/test/plateGeometry';

import { BOMBUS_TERRESTRIS as SPECIES } from './bombus-terrestris';
import { BOMBUS_TERRESTRIS_PLATE as PLATE } from './bombus-terrestris.plate';

/**
 * The buff-tailed bumblebee, checked.
 *
 * The shared contract covers what every plate must be. What is only true here
 * is the banding — three bands in the right order down the animal, which is how
 * a British bumblebee is keyed out before anything else — the fur, which is the
 * one texture an engraving has to suggest rather than copy, and the corbicula,
 * which is the deliberate exception to the limb proportions CLAUDE.md records.
 */

function boundsOfPart(id: PlatePartId) {
  const part = PLATE.parts.find((candidate) => candidate.id === id);

  return boundsOf(pathPoints(parsePathData(part?.d ?? 'M0 0')));
}

describe('the Bombus terrestris plate', () => {
  describePlateContract(PLATE, SPECIES);

  it('bands it in the order a bumblebee is keyed out on', () => {
    // Collar on the thorax, band on the abdomen, tail at the end. The sequence
    // is the identification; a plate with the bands in any other order has
    // drawn a different bee.
    const bands = PLATE.parts.filter((part) => part.id === 'marking');
    const middleOf = (d: string): number => {
      const ys = flattenClosed(d).map((point) => point.y);

      return (Math.min(...ys) + Math.max(...ys)) / 2;
    };

    expect(bands).toHaveLength(3);

    const collar = bands.find((part) => part.clipTo === 'thorax');
    const onAbdomen = bands.filter((part) => part.clipTo === 'abdomen');

    expect(collar).toBeDefined();
    expect(onAbdomen).toHaveLength(2);

    const [band, tail] = onAbdomen
      .map((part) => ({ part, y: middleOf(part.d) }))
      .sort((a, b) => a.y - b.y);

    expect(middleOf(collar?.d ?? 'M0 0')).toBeLessThan(band!.y);
    // The tail is the pale one, and it is last.
    expect(tail!.part.fill).toBe('surface');
    expect(band!.part.fill).toBe('pigment');
    expect(SPECIES.morphology.markings).toBe('bands');
  });

  it('runs the tail to the end of the abdomen, because that is what a tail is', () => {
    const tail = PLATE.parts.find((part) => part.id === 'marking' && part.fill === 'surface');
    const abdomen = boundsOf(
      flattenClosed(PLATE.parts.find((p) => p.id === 'abdomen')?.d ?? 'M0 0'),
    );
    const reach = Math.max(...flattenClosed(tail?.d ?? 'M0 0').map((point) => point.y));

    expect((abdomen?.maxY ?? 0) - reach).toBeLessThan(24);
  });

  it('suggests fur with hatching rather than drawing it', () => {
    // Two fans, one per furred surface, both at detail weight so they are the
    // first thing to drop out at thumbnail size and leave a clean silhouette.
    const fur = PLATE.parts.filter((part) => part.id === 'hatching');

    expect(fur.length).toBeGreaterThanOrEqual(8);
    expect(fur.every((part) => part.rank === 'detail')).toBe(true);
    expect(fur.every((part) => part.fill === 'none')).toBe(true);
    expect(new Set(fur.map((part) => part.clipTo))).toEqual(new Set(['thorax', 'abdomen']));
  });

  it('broadens the hind tibia into a corbicula, which no other plate here does', () => {
    // The deliberate exception to the four-per-cent rule: a female Bombus
    // carries pollen on a widened hind tibia, and drawing it at a wasp's width
    // deletes the structure that says this is a worker or a queen.
    const hind = PLATE.parts.find((part) => part.id === 'hindleg-tibia');
    const mid = PLATE.parts.find((part) => part.id === 'midleg-tibia');

    expect(capsuleWidth(hind?.d ?? 'M0 0')).toBeGreaterThan(capsuleWidth(mid?.d ?? 'M0 0') * 1.4);
    expect(PLATE.sex).toBe('female');
  });

  it('makes all four wings windows, because the legs pass under them', () => {
    const wings = PLATE.parts.filter((part) => part.id === 'forewing' || part.id === 'hindwing');

    expect(wings).toHaveLength(2);
    expect(wings.every((part) => part.opacity === 'membrane')).toBe(true);
  });

  it('draws a round bee, not a long one', () => {
    // Thorax and abdomen both broad, and the abdomen at least half as wide as
    // the animal is long. A slender one is a wasp.
    const abdomen = boundsOfPart('abdomen');

    expect(((abdomen?.maxX ?? 0) * 2) / 1000).toBeGreaterThan(0.45);
    expect(SPECIES.morphology.bodyShape).toBe('oval');
  });

  it('elbows the antenna, which is the shape that survives to plate size', () => {
    const antennae = PLATE.parts.filter((part) => part.id === 'antenna');

    expect(antennae.length).toBeGreaterThanOrEqual(2);
    // A filled scape and a stroke for the flagellum: twelve segments do not
    // read at eighty pixels and the bend does.
    expect(antennae.some((part) => part.fill === 'pigment-deep')).toBe(true);
    expect(antennae.some((part) => part.fill === 'none')).toBe(true);
  });
});
