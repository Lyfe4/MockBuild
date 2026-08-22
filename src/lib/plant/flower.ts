import { pointOnBranch, type BranchNode } from './branch';
import { jitter, randomBetween, type Rng } from './prng';
import type { FlowerMark, PlantForm, Point } from './types';

/**
 * Flower placement.
 *
 * Each arrangement answers one question — *where on the skeleton do flowers
 * go?* — and they differ enough to be worth naming after the real
 * inflorescences they imitate rather than after shapes.
 */

/** Petal radius in plant units at `flowerSize` 1. */
const BASE_PETAL_RADIUS = 2.6;

/** How many petals ring a flower's core. */
const PETAL_COUNT = 5;

/** Builds one flower: a ring of petals about a centre. */
function makeFlower(center: Point, size: number, rng: Rng): FlowerMark {
  const petalRadius = BASE_PETAL_RADIUS * size * jitter(rng, 0.15);
  // Petals sit just off-centre so the core stays visible between them.
  const ringRadius = petalRadius * 1.05;
  // A random phase stops every flower pointing the same way.
  const phase = randomBetween(rng, 0, Math.PI * 2);

  const petals: Point[] = [];

  for (let i = 0; i < PETAL_COUNT; i += 1) {
    const angle = phase + (i / PETAL_COUNT) * Math.PI * 2;

    petals.push({
      x: center.x + Math.sin(angle) * ringRadius,
      y: center.y + Math.cos(angle) * ringRadius,
    });
  }

  return {
    kind: 'flower',
    center,
    coreRadius: petalRadius * 0.55,
    petalRadius,
    petals,
  };
}

/**
 * Places flowers according to `form.flowerType`.
 *
 * @param nodes The skeleton from `growBranches`, in plant space.
 * @param rng Consumed in a fixed order per arrangement.
 */
export function placeFlowers(
  nodes: readonly BranchNode[],
  form: PlantForm,
  rng: Rng,
): FlowerMark[] {
  if (form.flowerType === 'none' || nodes.length === 0) return [];

  const size = form.flowerSize;
  const terminals = nodes.filter((node) => node.isTerminal);

  /**
   * The highest tip, which is where a solitary flower belongs. Plant space has
   * +y up, so "highest" is the largest y. Falls back to the base node on a
   * degenerate skeleton (branchDepth 0 leaves a single non-terminal stem).
   */
  const crown =
    terminals.length > 0
      ? terminals.reduce((best, node) => (node.end.y > best.end.y ? node : best))
      : nodes[0];

  if (crown === undefined) return [];

  switch (form.flowerType) {
    /** One bloom at the crown. */
    case 'single':
      return [makeFlower(crown.end, size, rng)];

    /** A loose head of blooms, one at each tip. */
    case 'cluster':
      return terminals.map((node) => makeFlower(node.end, size * 0.8, rng));

    /**
     * An umbel: stalks of equal length radiating from one point, so the flowers
     * sit in a shallow dome. Modelled as a ring about the crown rather than by
     * growing real pedicels — at this scale the silhouette is what reads.
     */
    case 'umbel': {
      const count = 7;
      const spread = BASE_PETAL_RADIUS * size * 3.4;
      const flowers: FlowerMark[] = [];

      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2;

        flowers.push(
          makeFlower(
            {
              x: crown.end.x + Math.sin(angle) * spread,
              // Flattened vertically: an umbel is a dome seen side-on.
              y: crown.end.y + Math.cos(angle) * spread * 0.42,
            },
            size * 0.62,
            rng,
          ),
        );
      }

      return flowers;
    }

    /**
     * A spike: stalkless flowers set directly along the upper main stem,
     * smallest at the tip. Uses the depth-0 node so the spike follows the
     * plant's central axis rather than an outer branch.
     */
    case 'spike': {
      const axis = nodes.find((node) => node.depth === 0) ?? crown;
      const count = 9;
      const flowers: FlowerMark[] = [];

      for (let i = 0; i < count; i += 1) {
        const t = 0.45 + (i / (count - 1)) * 0.55;
        // Taper towards the tip, the way a spike opens from the bottom up.
        const taper = 1 - (i / (count - 1)) * 0.45;

        flowers.push(makeFlower(pointOnBranch(axis, t), size * 0.5 * taper, rng));
      }

      return flowers;
    }
  }
}
