import { describe, expect, it } from 'vitest';

import { generatePlant, seedFromId } from './generate';
import { commandPoints } from './path';
import {
  BASE_TO_TIP_WIDTH_RATIO,
  FLOWER_TYPES,
  LEAF_ARRANGEMENTS,
  LEAF_SHAPES,
  PLANT_HABITS,
  VIEW_BOX,
  type PathCommand,
  type PlantForm,
} from './types';

const BASE_FORM: PlantForm = {
  habit: 'upright',
  branchCount: 3,
  branchDepth: 3,
  branchAngle: 28,
  stemCurve: 0.12,
  leafShape: 'ovate',
  leafDensity: 0.6,
  leafArrangement: 'alternate',
  lobeCount: 5,
  flowerType: 'cluster',
  flowerSize: 1,
  petalCount: 5,
  roots: false,
  height: 0.7,
  scale: 0.9,
};

const form = (overrides: Partial<PlantForm> = {}): PlantForm => ({ ...BASE_FORM, ...overrides });

/** Every coordinate the geometry touches, including flower petals. */
function allPoints(geometry: ReturnType<typeof generatePlant>): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];

  for (const stem of geometry.stems) points.push(...commandPoints(stem.commands));
  for (const root of geometry.roots) points.push(...commandPoints(root.commands));
  for (const leaf of geometry.leaves) {
    points.push(...commandPoints(leaf.commands), ...commandPoints(leaf.midrib));
  }
  for (const flower of geometry.flowers) {
    points.push(flower.center);

    for (const petal of flower.petals) points.push(...commandPoints(petal));
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
      // Every habit, at both extremes of the parameters that most affect reach.
      ...PLANT_HABITS.map((habit) => form({ habit, leafDensity: 1, roots: true })),
      ...PLANT_HABITS.map((habit) =>
        form({
          habit,
          height: 1,
          scale: 1,
          branchCount: 5,
          branchDepth: 5,
          branchAngle: 60,
          stemCurve: 0.6,
          flowerSize: 2,
          leafDensity: 1,
          roots: true,
        }),
      ),
      ...LEAF_ARRANGEMENTS.map((leafArrangement) => form({ leafArrangement, leafDensity: 1 })),
      ...[3, 5, 7, 9].map((lobeCount) =>
        form({ lobeCount, leafShape: 'lobed', leafDensity: 1, roots: true }),
      ),
      ...[4, 6, 8].map((petalCount) => form({ petalCount, flowerType: 'single', flowerSize: 2 })),
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

  describe('stroke weight', () => {
    it('tapers each segment continuously along its own length', () => {
      for (const stem of generatePlant(form(), 31).stems) {
        expect(stem.tipWidth).toBeLessThan(stem.width);
        expect(stem.tipWidth).toBeGreaterThan(0);
      }
    });

    /**
     * The line-weight range is the difference between an engraved plate and a
     * sketch. Compounding a fixed per-generation decay would make a deep plant
     * several times spindlier at the tips than a shallow one, so the decay is
     * derived from the depth and the ratio should hold whatever the depth is.
     */
    it.each([0, 1, 2, 3, 4, 5])(
      'holds base-to-tip width near the target ratio at depth %i',
      (branchDepth) => {
        const geometry = generatePlant(form({ branchDepth }), 44);
        const widths = geometry.stems.map((stem) => stem.width);
        const tips = geometry.stems.map((stem) => stem.tipWidth);

        const ratio = Math.max(...widths) / Math.min(...tips);

        expect(ratio).toBeGreaterThan(BASE_TO_TIP_WIDTH_RATIO * 0.85);
        expect(ratio).toBeLessThan(BASE_TO_TIP_WIDTH_RATIO * 1.15);
      },
    );

    it('never lets the main stem reach the 5x range it used to', () => {
      const geometry = generatePlant(form({ branchDepth: 5, branchCount: 4 }), 12);
      const widths = geometry.stems.map((stem) => stem.width);

      expect(Math.max(...widths) / Math.min(...widths)).toBeLessThan(3);
    });

    it('emits each segment as a closed outline rather than a centreline', () => {
      for (const stem of generatePlant(form(), 5).stems) {
        expect(stem.commands.at(0)?.c).toBe('M');
        expect(stem.commands.at(-1)?.c).toBe('Z');
        // A ribbon needs both sides plus the closing command.
        expect(stem.commands.length).toBeGreaterThan(10);
      }
    });
  });

  describe('habits', () => {
    it.each(PLANT_HABITS)('%s produces geometry', (habit) => {
      const geometry = generatePlant(form({ habit, leafDensity: 0.8 }), 17);

      expect(geometry.stems.length).toBeGreaterThan(0);
      expect(geometry.leaves.length).toBeGreaterThan(0);
    });

    it('gives every habit a distinct silhouette', () => {
      // Same form, same seed, only the habit differs: any two producing the
      // same outline would mean one of them is not really implemented.
      const shapes = PLANT_HABITS.map((habit) =>
        JSON.stringify(generatePlant(form({ habit }), 3).stems.map((stem) => stem.commands)),
      );

      expect(new Set(shapes).size).toBe(PLANT_HABITS.length);
    });

    it('does not branch for rosette or tuft', () => {
      for (const habit of ['rosette', 'tuft'] as const) {
        const depths = generatePlant(form({ habit, branchDepth: 5 }), 9).stems.map(
          (stem) => stem.depth,
        );

        // Depth 1 exists on a rosette for its leaf stubs, but nothing recurses.
        expect(Math.max(...depths)).toBeLessThanOrEqual(1);
      }
    });

    it('runs a tuft out into many blades from one point', () => {
      const geometry = generatePlant(form({ habit: 'tuft' }), 2);

      expect(geometry.stems.length).toBeGreaterThanOrEqual(8);
      expect(geometry.stems.every((stem) => stem.depth === 0)).toBe(true);
    });

    it('gathers a rosette its foliage at the base, unlike an upright plant', () => {
      /**
       * Not an aspect-ratio test: a rosette in flower is genuinely taller than
       * it is wide, because the scape carries the bloom well clear of the
       * leaves. What distinguishes the habit is *where the foliage sits* — all
       * of it in a low band, with bare stalk above.
       *
       * Canvas space has y increasing downwards, so a larger mean y is lower.
       */
      const meanLeafHeight = (habit: 'rosette' | 'upright'): number => {
        const geometry = generatePlant(form({ habit, flowerType: 'single', leafDensity: 1 }), 5);
        const ys = geometry.leaves.flatMap((leaf) =>
          commandPoints(leaf.commands).map((point) => point.y),
        );

        return ys.reduce((total, y) => total + y, 0) / ys.length;
      };

      expect(meanLeafHeight('rosette')).toBeGreaterThan(meanLeafHeight('upright'));
    });

    it('leaves a rosette scape bare', () => {
      /**
       * The habit's whole point is foliage at ground level and a stalk rising
       * clear of it. Leafing the scape silently turns a rosette back into an
       * ordinary upright plant, and nothing else in the suite would notice.
       */
      const geometry = generatePlant(
        form({ habit: 'rosette', flowerType: 'single', leafDensity: 1 }),
        5,
      );

      const scape = geometry.stems.find((stem) => stem.depth === 0);

      expect(scape).toBeDefined();

      // Every leaf must sit below the top of the scape — none up its length.
      const scapeTop = Math.min(...commandPoints(scape!.commands).map((point) => point.y));
      const leafTops = geometry.leaves.map((leaf) =>
        Math.min(...commandPoints(leaf.commands).map((point) => point.y)),
      );

      expect(Math.min(...leafTops)).toBeGreaterThan(scapeTop);
    });

    it('gives a flowering rosette a scape but a sterile one none', () => {
      const flowering = generatePlant(form({ habit: 'rosette', flowerType: 'single' }), 6);
      const sterile = generatePlant(form({ habit: 'rosette', flowerType: 'none' }), 6);

      expect(flowering.flowers.length).toBeGreaterThan(0);
      expect(flowering.stems.length).toBe(sterile.stems.length + 1);
    });

    it('leans a trailing plant well off vertical', () => {
      const upright = generatePlant(form({ habit: 'upright', leafDensity: 0 }), 8);
      const trailing = generatePlant(form({ habit: 'trailing', leafDensity: 0 }), 8);

      const aspect = (g: ReturnType<typeof generatePlant>): number => {
        const points = allPoints(g);
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);

        return (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
      };

      // Trailing spends its length sideways, so it is the wider of the two.
      expect(aspect(trailing)).toBeGreaterThan(aspect(upright));
    });
  });

  describe('roots', () => {
    it('draws none unless asked', () => {
      expect(generatePlant(form({ roots: false }), 13).roots).toHaveLength(0);
    });

    it('draws a branching tuft when asked', () => {
      const roots = generatePlant(form({ roots: true }), 13).roots;

      expect(roots.length).toBeGreaterThanOrEqual(8);
      expect(roots.every((root) => root.kind === 'root')).toBe(true);
      // Primaries and rootlets: two generations.
      expect(new Set(roots.map((root) => root.depth))).toStrictEqual(new Set([0, 1]));
    });

    it('draws roots finer than the main stem', () => {
      const geometry = generatePlant(form({ roots: true }), 13);
      const thickestStem = Math.max(...geometry.stems.map((stem) => stem.width));
      const thickestRoot = Math.max(...geometry.roots.map((root) => root.width));

      expect(thickestRoot).toBeLessThan(thickestStem);
    });

    it('keeps roots out of the stems array', () => {
      const geometry = generatePlant(form({ roots: true }), 13);

      expect(geometry.stems.every((stem) => stem.kind === 'stem')).toBe(true);
    });
  });

  describe('leaves', () => {
    it('gives every leaf veins to draw', () => {
      for (const leaf of generatePlant(form({ leafDensity: 1 }), 23).leaves) {
        expect(leaf.midrib.length).toBeGreaterThan(0);
      }
    });

    it('gives a palmate leaf one rib per lobe', () => {
      const three = generatePlant(form({ leafShape: 'palmate', lobeCount: 3, leafDensity: 1 }), 4);
      const nine = generatePlant(form({ leafShape: 'palmate', lobeCount: 9, leafDensity: 1 }), 4);

      const ribs = (g: ReturnType<typeof generatePlant>): number =>
        g.leaves[0]?.midrib.filter((command) => command.c === 'M').length ?? 0;

      expect(ribs(three)).toBe(3);
      expect(ribs(nine)).toBe(9);
    });

    it('changes a lobed outline when the lobe count changes', () => {
      const few = generatePlant(form({ leafShape: 'lobed', lobeCount: 3, leafDensity: 1 }), 4);
      const many = generatePlant(form({ leafShape: 'lobed', lobeCount: 9, leafDensity: 1 }), 4);

      expect(few.leaves[0]?.commands.length).not.toBe(many.leaves[0]?.commands.length);
    });

    it('places opposite leaves in pairs and alternate ones singly', () => {
      const alternate = generatePlant(form({ leafArrangement: 'alternate', leafDensity: 1 }), 15);
      const opposite = generatePlant(form({ leafArrangement: 'opposite', leafDensity: 1 }), 15);

      expect(opposite.leaves.length % 2).toBe(0);
      expect(opposite.leaves).not.toStrictEqual(alternate.leaves);
    });

    it('draws leaves smaller towards the branch tips', () => {
      /**
       * A trend, not a per-leaf ordering. Each leaf also carries a random size
       * jitter, so asserting that the very last leaf is smaller than the very
       * first would be testing the noise. Averaging the lower half of the stem
       * against the upper half measures the gradient itself, and running
       * several seeds stops one unlucky draw deciding the result.
       */
      const span = (leaf: { commands: readonly PathCommand[] }): number => {
        const points = commandPoints(leaf.commands);
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);

        return Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      };

      const mean = (values: number[]): number =>
        values.reduce((total, value) => total + value, 0) / values.length;

      for (const seed of [61, 62, 63, 64]) {
        const spans = generatePlant(
          form({ branchDepth: 0, leafDensity: 1, leafArrangement: 'alternate' }),
          seed,
        ).leaves.map(span);

        const half = Math.floor(spans.length / 2);

        expect(mean(spans.slice(half))).toBeLessThan(mean(spans.slice(0, half)));
      }
    });
  });

  describe('flowers', () => {
    it('draws petals as outlines rather than discs', () => {
      const flower = generatePlant(form({ flowerType: 'single' }), 7).flowers[0];

      expect(flower).toBeDefined();

      for (const petal of flower!.petals) {
        expect(petal.at(0)?.c).toBe('M');
        expect(petal.at(-1)?.c).toBe('Z');
      }
    });

    it.each([4, 5, 6, 7, 8])('gives a single flower %i petals', (petalCount) => {
      const geometry = generatePlant(form({ flowerType: 'single', petalCount }), 7);

      expect(geometry.flowers[0]?.petals).toHaveLength(petalCount);
    });

    it('grades a spike from open flowers at the base to buds at the tip', () => {
      const spike = generatePlant(form({ flowerType: 'spike' }), 19).flowers;

      expect(spike.length).toBeGreaterThan(4);

      const reach = (index: number): number => {
        const flower = spike[index];

        if (flower === undefined) return 0;

        const points = flower.petals.flatMap((petal) => commandPoints(petal));

        return Math.max(
          ...points.map((p) => Math.hypot(p.x - flower.center.x, p.y - flower.center.y)),
        );
      };

      // Flowers are emitted base-first, so the first must out-reach the last.
      expect(reach(0)).toBeGreaterThan(reach(spike.length - 1));
    });
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
