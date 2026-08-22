import { pointOnBranch, type BranchNode } from './branch';
import { closePath, mapCommands, moveTo, quadTo } from './path';
import { clamp, jitter, randomBetween, type Rng } from './prng';
import type { FlowerMark, PathCommand, PlantForm, Point } from './types';

/**
 * Flower placement.
 *
 * Each arrangement answers one question — *where on the skeleton do flowers
 * go?* — and they are named after the real inflorescences they imitate rather
 * than after shapes.
 */

/** Flower radius in plant units at `flowerSize` 1. */
const BASE_FLOWER_RADIUS = 3.4;

/**
 * One petal, in petal space: a narrow blade from the origin out to `(0, 1)`.
 *
 * Narrow and pointed rather than round. Overlapping blades are what a botanical
 * plate draws and what lets a viewer count the petals; discs arranged in a ring
 * read as a cartoon daisy at any size.
 *
 * @param width Half-width at the petal's widest, as a fraction of its length.
 */
function petalOutline(width: number): PathCommand[] {
  return [
    moveTo(0, 0),
    quadTo({ x: width, y: 0.42 }, { x: 0, y: 1 }),
    quadTo({ x: -width, y: 0.42 }, { x: 0, y: 0 }),
    closePath,
  ];
}

/**
 * Builds one flower: a ring of petals about a filled centre.
 *
 * @param openness 0 is a tight bud — short, narrow petals barely clear of the
 *   centre — and 1 is fully open. Only `spike` uses anything but 1.
 */
function makeFlower(
  center: Point,
  radius: number,
  petalCount: number,
  openness: number,
  rng: Rng,
): FlowerMark {
  const count = clamp(Math.round(petalCount), 4, 8);
  // A random phase stops every flower on the plant pointing the same way.
  const phase = randomBetween(rng, 0, Math.PI * 2);

  const petalLength = radius * (0.45 + openness * 0.55);
  const petalWidth = 0.26 + openness * 0.16;
  const outline = petalOutline(petalWidth);

  const petals: PathCommand[][] = [];

  for (let i = 0; i < count; i += 1) {
    const angle = phase + (i / count) * Math.PI * 2 + randomBetween(rng, -0.05, 0.05);
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const length = petalLength * jitter(rng, 0.1);

    petals.push(
      mapCommands(outline, (point) => ({
        x: center.x + (point.x * length * cos + point.y * length * sin),
        y: center.y + (-point.x * length * sin + point.y * length * cos),
      })),
    );
  }

  return {
    kind: 'flower',
    center,
    // A bud is nearly all centre; an open flower shows a small disc.
    coreRadius: radius * (0.32 - openness * 0.14),
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

  const radius = BASE_FLOWER_RADIUS * form.flowerSize;
  const petals = form.petalCount;
  const terminals = nodes.filter((node) => node.isTerminal);

  /**
   * The highest tip, which is where a solitary flower belongs. Plant space has
   * +y up, so "highest" is the largest y. Falls back to the first node on a
   * degenerate skeleton.
   */
  const crown =
    terminals.length > 0
      ? terminals.reduce((best, node) => (node.end.y > best.end.y ? node : best))
      : nodes[0];

  if (crown === undefined) return [];

  switch (form.flowerType) {
    /** One bloom at the crown, fully open — the specimen's showpiece. */
    case 'single':
      return [makeFlower(crown.end, radius, petals, 1, rng)];

    /** A loose head of blooms, one at each growing tip. */
    case 'cluster':
      return terminals.map((node) => makeFlower(node.end, radius * 0.6, petals, 0.9, rng));

    /**
     * An umbel: stalks of equal length radiating from one point, so the flowers
     * sit in a shallow dome. Modelled as a ring about the crown rather than by
     * growing real pedicels — at this scale the silhouette is what reads.
     */
    case 'umbel': {
      const count = 7;
      const spread = radius * 2.4;
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
            radius * 0.46,
            petals,
            0.85,
            rng,
          ),
        );
      }

      return flowers;
    }

    /**
     * A spike: stalkless flowers set directly along the upper main stem.
     *
     * A real spike opens from the bottom up, so the lowest flowers are large and
     * open and the tip is still in tight bud. Both size and `openness` grade
     * along its length, which is what makes it read as a spike rather than as a
     * column of identical dots.
     */
    case 'spike': {
      const axis = nodes.find((node) => node.depth === 0) ?? crown;
      const count = 9;
      const flowers: FlowerMark[] = [];

      for (let i = 0; i < count; i += 1) {
        const along = i / (count - 1);
        const t = 0.45 + along * 0.55;
        const openness = Math.max(0, 1 - along * 1.15);

        flowers.push(
          makeFlower(
            pointOnBranch(axis, t),
            radius * (0.5 - along * 0.18) * jitter(rng, 0.12),
            petals,
            openness,
            rng,
          ),
        );
      }

      return flowers;
    }
  }
}
