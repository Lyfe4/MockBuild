import { cubicAngleAt, cubicPointAt } from './path';
import { clamp, jitter, randomBetween, type Rng } from './prng';
import { BASE_TO_TIP_WIDTH_RATIO, MAX_BRANCH_NODES, type PlantForm, type Point } from './types';

/**
 * The plant's skeleton, in plant space (+y up, origin at the base).
 *
 * One growth strategy per habit. They are separate functions rather than one
 * parameterised routine because a rosette is not an upright plant with
 * different numbers — the topology differs, and collapsing them into a single
 * function with five branches of `if` would obscure all five.
 *
 * No path commands and no canvas coordinates: `generate.ts` owns that
 * conversion, and `leaf.ts` and `flower.ts` need the nodes in this richer form
 * so they can hang things off a curve at a given parameter.
 */

/**
 * One segment of stem, as a cubic Bézier.
 *
 * Carries more than the curve because its dependants need it: leaves sit along
 * it at a parameter, flowers need to know which nodes are tips, and the ribbon
 * builder needs a width at each end.
 */
export interface BranchNode {
  readonly start: Point;
  readonly control1: Point;
  readonly control2: Point;
  readonly end: Point;
  /** 0 for the main stem, incrementing outwards. */
  readonly depth: number;
  /** Width where the segment leaves its parent. */
  readonly width: number;
  /** Width at its far end; the next generation starts here. */
  readonly tipWidth: number;
  /**
   * A growing tip, and so somewhere a flower can form.
   *
   * Not simply "has no children": a rosette's leaf stalks are childless but
   * bear no flowers, since a rosette flowers on its scape.
   */
  readonly isTerminal: boolean;
  /**
   * Whether leaves may be hung along this segment.
   *
   * False for a rosette's flower scape: the defining feature of the habit is
   * that the foliage sits at ground level and the stalk rises bare out of it.
   * Leafing the scape turns a rosette back into an ordinary upright plant.
   */
  readonly bearsLeaves: boolean;
}

/** Length of the main stem in plant units, before `height` scales it. */
const BASE_LENGTH = 62;

/** How much shorter each generation is than its parent. */
const LENGTH_DECAY = 0.72;

/** Stroke width of the main stem, in plant units. */
const BASE_WIDTH = 3.2;

/** Fraction by which a branch's angle and length are randomised. */
const ANGLE_JITTER = 0.35;
const LENGTH_JITTER = 0.18;

/**
 * How far a control point may wander off its ideal position, as a fraction of
 * the segment's length.
 *
 * The point is to stop long segments looking ruler-drawn. Deliberately tiny:
 * at 1.5% of length this is a barely-perceptible waver in a line that is still
 * clearly meant to be straight, not a shaky hand. Anything past about 4% starts
 * to look like a mistake rather than a drawn line.
 */
const LINE_WAVER = 0.015;

/**
 * Per-generation width decay, derived so that base-to-tip lands on
 * `BASE_TO_TIP_WIDTH_RATIO` whatever the tree's depth.
 *
 * Compounding a fixed decay instead would make a deep plant far spindlier at
 * the tips than a shallow one — five generations of 0.68 is a 5x range, well
 * outside what an engraved plate holds.
 */
function widthDecayFor(maxDepth: number): number {
  return Math.pow(1 / BASE_TO_TIP_WIDTH_RATIO, 1 / (maxDepth + 1));
}

/** A point on the node's curve at parameter `t`. */
export function pointOnBranch(node: BranchNode, t: number): Point {
  return cubicPointAt(node.start, node.control1, node.control2, node.end, t);
}

/** The growth direction along the node's curve at parameter `t`, in radians. */
export function angleOnBranch(node: BranchNode, t: number): number {
  return cubicAngleAt(node.start, node.control1, node.control2, node.end, t);
}

interface SegmentSpec {
  start: Point;
  angle: number;
  length: number;
  width: number;
  tipWidth: number;
  depth: number;
  curve: number;
  isTerminal: boolean;
  bearsLeaves?: boolean;
  /**
   * Extra bow applied progressively along the segment rather than evenly, so
   * the far end bends further than the near end. This is what makes an arching
   * stem look like it is yielding to its own weight instead of being bent into
   * an arc.
   */
  droop?: number;
}

/**
 * Builds one segment.
 *
 * Control points sit a third and two thirds along, pushed sideways along the
 * segment's normal by `curve` (and by `droop`, weighted towards the far end),
 * then nudged by a small random amount so the line is not mechanically perfect.
 */
function makeNode(spec: SegmentSpec, rng: Rng): BranchNode {
  const { start, angle, length, width, tipWidth, depth, curve, isTerminal } = spec;
  const droop = spec.droop ?? 0;

  const dx = Math.sin(angle);
  const dy = Math.cos(angle);

  const end = { x: start.x + dx * length, y: start.y + dy * length };

  // Normal to the growth direction, in plant space.
  const nx = dy;
  const ny = -dx;
  const bow = curve * length * 0.5;

  const waver = (): number => randomBetween(rng, -LINE_WAVER, LINE_WAVER) * length;

  return {
    start,
    control1: {
      x: start.x + dx * length * 0.33 + nx * (bow * 0.5 + droop * length * 0.08) + waver(),
      y: start.y + dy * length * 0.33 + ny * (bow * 0.5) - droop * length * 0.05 + waver(),
    },
    control2: {
      x: start.x + dx * length * 0.66 + nx * (bow + droop * length * 0.26) + waver(),
      y: start.y + dy * length * 0.66 + ny * bow - droop * length * 0.22 + waver(),
    },
    end,
    depth,
    width,
    tipWidth,
    isTerminal,
    bearsLeaves: spec.bearsLeaves ?? true,
  };
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

interface GrowthOptions {
  /** Bias added to every child's angle, in radians. Signed. */
  angleBias?: (depth: number) => number;
  /** Droop passed to each segment, by depth. */
  droop?: (depth: number) => number;
}

/**
 * The shared recursive branching used by `upright`, `arching` and `trailing`.
 *
 * Recursion is explicit rather than mapped so the RNG is consumed in a strict
 * depth-first order. Any change to the traversal order changes every drawing in
 * the archive, so the order is part of the contract, not an implementation
 * detail.
 */
function growRecursive(
  form: PlantForm,
  rng: Rng,
  initialAngle: number,
  options: GrowthOptions = {},
): BranchNode[] {
  const nodes: BranchNode[] = [];
  const maxDepth = clamp(Math.round(form.branchDepth), 0, 5);
  const decay = widthDecayFor(maxDepth);
  const baseAngleRadians = (form.branchAngle * Math.PI) / 180;

  function grow(start: Point, angle: number, length: number, width: number, depth: number): void {
    if (nodes.length >= MAX_BRANCH_NODES) return;

    const isTerminal = depth >= maxDepth;
    const tipWidth = width * decay;

    const node = makeNode(
      {
        start,
        angle,
        length,
        width,
        tipWidth,
        depth,
        curve: form.stemCurve,
        isTerminal,
        droop: options.droop?.(depth) ?? 0,
      },
      rng,
    );

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
      const childAngle =
        angle +
        spread * baseAngleRadians * jitter(rng, ANGLE_JITTER) +
        (options.angleBias?.(depth + 1) ?? 0);
      const childLength = length * LENGTH_DECAY * jitter(rng, LENGTH_JITTER);

      grow(node.end, childAngle, childLength, tipWidth, depth + 1);
    }
  }

  grow({ x: 0, y: 0 }, initialAngle, BASE_LENGTH * form.height, BASE_WIDTH, 0);

  return nodes;
}

/** Straight up, branching evenly. The default shrub or herb. */
function growUpright(form: PlantForm, rng: Rng): BranchNode[] {
  // A touch of lean off vertical so no two plants stand to attention.
  return growRecursive(form, rng, randomBetween(rng, -0.08, 0.08));
}

/**
 * Rises, then bends over under its own weight.
 *
 * The bias accumulates with depth and the droop grows with it, so the curve
 * tightens towards the tips — a stem gives way progressively, it does not bend
 * uniformly along its length.
 */
function growArching(form: PlantForm, rng: Rng): BranchNode[] {
  const lean = randomBetween(rng, 0.1, 0.24);

  return growRecursive(form, rng, randomBetween(rng, -0.06, 0.06), {
    angleBias: (depth) => lean * depth,
    droop: (depth) => 0.35 + depth * 0.22,
  });
}

/**
 * A main stem running out diagonally, with side shoots hanging from it.
 *
 * The strong initial angle is the silhouette; the downward bias on the children
 * is what makes them read as pendant rather than as an upright plant tipped over.
 */
function growTrailing(form: PlantForm, rng: Rng): BranchNode[] {
  const direction = rng() < 0.5 ? -1 : 1;
  const lead = direction * randomBetween(rng, 1.0, 1.3);

  return growRecursive(form, rng, lead, {
    // Push every generation further towards straight down (±π/2 from the lead).
    angleBias: (depth) => direction * 0.3 * depth,
    droop: (depth) => 0.4 + depth * 0.15,
  });
}

/**
 * Leaves radiating from a squat base, with an optional flower stalk.
 *
 * The stubs are deliberately tiny: their job is to give `leaf.ts` somewhere to
 * attach and an angle to attach at. What the viewer sees is the leaves, so the
 * stubs are near-invisible and the wide angles are what produce the
 * flat-to-the-ground rosette silhouette.
 */
function growRosette(form: PlantForm, rng: Rng): BranchNode[] {
  const nodes: BranchNode[] = [];
  const decay = widthDecayFor(1);
  const stubCount = clamp(Math.round(4 + form.branchCount), 5, 9);
  const stubLength = BASE_LENGTH * form.height * 0.34;

  for (let i = 0; i < stubCount; i += 1) {
    // Fan across nearly the full half-circle, alternating sides so successive
    // leaves do not overlap.
    const spread = (i / (stubCount - 1)) * 2 - 1;
    const angle = spread * 1.35 * jitter(rng, 0.12);

    nodes.push(
      makeNode(
        {
          start: { x: 0, y: 0 },
          angle,
          length: stubLength * jitter(rng, 0.25),
          width: BASE_WIDTH * 0.5,
          tipWidth: BASE_WIDTH * 0.5 * decay,
          depth: 1,
          curve: form.stemCurve * 0.5,
          isTerminal: false,
          droop: 0.2,
        },
        rng,
      ),
    );
  }

  // A scape: one bare stalk carrying the whole inflorescence well clear of the
  // foliage, which is how a rosette-forming plant actually presents its flowers.
  if (form.flowerType !== 'none') {
    nodes.push(
      makeNode(
        {
          start: { x: 0, y: 0 },
          angle: randomBetween(rng, -0.07, 0.07),
          length: BASE_LENGTH * form.height * 0.9,
          width: BASE_WIDTH * 0.62,
          tipWidth: BASE_WIDTH * 0.62 * decay,
          depth: 0,
          curve: form.stemCurve * 0.4,
          isTerminal: true,
          bearsLeaves: false,
        },
        rng,
      ),
    );
  }

  return nodes;
}

/**
 * A grass tussock: many thin blades from a single point, no branching at all.
 *
 * Every blade is depth 0 and terminal, so the width range stays narrow — blades
 * of grass are all much the same thickness — and any inflorescence sits at the
 * blade tips.
 */
function growTuft(form: PlantForm, rng: Rng): BranchNode[] {
  const nodes: BranchNode[] = [];
  const decay = widthDecayFor(0);
  const bladeCount = clamp(Math.round(7 + form.branchCount * 2.5), 8, 16);
  const spreadAngle = (form.branchAngle * Math.PI) / 180;

  for (let i = 0; i < bladeCount; i += 1) {
    const spread = (i / (bladeCount - 1)) * 2 - 1;
    const angle = spread * spreadAngle * 1.6 * jitter(rng, 0.2);

    // Outer blades are shorter, so the tussock has a rounded crown rather than
    // a flat top.
    const reach = 1 - Math.abs(spread) * 0.3;
    const width = BASE_WIDTH * 0.34;

    nodes.push(
      makeNode(
        {
          start: { x: 0, y: 0 },
          angle,
          length: BASE_LENGTH * form.height * reach * jitter(rng, 0.18),
          width,
          tipWidth: width * decay,
          depth: 0,
          // Blades arch away from the centre; the sign follows the side.
          curve: form.stemCurve + spread * 0.28,
          isTerminal: true,
          droop: 0.3,
        },
        rng,
      ),
    );
  }

  return nodes;
}

/** Grows the skeleton for the form's habit. */
export function growBranches(form: PlantForm, rng: Rng): BranchNode[] {
  switch (form.habit) {
    case 'upright':
      return growUpright(form, rng);
    case 'arching':
      return growArching(form, rng);
    case 'rosette':
      return growRosette(form, rng);
    case 'tuft':
      return growTuft(form, rng);
    case 'trailing':
      return growTrailing(form, rng);
  }
}

/**
 * A small tuft of roots below the base.
 *
 * Drawn from the same segment machinery as the stems but deliberately unlike
 * them: thinner, and with a much larger random component in both angle and
 * curve, because roots respond to whatever they meet in the soil rather than to
 * light. Angles are measured from straight up, so π is straight down.
 */
export function growRoots(form: PlantForm, rng: Rng): BranchNode[] {
  if (!form.roots) return [];

  const nodes: BranchNode[] = [];
  const decay = widthDecayFor(1);
  const primaryCount = 4;
  const rootLength = BASE_LENGTH * form.height * 0.3;
  const rootWidth = BASE_WIDTH * 0.42;

  for (let i = 0; i < primaryCount; i += 1) {
    const spread = (i / (primaryCount - 1)) * 2 - 1;
    const angle = Math.PI + spread * 0.75 * jitter(rng, 0.3);

    const primary = makeNode(
      {
        start: { x: 0, y: 0 },
        angle,
        length: rootLength * jitter(rng, 0.35),
        width: rootWidth,
        tipWidth: rootWidth * decay,
        depth: 0,
        // Roots wander: several times the bow allowed on a stem.
        curve: randomBetween(rng, -0.5, 0.5),
        isTerminal: false,
      },
      rng,
    );

    nodes.push(primary);

    // One or two rootlets off each primary, finer again.
    const rootlets = 1 + Math.round(rng());

    for (let j = 0; j < rootlets; j += 1) {
      const branchOff = angle + randomBetween(rng, -0.6, 0.6);
      const width = rootWidth * decay;

      nodes.push(
        makeNode(
          {
            start: primary.end,
            angle: branchOff,
            length: rootLength * 0.55 * jitter(rng, 0.4),
            width,
            tipWidth: width * decay,
            depth: 1,
            curve: randomBetween(rng, -0.6, 0.6),
            isTerminal: false,
          },
          rng,
        ),
      );
    }
  }

  return nodes;
}
