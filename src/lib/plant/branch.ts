import { cubicAngleAt, cubicPointAt } from './path';
import { clamp, jitter, randomBetween, type Rng } from './prng';
import { MAX_BRANCH_NODES, type PlantForm, type Point } from './types';

/**
 * Recursive branching.
 *
 * Produces the plant's skeleton in plant space (+y up, origin at the base). No
 * path commands and no canvas coordinates — `generate.ts` owns that conversion,
 * and `leaf.ts` and `flower.ts` need the nodes in this richer form so they can
 * hang things off a curve at a given parameter.
 */

/**
 * One segment of stem, as a cubic Bézier.
 *
 * Carries more than the curve because its dependants need it: leaves need to
 * sit along it at a parameter, flowers need to know which nodes are tips, and
 * the renderer needs a width that tapers convincingly.
 */
export interface BranchNode {
  readonly start: Point;
  readonly control1: Point;
  readonly control2: Point;
  readonly end: Point;
  /** 0 for the main stem, incrementing outwards. */
  readonly depth: number;
  readonly width: number;
  /** True when nothing grows on from here — where flowers go. */
  readonly isTerminal: boolean;
}

/** Length of the main stem in plant units, before `height` scales it. */
const BASE_LENGTH = 62;

/** How much shorter each generation is than its parent. */
const LENGTH_DECAY = 0.72;

/** How much thinner each generation is than its parent. */
const WIDTH_DECAY = 0.68;

/** Stroke width of the main stem, in plant units. */
const BASE_WIDTH = 3.2;

/** Fraction by which a branch's angle and length are randomised. */
const ANGLE_JITTER = 0.35;
const LENGTH_JITTER = 0.18;

/** A point on the node's curve at parameter `t`. */
export function pointOnBranch(node: BranchNode, t: number): Point {
  return cubicPointAt(node.start, node.control1, node.control2, node.end, t);
}

/** The growth direction along the node's curve at parameter `t`, in radians. */
export function angleOnBranch(node: BranchNode, t: number): number {
  return cubicAngleAt(node.start, node.control1, node.control2, node.end, t);
}

/**
 * How many children a node at `depth` produces.
 *
 * Tapering rather than constant: a fixed fan-out is what makes procedural trees
 * read as fractal rather than botanical, and it makes the node count explode.
 * Real growth puts most of its branching low down.
 */
function childCountAt(form: PlantForm, depth: number): number {
  return Math.max(1, Math.round(form.branchCount - depth));
}

/**
 * Builds one segment, bowed by `stemCurve`.
 *
 * The control points sit at a third and two thirds along the segment, pushed
 * sideways along the segment's normal. Offsetting proportionally to length
 * keeps the bow looking consistent as segments get shorter.
 */
function makeNode(
  start: Point,
  angle: number,
  length: number,
  width: number,
  depth: number,
  curve: number,
  isTerminal: boolean,
): BranchNode {
  const dx = Math.sin(angle);
  const dy = Math.cos(angle);

  const end = { x: start.x + dx * length, y: start.y + dy * length };

  // Normal to the growth direction, in plant space.
  const nx = dy;
  const ny = -dx;
  const bow = curve * length * 0.5;

  return {
    start,
    control1: {
      x: start.x + dx * length * 0.33 + nx * bow * 0.5,
      y: start.y + dy * length * 0.33 + ny * bow * 0.5,
    },
    control2: {
      x: start.x + dx * length * 0.66 + nx * bow,
      y: start.y + dy * length * 0.66 + ny * bow,
    },
    end,
    depth,
    width,
    isTerminal,
  };
}

/**
 * Grows the whole skeleton, depth-first from the base.
 *
 * @param form Habit parameters. Assumed already clamped by `generate`.
 * @param rng Seeded source; consumed in a fixed order so output is reproducible.
 */
export function growBranches(form: PlantForm, rng: Rng): BranchNode[] {
  const nodes: BranchNode[] = [];
  const maxDepth = clamp(Math.round(form.branchDepth), 0, 5);
  const baseAngleRadians = (form.branchAngle * Math.PI) / 180;

  /**
   * Recursion is explicit rather than mapped so the RNG is consumed in a strict
   * depth-first order. Any change to the traversal order changes every drawing,
   * which is why the order is part of the contract and not an implementation
   * detail.
   */
  function grow(start: Point, angle: number, length: number, width: number, depth: number): void {
    if (nodes.length >= MAX_BRANCH_NODES) return;

    const isTerminal = depth >= maxDepth;
    const node = makeNode(start, angle, length, width, depth, form.stemCurve, isTerminal);

    nodes.push(node);

    if (isTerminal) return;

    const children = childCountAt(form, depth);

    for (let i = 0; i < children; i += 1) {
      /**
       * Children fan symmetrically around the parent's direction: with two
       * children, one goes left and one right. `spread` is -1..1 across the fan
       * and is 0 for a lone child, which keeps single-child chains growing
       * roughly straight instead of drifting to one side.
       */
      const spread = children === 1 ? 0 : (i / (children - 1)) * 2 - 1;
      const childAngle = angle + spread * baseAngleRadians * jitter(rng, ANGLE_JITTER);
      const childLength = length * LENGTH_DECAY * jitter(rng, LENGTH_JITTER);

      grow(node.end, childAngle, childLength, width * WIDTH_DECAY, depth + 1);
    }
  }

  // A touch of lean off vertical so no two plants stand to attention.
  const initialAngle = randomBetween(rng, -0.08, 0.08);

  grow({ x: 0, y: 0 }, initialAngle, BASE_LENGTH * form.height, BASE_WIDTH, 0);

  return nodes;
}
