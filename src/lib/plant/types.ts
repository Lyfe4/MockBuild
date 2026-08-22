/**
 * The generator's public vocabulary: what goes in (`PlantForm`) and what comes
 * out (`PlantGeometry`).
 *
 * ## Coordinate systems
 *
 * The growth code works in **plant space**: the origin is the base of the stem
 * and **+y points up**, because that is how a plant grows and it keeps the
 * trigonometry readable. `generate()` flips and fits the result into **canvas
 * space** — SVG's y-down box described by `VIEW_BOX` — as its last step. Nothing
 * outside `generate.ts` needs to know the difference; every coordinate in a
 * finished `PlantGeometry` is already canvas space.
 *
 * ## Angles
 *
 * Radians, measured from straight up, increasing clockwise. So `0` grows
 * vertically and `Math.PI / 2` grows to the right. In plant space that makes a
 * direction vector `(sin θ, cos θ)`.
 */

/** The leaf outlines the generator knows how to draw. */
export const LEAF_SHAPES = ['lanceolate', 'ovate', 'palmate', 'linear', 'lobed'] as const;

export type LeafShape = (typeof LEAF_SHAPES)[number];

/** How flowers are arranged, if there are any. */
export const FLOWER_TYPES = ['none', 'single', 'cluster', 'umbel', 'spike'] as const;

export type FlowerType = (typeof FLOWER_TYPES)[number];

/**
 * The parameters that define a plant's habit.
 *
 * Every field has a documented range. Values outside it are not rejected —
 * `generate` clamps them — but they are outside what the drawing was tuned for
 * and will look wrong before they look interesting.
 */
export interface PlantForm {
  /**
   * How many child branches spring from the base node. Tapers by one at each
   * successive depth, to a floor of one, so this is a fan-out ceiling rather
   * than a constant.
   *
   * Range 1–5. Sensible: 2–4.
   */
  branchCount: number;

  /**
   * How many times branching recurses. Depth 0 is the main stem alone.
   *
   * Range 0–5. Sensible: 2–4. Combined with a high `branchCount` the node count
   * grows fast; `MAX_BRANCH_NODES` is the backstop.
   */
  branchDepth: number;

  /**
   * The angle a child branch diverges from its parent, in **degrees**. Randomly
   * jittered by up to ±35% per branch so no two are identical.
   *
   * Range 5–60. Sensible: 15–40. Low values read as upright and grassy, high
   * values as spreading and shrubby.
   */
  branchAngle: number;

  /**
   * How much each segment bows. Signed: negative curves left, positive right,
   * `0` is a straight line. Applied as a perpendicular offset to the segment's
   * Bézier control points, proportional to its length.
   *
   * Range -0.6–0.6. Sensible: -0.35–0.35.
   */
  stemCurve: number;

  /** The leaf outline to draw. */
  leafShape: LeafShape;

  /**
   * How thickly leaves are set along the branches. `0` is bare; `1` is as dense
   * as the generator will go (roughly six leaves on the longest branch).
   *
   * Range 0–1.
   */
  leafDensity: number;

  /** How flowers are arranged. `'none'` skips flower generation entirely. */
  flowerType: FlowerType;

  /**
   * Flower size, as a multiplier on the base radius.
   *
   * Range 0.4–2. Sensible: 0.6–1.6.
   */
  flowerSize: number;

  /**
   * The plant's intrinsic height, which sets its **proportions** rather than
   * its rendered size. Because the finished drawing is fitted to `VIEW_BOX`, a
   * tall plant becomes tall and narrow in the frame and a short one becomes
   * squat and wide — the aspect ratio survives, the absolute size does not.
   *
   * Range 0.3–1.
   */
  height: number;

  /**
   * How much of the view box the fitted drawing fills, as a fraction. `1` runs
   * to the padding, `0.6` leaves it sitting smaller in its frame.
   *
   * Range 0.5–1.
   */
  scale: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * A single path instruction.
 *
 * Structured rather than pre-formatted so the output stays inspectable and
 * diffable — a test can assert on a control point without parsing a `d` string.
 * `toPathData` in `path.ts` turns a list of these into the attribute value.
 */
export type PathCommand =
  | { readonly c: 'M'; readonly x: number; readonly y: number }
  | { readonly c: 'L'; readonly x: number; readonly y: number }
  | {
      readonly c: 'C';
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly c: 'Q';
      readonly x1: number;
      readonly y1: number;
      readonly x: number;
      readonly y: number;
    }
  | { readonly c: 'Z' };

/** One woody segment: stem, branch or twig. */
export interface StemMark {
  readonly kind: 'stem';
  readonly commands: readonly PathCommand[];
  /** Stroke width in canvas units. Tapers with depth. */
  readonly width: number;
  /** 0 for the main stem, incrementing outwards. */
  readonly depth: number;
  /**
   * Approximate arc length in canvas units, from sampling the curve. The
   * renderer uses it for the `stroke-dasharray` draw-on animation, which needs
   * a length without calling `getTotalLength()` on a live DOM node.
   */
  readonly length: number;
}

/** One leaf, as a closed outline. */
export interface LeafMark {
  readonly kind: 'leaf';
  readonly commands: readonly PathCommand[];
  readonly shape: LeafShape;
}

/**
 * One flower, as primitives rather than a path: a ring of petal centres around
 * a core. The renderer draws circles, which keeps small flowers crisp at any
 * scale and keeps this structure trivial to assert on.
 */
export interface FlowerMark {
  readonly kind: 'flower';
  readonly center: Point;
  readonly coreRadius: number;
  readonly petalRadius: number;
  readonly petals: readonly Point[];
}

/**
 * Everything needed to draw one plant, and nothing about how to draw it.
 *
 * Plain data throughout: no functions, no class instances, no DOM. It survives
 * `structuredClone` and `JSON.stringify`, which is what makes the determinism
 * tests a single deep-equal.
 */
export interface PlantGeometry {
  readonly viewBox: { readonly width: number; readonly height: number };
  readonly stems: readonly StemMark[];
  readonly leaves: readonly LeafMark[];
  readonly flowers: readonly FlowerMark[];
}

/**
 * The canvas every plant is fitted into. Portrait, because plants are.
 *
 * Fixed rather than derived: a constant box means a grid of illustrations lines
 * up without the layout having to know anything about the contents.
 */
export const VIEW_BOX = { width: 120, height: 160 } as const;

/**
 * Hard ceiling on branch nodes.
 *
 * `branchCount` and `branchDepth` multiply, and a caller passing unclamped
 * values from a form field could otherwise ask for an unbounded tree. The
 * tapering fan-out keeps realistic inputs far below this; hitting it means the
 * input was wrong, and truncating beats hanging.
 */
export const MAX_BRANCH_NODES = 400;
