import { describe, expect, it } from 'vitest';

import { generatePlant, seedFromId } from './generate';
import { commandPoints } from './path';
import { FLOWER_TYPES, LEAF_SHAPES, VIEW_BOX, type PlantForm } from './types';

const BASE_FORM: PlantForm = {
  branchCount: 3,
  branchDepth: 3,
  branchAngle: 28,
  stemCurve: 0.12,
  leafShape: 'ovate',
  leafDensity: 0.6,
  flowerType: 'cluster',
  flowerSize: 1,
  height: 0.7,
  scale: 0.9,
};

const form = (overrides: Partial<PlantForm> = {}): PlantForm => ({ ...BASE_FORM, ...overrides });

/** Every coordinate the geometry touches, including flower extents. */
function allPoints(geometry: ReturnType<typeof generatePlant>): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];

  for (const stem of geometry.stems) points.push(...commandPoints(stem.commands));
  for (const leaf of geometry.leaves) points.push(...commandPoints(leaf.commands));
  for (const flower of geometry.flowers) {
    points.push(flower.center, ...flower.petals);
  }

  return points;
}

describe('generatePlant', () => {
  it('is deterministic: the same form and seed produce deeply equal geometry', () => {
    expect(generatePlant(form(), 12345)).toStrictEqual(generatePlant(form(), 12345));
  });

  it('produces different geometry for different seeds', () => {
    expect(generatePlant(form(), 1)).not.toStrictEqual(generatePlant(form(), 2));
  });

  it('returns plain data that survives a JSON round trip', () => {
    const geometry = generatePlant(form(), 99);

    expect(JSON.parse(JSON.stringify(geometry))).toStrictEqual(geometry);
  });

  it('reports the fixed view box so a grid of illustrations lines up', () => {
    const tall = generatePlant(form({ height: 1 }), 7);
    const squat = generatePlant(form({ height: 0.3 }), 7);

    expect(tall.viewBox).toStrictEqual({ width: VIEW_BOX.width, height: VIEW_BOX.height });
    expect(squat.viewBox).toStrictEqual(tall.viewBox);
  });

  it('always draws at least a stem', () => {
    const geometry = generatePlant(form({ branchDepth: 0, leafDensity: 0, flowerType: 'none' }), 3);

    expect(geometry.stems.length).toBeGreaterThan(0);
    expect(geometry.leaves).toHaveLength(0);
    expect(geometry.flowers).toHaveLength(0);
  });

  describe('stays inside the view box', () => {
    /**
     * The fit step is the only thing standing between a wild parameter
     * combination and a drawing that overflows its frame, so this sweeps a
     * deliberately awkward spread: extreme curves, maximum branching, the
     * largest flowers, and every leaf shape.
     */
    const cases: PlantForm[] = [
      form({ height: 1, scale: 1, branchCount: 5, branchDepth: 5 }),
      form({ height: 0.3, scale: 1, branchCount: 1, branchDepth: 0 }),
      form({ stemCurve: 0.6, branchAngle: 60, flowerSize: 2, flowerType: 'umbel' }),
      form({ stemCurve: -0.6, branchAngle: 60, flowerSize: 2, flowerType: 'spike' }),
      form({ leafDensity: 1, leafShape: 'palmate', flowerType: 'single', flowerSize: 2 }),
      ...LEAF_SHAPES.map((leafShape) => form({ leafShape, leafDensity: 1 })),
      ...FLOWER_TYPES.map((flowerType) => form({ flowerType, flowerSize: 2 })),
    ];

    it.each(cases.map((candidate, index) => [index, candidate] as const))(
      'case %i keeps every point within the frame',
      (_index, candidate) => {
        for (const seed of [1, 2, 3, 101, 90210]) {
          const geometry = generatePlant(candidate, seed);

          for (const point of allPoints(geometry)) {
            expect(point.x).toBeGreaterThanOrEqual(0);
            expect(point.x).toBeLessThanOrEqual(VIEW_BOX.width);
            expect(point.y).toBeGreaterThanOrEqual(0);
            expect(point.y).toBeLessThanOrEqual(VIEW_BOX.height);
          }
        }
      },
    );
  });

  it('clamps out-of-range parameters rather than throwing', () => {
    const wild = form({
      branchCount: 99,
      branchDepth: 40,
      branchAngle: 400,
      stemCurve: -12,
      leafDensity: 5,
      flowerSize: 50,
      height: 20,
      scale: 9,
    });

    const geometry = generatePlant(wild, 4);

    expect(geometry.stems.length).toBeGreaterThan(0);

    for (const point of allPoints(geometry)) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(VIEW_BOX.width);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(VIEW_BOX.height);
    }
  });

  it('gives every stem a positive width and a measured length', () => {
    for (const stem of generatePlant(form(), 55).stems) {
      expect(stem.width).toBeGreaterThan(0);
      expect(stem.length).toBeGreaterThan(0);
      expect(Number.isFinite(stem.length)).toBe(true);
    }
  });

  it('tapers stems as they branch outwards', () => {
    const geometry = generatePlant(form({ branchDepth: 3 }), 8);
    const trunk = geometry.stems.find((stem) => stem.depth === 0);
    const twig = geometry.stems.find((stem) => stem.depth === 3);

    expect(trunk).toBeDefined();
    expect(twig).toBeDefined();
    expect(trunk!.width).toBeGreaterThan(twig!.width);
  });

  it('draws no flowers when the arrangement is none', () => {
    expect(generatePlant(form({ flowerType: 'none' }), 6).flowers).toHaveLength(0);
  });

  it('draws no leaves at zero density', () => {
    expect(generatePlant(form({ leafDensity: 0 }), 6).leaves).toHaveLength(0);
  });

  it('tags every leaf with the shape it was drawn from', () => {
    for (const shape of LEAF_SHAPES) {
      const geometry = generatePlant(form({ leafShape: shape, leafDensity: 1 }), 21);

      expect(geometry.leaves.length).toBeGreaterThan(0);
      expect(geometry.leaves.every((leaf) => leaf.shape === shape)).toBe(true);
    }
  });

  it('respects the branch node ceiling under extreme branching', () => {
    const geometry = generatePlant(form({ branchCount: 5, branchDepth: 5 }), 77);

    expect(geometry.stems.length).toBeLessThanOrEqual(400);
  });
});

describe('seedFromId', () => {
  it('is stable for a given catalogue number', () => {
    expect(seedFromId('TBA-0042')).toBe(seedFromId('TBA-0042'));
  });

  it('separates ids that differ only by a transposition', () => {
    // The ids in this archive share a four-character prefix, so a weak hash
    // would collide constantly. This is the case that catches it.
    expect(seedFromId('TBA-0042')).not.toBe(seedFromId('TBA-0024'));
  });

  it('produces an unsigned 32-bit integer', () => {
    for (const id of ['TBA-0001', 'TBA-9999', '']) {
      const seed = seedFromId(id);

      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(2 ** 32);
    }
  });
});
