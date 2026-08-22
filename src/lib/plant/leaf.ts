import { angleOnBranch, pointOnBranch, type BranchNode } from './branch';
import { closePath, curveTo, lineTo, mapCommands, moveTo, quadTo } from './path';
import { jitter, randomBetween, type Rng } from './prng';
import type { LeafMark, LeafShape, PathCommand, PlantForm, Point } from './types';

/**
 * Leaf outlines and their placement along the branches.
 *
 * Each shape is authored once in **leaf space** — a unit outline growing along
 * +y from an origin at the petiole — then rotated, scaled and translated onto a
 * branch. Keeping the authoring space separate is what makes the five shapes
 * comparable and easy to tweak in isolation.
 */

/** Leaf length in plant units at scale 1, before per-leaf jitter. */
const BASE_LEAF_LENGTH = 13;

/** The most leaves the generator will hang on a single branch. */
const MAX_LEAVES_PER_BRANCH = 6;

/**
 * A closed outline in leaf space: origin at the petiole, tip at `(0, 1)`,
 * width roughly ±`halfWidth` about the midrib.
 */
function leafOutline(shape: LeafShape): PathCommand[] {
  switch (shape) {
    /** Narrow, tapering to a point at both ends — a willow leaf. */
    case 'lanceolate':
      return [
        moveTo(0, 0),
        quadTo({ x: 0.26, y: 0.35 }, { x: 0, y: 1 }),
        quadTo({ x: -0.26, y: 0.35 }, { x: 0, y: 0 }),
        closePath,
      ];

    /** Broad and egg-shaped, widest below the middle. */
    case 'ovate':
      return [
        moveTo(0, 0),
        curveTo({ x: 0.52, y: 0.2 }, { x: 0.44, y: 0.78 }, { x: 0, y: 1 }),
        curveTo({ x: -0.44, y: 0.78 }, { x: -0.52, y: 0.2 }, { x: 0, y: 0 }),
        closePath,
      ];

    /** A thin blade with near-parallel sides — grasses and sedges. */
    case 'linear':
      return [
        moveTo(0, 0),
        quadTo({ x: 0.12, y: 0.5 }, { x: 0.05, y: 1 }),
        quadTo({ x: 0, y: 1.04 }, { x: -0.05, y: 1 }),
        quadTo({ x: -0.12, y: 0.5 }, { x: 0, y: 0 }),
        closePath,
      ];

    /**
     * Five lobes radiating from the petiole. Built as a fan of pointed lobes
     * rather than a scalloped outline, which is what distinguishes a palmate
     * leaf from a merely wavy one at small sizes.
     */
    case 'palmate': {
      const commands: PathCommand[] = [moveTo(0, 0)];
      const lobes = 5;

      for (let i = 0; i < lobes; i += 1) {
        const spread = (i / (lobes - 1)) * 2 - 1;
        const angle = spread * 0.85;
        // The middle lobe is longest, the outer ones progressively shorter.
        const reach = 1 - Math.abs(spread) * 0.32;
        const tip = { x: Math.sin(angle) * reach, y: Math.cos(angle) * reach };
        const notch = { x: Math.sin(angle) * 0.22, y: Math.cos(angle) * 0.22 };

        commands.push(quadTo({ x: tip.x * 0.45, y: tip.y * 0.7 }, tip), lineTo(notch.x, notch.y));
      }

      commands.push(closePath);

      return commands;
    }

    /** An ovate blade with a wavy, indented margin — oak-like. */
    case 'lobed':
      return [
        moveTo(0, 0),
        quadTo({ x: 0.42, y: 0.1 }, { x: 0.3, y: 0.3 }),
        quadTo({ x: 0.52, y: 0.42 }, { x: 0.32, y: 0.62 }),
        quadTo({ x: 0.44, y: 0.82 }, { x: 0, y: 1 }),
        quadTo({ x: -0.44, y: 0.82 }, { x: -0.32, y: 0.62 }),
        quadTo({ x: -0.52, y: 0.42 }, { x: -0.3, y: 0.3 }),
        quadTo({ x: -0.42, y: 0.1 }, { x: 0, y: 0 }),
        closePath,
      ];
  }
}

/** Rotates by `angle` (from +y, clockwise), scales, then translates. */
function placeLeafPoint(point: Point, angle: number, size: number, origin: Point): Point {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const x = point.x * size;
  const y = point.y * size;

  return {
    x: origin.x + x * cos + y * sin,
    y: origin.y - x * sin + y * cos,
  };
}

/**
 * How many leaves sit on a branch of the given depth.
 *
 * Deeper twigs carry fewer, both because they are shorter and because loading
 * every twig equally turns the silhouette into a solid mass.
 */
function leafCountFor(form: PlantForm, depth: number): number {
  const taper = Math.max(0.25, 1 - depth * 0.22);

  return Math.round(form.leafDensity * MAX_LEAVES_PER_BRANCH * taper);
}

/**
 * Hangs leaves along every branch.
 *
 * Leaves alternate sides as they ascend — the commonest phyllotaxy and the one
 * that reads as deliberate rather than scattered. Placement starts a little way
 * up each branch so leaves do not bunch at the junctions.
 *
 * @param nodes The skeleton from `growBranches`, in plant space.
 * @param rng Consumed in branch order, then leaf order within each branch.
 */
export function placeLeaves(nodes: readonly BranchNode[], form: PlantForm, rng: Rng): LeafMark[] {
  if (form.leafDensity <= 0) return [];

  const outline = leafOutline(form.leafShape);
  const leaves: LeafMark[] = [];

  for (const node of nodes) {
    const count = leafCountFor(form, node.depth);

    for (let i = 0; i < count; i += 1) {
      // Spread across the upper 75% of the branch.
      const t = 0.25 + (count === 1 ? 0.4 : (i / count) * 0.75);
      const origin = pointOnBranch(node, t);
      const branchAngle = angleOnBranch(node, t);

      // Alternate sides, splaying roughly 60° off the stem.
      const side = i % 2 === 0 ? 1 : -1;
      const splay = side * randomBetween(rng, 0.75, 1.15);
      const size = BASE_LEAF_LENGTH * form.height * jitter(rng, 0.22);

      leaves.push({
        kind: 'leaf',
        shape: form.leafShape,
        commands: mapCommands(outline, (point) =>
          placeLeafPoint(point, branchAngle + splay, size, origin),
        ),
      });
    }
  }

  return leaves;
}
