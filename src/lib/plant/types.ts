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

/**
 * The plant's overall growth habit — the thing you recognise from across the
 * room, before any detail resolves. Each one is a different growth strategy in
 * `branch.ts`, not a parameter tweak, because a rosette is not an upright plant
 * with different numbers.
 */
export const PLANT_HABITS = ['upright', 'arching', 'rosette', 'tuft', 'trailing'] as const;

export type PlantHabit = (typeof PLANT_HABITS)[number];

/** The leaf outlines the generator knows how to draw. */
export const LEAF_SHAPES = ['lanceolate', 'ovate', 'palmate', 'linear', 'lobed'] as const;

export type LeafShape = (typeof LEAF_SHAPES)[number];

/**
 * Phyllotaxy: whether leaves alternate up the stem or sit in facing pairs. One
 * of the first things a botanical key asks about, and clearly visible even in
 * silhouette.
 */
export const LEAF_ARRANGEMENTS = ['alternate', 'opposite'] as const;

export type LeafArrangement = (typeof LEAF_ARRANGEMENTS)[number];

/** How flowers are arranged, if there are any. */
export const FLOWER_TYPES = ['none', 'single', 'cluster', 'umbel', 'spike'] as const;

export type FlowerType = (typeof FLOWER_TYPES)[number];

/**
 * The parameters that define a plant.
 *
 * Every field has a documented range. Values outside it are not rejected —
 * `generate` clamps them — but they are outside what the drawing was tuned for
 * and will look wrong before they look interesting.
 */
export interface PlantForm {
  /** Overall growth habit. Determines which growth strategy runs. */
  habit: PlantHabit;

  /**
   * How many child branches spring from the base node. Tapers by one at each
   * successive depth, to a floor of one, so this is a fan-out ceiling rather
   * than a constant.
   *
   * Range 1–5. Sensible: 2–4. Ignored by `rosette` and `tuft`, which do not
   * branch.
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
   * Range -0.6–0.6. Sensible: -0.35–0.35. `arching` and `trailing` add their own
   * bow on top of this.
   */
  stemCurve: number;

  /** The leaf outline to draw. */
  leafShape: LeafShape;

  /**
   * How thickly leaves are set along the branches. `0` is bare; `1` is as dense
   * as the generator will go.
   *
   * Range 0–1.
   */
  leafDensity: number;

  /** Whether leaves alternate up a stem or sit in facing pairs. */
  leafArrangement: LeafArrangement;

  /**
   * Number of lobes, for the leaf shapes that have them (`palmate`, `lobed`).
   * Ignored by the entire-margined shapes.
   *
   * Range 3–9. Odd numbers look more natural — a leaf usually has a terminal
   * lobe on the midrib.
   */
  lobeCount: number;

  /** How flowers are arranged. `'none'` skips flower generation entirely. */
  flowerType: FlowerType;

  /**
   * Flower size, as a multiplier on the base radius.
   *
   * Range 0.4–2. Sensible: 0.6–1.6.
   */
  flowerSize: number;

  /**
   * Petals per flower.
   *
   * Range 4–8. Most conspicuously affects `single`, where the flower is large
   * enough to count them.
   */
  petalCount: number;

  /**
   * Draw a root tuft below the base.
   *
   * A herbarium sheet usually shows the whole plant, roots included; a garden
   * illustration usually does not. Roots also shift the composition, since the
   * fit anchors the lowest ink to the baseline rather than the stem base.
   */
  roots: boolean;

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

/**
 * One woody segment: stem, branch, twig or root.
 *
 * `commands` is a **closed outline**, not a centreline, so the renderer fills it
 * rather than stroking it. That is what buys a continuous taper along a single
 * segment: a stroked path has one width for its whole length, and faking a taper
 * by chopping each branch into separately-stroked pieces would multiply the path
 * count several-fold for a visibly stepped result.
 */
export interface SegmentMark {
  readonly kind: 'stem' | 'root';
  readonly commands: readonly PathCommand[];
  /** Width in canvas units where the segment leaves its parent. */
  readonly width: number;
  /** Width at its far end. Always less than `width`. */
  readonly tipWidth: number;
  /** 0 for the main stem, incrementing outwards. */
  readonly depth: number;
  /** Approximate centreline arc length in canvas units, from sampling. */
  readonly length: number;
}

/** One leaf: a closed blade outline plus the veins drawn over it. */
export interface LeafMark {
  readonly kind: 'leaf';
  readonly commands: readonly PathCommand[];
  /**
   * Midrib, and for palmate leaves a rib into each lobe. Stroked, not filled,
   * and drawn over the blade. Multiple sub-paths in one command list.
   */
  readonly midrib: readonly PathCommand[];
  readonly shape: LeafShape;
}

/**
 * One flower: a ring of petal outlines around a filled centre.
 *
 * Petals are outlines rather than discs so a large `single` flower reads as
 * having narrow overlapping petals — the thing that separates a botanical plate
 * from a child's drawing of a daisy.
 */
export interface FlowerMark {
  readonly kind: 'flower';
  readonly center: Point;
  readonly coreRadius: number;
  readonly petals: readonly (readonly PathCommand[])[];
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
  readonly stems: readonly SegmentMark[];
  /** Empty unless `form.roots`. Separate from `stems` so it can be styled apart. */
  readonly roots: readonly SegmentMark[];
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

/**
 * How much thicker the base of the plant is than its finest twig.
 *
 * Held constant across every habit and depth: `branch.ts` derives its per
 * generation decay from this and the actual tree depth, rather than compounding
 * a fixed ratio, which would make a deep plant absurdly spindly at the tips. An
 * engraved plate keeps its line weights within a narrow band — much beyond this
 * and the twigs stop reading as the same drawing as the stem.
 */
export const BASE_TO_TIP_WIDTH_RATIO = 2.3;
