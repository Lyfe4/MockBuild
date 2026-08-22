import { angleOnBranch, pointOnBranch, type BranchNode } from './branch';
import { closePath, curveTo, lineTo, mapCommands, moveTo, quadTo } from './path';
import { clamp, jitter, randomBetween, type Rng } from './prng';
import type { LeafMark, LeafShape, PathCommand, PlantForm, Point } from './types';

/**
 * Leaf outlines, their veins, and their placement along the branches.
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

interface LeafGeometry {
  outline: PathCommand[];
  /** Veins, as one or more sub-paths. Stroked over the blade. */
  veins: PathCommand[];
}

/** The central vein, bowed very slightly so it is not a dead straight line. */
function midribOnly(reach = 0.92): PathCommand[] {
  return [moveTo(0, 0.04), quadTo({ x: 0.03, y: reach * 0.55 }, { x: 0, y: reach })];
}

/**
 * A closed outline in leaf space, plus its veins: origin at the petiole, tip at
 * `(0, 1)`, width roughly ±0.5 about the midrib.
 */
function leafGeometry(shape: LeafShape, lobeCount: number): LeafGeometry {
  switch (shape) {
    /** Narrow, tapering to a point at both ends — a willow leaf. */
    case 'lanceolate':
      return {
        outline: [
          moveTo(0, 0),
          quadTo({ x: 0.26, y: 0.35 }, { x: 0, y: 1 }),
          quadTo({ x: -0.26, y: 0.35 }, { x: 0, y: 0 }),
          closePath,
        ],
        veins: midribOnly(),
      };

    /** Broad and egg-shaped, widest below the middle. */
    case 'ovate':
      return {
        outline: [
          moveTo(0, 0),
          curveTo({ x: 0.52, y: 0.2 }, { x: 0.44, y: 0.78 }, { x: 0, y: 1 }),
          curveTo({ x: -0.44, y: 0.78 }, { x: -0.52, y: 0.2 }, { x: 0, y: 0 }),
          closePath,
        ],
        veins: midribOnly(),
      };

    /** A thin blade with near-parallel sides — grasses and sedges. */
    case 'linear':
      return {
        outline: [
          moveTo(0, 0),
          quadTo({ x: 0.12, y: 0.5 }, { x: 0.05, y: 1 }),
          quadTo({ x: 0, y: 1.04 }, { x: -0.05, y: 1 }),
          quadTo({ x: -0.12, y: 0.5 }, { x: 0, y: 0 }),
          closePath,
        ],
        veins: midribOnly(0.96),
      };

    /**
     * Lobes radiating from the petiole, built as a fan of pointed lobes rather
     * than a scalloped outline — that is what distinguishes a palmate leaf from
     * a merely wavy one at small sizes. Each lobe gets its own rib.
     */
    case 'palmate': {
      const lobes = clamp(Math.round(lobeCount), 3, 9);
      const outline: PathCommand[] = [moveTo(0, 0)];
      const veins: PathCommand[] = [];

      for (let i = 0; i < lobes; i += 1) {
        const spread = (i / (lobes - 1)) * 2 - 1;
        const angle = spread * 0.85;
        // The middle lobe is longest, the outer ones progressively shorter.
        const reach = 1 - Math.abs(spread) * 0.32;
        const tip = { x: Math.sin(angle) * reach, y: Math.cos(angle) * reach };
        const notch = { x: Math.sin(angle) * 0.22, y: Math.cos(angle) * 0.22 };

        outline.push(quadTo({ x: tip.x * 0.45, y: tip.y * 0.7 }, tip), lineTo(notch.x, notch.y));
        veins.push(moveTo(0, 0.04), lineTo(tip.x * 0.86, tip.y * 0.86));
      }

      outline.push(closePath);

      return { outline, veins };
    }

    /**
     * An entire blade with a wavy, indented margin — oak-like. The lobe count
     * sets how many indentations run up each side.
     */
    case 'lobed': {
      const lobes = clamp(Math.round(lobeCount), 3, 9);
      const perSide = Math.max(2, Math.round(lobes / 2));
      const right: PathCommand[] = [];
      const left: PathCommand[] = [];

      for (let i = 0; i < perSide; i += 1) {
        const from = i / perSide;
        const to = (i + 1) / perSide;
        // Wider at the middle of the blade, tapering to the tip.
        const bulge = 0.44 * Math.sin(Math.PI * ((from + to) / 2) * 0.9 + 0.35);
        const waist = bulge * 0.62;

        right.push(quadTo({ x: bulge, y: from + (to - from) * 0.35 }, { x: waist, y: to }));
        left.unshift(quadTo({ x: -bulge, y: to - (to - from) * 0.35 }, { x: -waist, y: from }));
      }

      return {
        outline: [
          moveTo(0, 0),
          ...right,
          quadTo({ x: 0.18, y: 0.98 }, { x: 0, y: 1 }),
          quadTo({ x: -0.18, y: 0.98 }, { x: -0.24, y: 1 - 1 / perSide }),
          ...left,
          closePath,
        ],
        veins: midribOnly(),
      };
    }
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
 * Two things make the result read as drawn rather than scattered. Leaves
 * **diminish towards the tips** — both up a single branch and outwards through
 * the generations — which is how real foliage grades and is most of what stops
 * a procedural plant looking like clip art. And each leaf carries a small
 * independent rotation, so a row of them is not a rubber stamp repeated.
 *
 * @param nodes The skeleton from `growBranches`, in plant space.
 * @param rng Consumed in branch order, then leaf order within each branch.
 */
export function placeLeaves(nodes: readonly BranchNode[], form: PlantForm, rng: Rng): LeafMark[] {
  if (form.leafDensity <= 0) return [];

  const { outline, veins } = leafGeometry(form.leafShape, form.lobeCount);
  const opposite = form.leafArrangement === 'opposite';
  const leaves: LeafMark[] = [];

  for (const node of nodes) {
    // A rosette's scape is bare; see BranchNode.bearsLeaves.
    if (!node.bearsLeaves) continue;

    const count = leafCountFor(form, node.depth);
    // Opposite leaves come in pairs, so half as many stations up the stem.
    const stations = opposite ? Math.max(1, Math.round(count / 2)) : count;

    for (let i = 0; i < stations; i += 1) {
      // Spread across the upper 75% of the branch.
      const t = 0.25 + (stations === 1 ? 0.4 : (i / stations) * 0.75);
      const origin = pointOnBranch(node, t);
      const branchAngle = angleOnBranch(node, t);

      /**
       * Leaves shrink towards the growing point: `t` handles it along a branch,
       * `depth` handles it outwards through the tree. The per-leaf jitter is
       * kept well below the taper so the gradient stays legible — random
       * variation larger than the trend it sits on just reads as noise.
       */
      const tipTaper = 1 - t * 0.35;
      const depthTaper = Math.max(0.55, 1 - node.depth * 0.1);
      const size = BASE_LEAF_LENGTH * form.height * tipTaper * depthTaper * jitter(rng, 0.16);

      // How far the leaf stands off the stem, plus a small independent tilt.
      const splay = randomBetween(rng, 0.75, 1.15);
      const tilt = randomBetween(rng, -0.14, 0.14);

      const sides = opposite ? [1, -1] : [i % 2 === 0 ? 1 : -1];

      for (const side of sides) {
        const angle = branchAngle + side * splay + tilt;
        const transform = (point: Point): Point => placeLeafPoint(point, angle, size, origin);

        leaves.push({
          kind: 'leaf',
          shape: form.leafShape,
          commands: mapCommands(outline, transform),
          midrib: mapCommands(veins, transform),
        });
      }
    }
  }

  return leaves;
}
