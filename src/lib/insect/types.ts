/**
 * SPIKE — the beetle generator's vocabulary.
 *
 * Evaluating a pivot from plants to insects. Deliberately self-contained: it
 * shares only `@/lib/random` with the plant generator, so whichever of the two
 * loses can be deleted without touching the other. That is why a handful of
 * path helpers are duplicated here rather than imported from `lib/plant` — a
 * spike that cannot be thrown away is not a spike.
 *
 * ## Coordinate system
 *
 * **Beetle space**: the origin is the midline at the front of the head, `x`
 * runs across the body (positive to the *animal's* right, as the plate is
 * viewed) and `y` runs down the body towards the rear. Dorsal view, wings shut.
 *
 * The whole point of that choice is that mirroring is `x -> -x` and nothing
 * else. Every paired part is authored once on the right and reflected in
 * `generate.ts`, which is what guarantees the bilateral symmetry an
 * entomological plate lives or dies by.
 *
 * `generate()` fits the assembled beetle into `VIEW_BOX` as its last step, so
 * every coordinate in a finished `BeetleGeometry` is already canvas space.
 */

/**
 * Antenna shape. The single most useful character for telling beetle families
 * apart at a glance, which is why it is an enum rather than a set of numbers.
 */
export const ANTENNA_TYPES = ['filiform', 'clavate', 'lamellate', 'serrate'] as const;

export type AntennaType = (typeof ANTENNA_TYPES)[number];

/** The pronotum's outline: softly curved, or with defined corners. */
export const PRONOTUM_SHAPES = ['rounded', 'angular'] as const;

export type PronotumShape = (typeof PRONOTUM_SHAPES)[number];

/** What is painted on the elytra, if anything. */
export const MARKING_TYPES = ['none', 'spots', 'bands', 'stripe'] as const;

export type MarkingType = (typeof MARKING_TYPES)[number];

/**
 * The parameters that define a beetle.
 *
 * Every field has a documented range; `generate` clamps rather than rejects, so
 * a value arriving from a slider degrades to the nearest sensible beetle.
 */
export interface BeetleForm {
  /** Overall body length before the fit normalises it. Range 0.6–1. */
  bodyLength: number;
  /** Body breadth relative to length — the aspect that reads as a family. Range 0.4–1.2. */
  bodyWidth: number;

  /** Head capsule width relative to the pronotum. Range 0.3–1. */
  headWidth: number;
  /** Compound eye radius. Range 0.2–1. */
  eyeSize: number;

  antennaType: AntennaType;
  /** Antenna length relative to body. Range 0.3–1.6; longhorns sit near the top. */
  antennaLength: number;

  /**
   * Mandible size. `0` hints at them, `1.5` is full stag-beetle exaggeration —
   * antlers longer than the head.
   *
   * Range 0–1.5.
   */
  mandibleSize: number;

  pronotumShape: PronotumShape;
  /** Pronotum width relative to the elytra. Range 0.5–1.2. */
  pronotumWidth: number;
  /** Draw the midline ridge. */
  pronotumRidge: boolean;

  /** Draw a forward-pointing horn on the pronotum. */
  horn: boolean;
  /** Horn length, ignored unless `horn`. Range 0.2–1. */
  hornLength: number;

  /** Elytra length as a fraction of the body. Range 0.5–1. */
  elytraLength: number;
  /** Elytra width at the shoulders. Range 0.5–1.2. */
  elytraWidth: number;
  /** How much the elytra narrow towards the apex. `0` is parallel-sided. Range 0–1. */
  elytraTaper: number;
  /** Longitudinal grooves per elytron. `0` leaves them smooth. Range 0–10. */
  striaeCount: number;
  /** Punctate the striae with rows of dots. */
  punctures: boolean;

  /** Leg length relative to body. Range 0.5–1.4. */
  legLength: number;
  /** Femur thickness. Range 0.4–1.4. */
  femurThickness: number;
  /** How far the legs are splayed, as they would be on a pinned specimen. Range 0–1. */
  legSpread: number;
  /** Small spines along the tibiae. */
  tibialSpines: boolean;

  marking: MarkingType;
  /** Spots per elytron, or bands across it. Ignored by `none` and `stripe`. Range 1–8. */
  markingCount: number;
  /** Marking size. Range 0.3–1.5. */
  markingSize: number;

  /** How much of the view box the fitted drawing fills. Range 0.5–1. */
  scale: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * A single path instruction.
 *
 * Structured rather than pre-formatted, so a test can assert on a control point
 * and the mirror check can compare geometry rather than parse strings.
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
 * Which anatomical part a mark belongs to.
 *
 * Carried on every mark so the renderer can style parts differently without
 * the generator knowing anything about colour, and so the tests can count
 * legs and antennae without inspecting geometry.
 */
export const INSECT_PARTS = [
  'head',
  'eye',
  'mandible',
  'antenna',
  'pronotum',
  'horn',
  'elytron',
  'seam',
  'stria',
  'puncture',
  'leg',
  'spine',
  'marking',
] as const;

export type InsectPart = (typeof INSECT_PARTS)[number];

/**
 * Which half of the animal a mark belongs to.
 *
 * `centre` means the mark straddles the midline and is symmetric in itself —
 * the head capsule, the pronotum, the elytral seam. `right` and `left` marks
 * come in mirrored pairs, always.
 */
export type Side = 'left' | 'right' | 'centre';

interface MarkBase {
  readonly part: InsectPart;
  readonly side: Side;
  /**
   * Which appendage this mark belongs to, for parts drawn from several marks.
   *
   * A leg is three strokes of decreasing width and a lamellate antenna is a
   * shaft plus four blades, so counting marks does not count appendages. The
   * group makes "exactly six legs and two antennae" something that can be
   * asserted directly rather than inferred from a segment count that would
   * change the moment a leg gained a joint.
   */
  readonly group?: string;
}

/** An outline or a line. `closed` decides whether the renderer fills it. */
export interface PathMark extends MarkBase {
  readonly kind: 'path';
  readonly commands: readonly PathCommand[];
  readonly closed: boolean;
  /** Stroke width in canvas units. Set for open lines; ignored when closed. */
  readonly width: number;
}

/** A filled circle: an eye, a puncture, a spot. */
export interface DotMark extends MarkBase {
  readonly kind: 'dot';
  readonly center: Point;
  readonly radius: number;
}

export type BeetleMark = DotMark | PathMark;

export interface BeetleGeometry {
  readonly viewBox: { readonly width: number; readonly height: number };
  readonly marks: readonly BeetleMark[];
}

/**
 * The canvas every beetle is fitted into.
 *
 * Slightly taller than wide: a pinned beetle with its legs out is close to
 * square, and a fixed box means a grid of them lines up without the layout
 * knowing anything about the contents.
 */
export const VIEW_BOX = { width: 120, height: 140 } as const;

/** Legs, always. Six is what makes it an insect. */
export const LEG_PAIRS = 3;
