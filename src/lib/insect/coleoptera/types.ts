import type { Pigment, Range } from '../core';

/**
 * Coleoptera — the beetle generator's own vocabulary.
 *
 * Everything geometric (points, path commands, marks, sides, the mirror rule)
 * lives in `../core` and is shared with the other orders. What is here is
 * specific to beetles: their body plan and the parameters that describe it.
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
 * Every field has a documented range; `generateBeetle` clamps rather than
 * rejects, so a value arriving from a slider degrades to the nearest sensible
 * beetle.
 *
 * A `BeetleForm` fully determines the drawing. Variation between specimens
 * happens when a preset is *resolved* into a form, not while it is drawn — see
 * `presets.ts`.
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
  /** Antenna length relative to body. Range 0.3–1.8; longhorns sit near the top. */
  antennaLength: number;

  /**
   * Mandible size. `0` hints at them, `1.5` is full stag-beetle exaggeration —
   * antlers longer than the head, curving in until the tips nearly meet.
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
  /**
   * How densely the outer third of each wing case and the pronotum sides are
   * hatched. `0` leaves the shell smooth, `1` is a rugose, deeply modelled
   * beetle. Range 0–1.
   */
  hatching: number;

  /** Leg length relative to body. Range 0.5–1.4. */
  legLength: number;
  /** Femur thickness. Range 0.4–1.4. */
  femurThickness: number;
  /** How far the legs are splayed, as they would be on a pinned specimen. Range 0–1. */
  legSpread: number;
  /** Small spines along the tibiae. */
  tibialSpines: boolean;

  /**
   * Which of the six plate pigments this specimen is washed and marked in.
   * An index; the season decides what it resolves to. Range 1–6.
   */
  pigment: Pigment;

  marking: MarkingType;
  /** Spots per elytron, or bands across it. Ignored by `none` and `stripe`. Range 1–9. */
  markingCount: number;
  /** Marking size. Range 0.3–1.5. */
  markingSize: number;

  /** How much of the view box the fitted drawing fills. Range 0.5–1. */
  scale: number;
}

/** Numeric parameters a preset may declare a range for. */
export type BeetleRangeKey = {
  [K in keyof BeetleForm]: BeetleForm[K] extends number ? K : never;
}[keyof BeetleForm];

/**
 * A kind of beetle, as a region of parameter space rather than a point in it.
 *
 * `base` is what every specimen of this preset shares; `ranges` and `choices`
 * are what the seed picks from. Resolving the spec produces one individual —
 * see `resolveBeetlePreset`.
 *
 * Describing a preset this way rather than as a fixed form is what lets a sheet
 * of one preset read as a series of specimens of one kind, instead of the same
 * diagram four times.
 */
export interface BeetlePresetSpec {
  readonly name: string;
  readonly note: string;
  readonly base: BeetleForm;
  /** Continuous characters, sampled uniformly. Integers are rounded. */
  readonly ranges?: Partial<Record<BeetleRangeKey, Range>>;
  /** Categorical characters, one picked per specimen. */
  readonly choices?: {
    readonly antennaType?: readonly AntennaType[];
    readonly pronotumShape?: readonly PronotumShape[];
    readonly marking?: readonly MarkingType[];
    readonly pronotumRidge?: readonly boolean[];
    readonly punctures?: readonly boolean[];
    readonly horn?: readonly boolean[];
    readonly tibialSpines?: readonly boolean[];
    readonly pigment?: readonly Pigment[];
  };
}

/**
 * The canvas every beetle is fitted into.
 *
 * Portrait: a pinned beetle with its legs out is taller than it is wide. Moths
 * use their own, wider box — the geometry carries its view box with it.
 */
export const BEETLE_VIEW_BOX = { width: 120, height: 140 } as const;

/** Legs, always. Six is what makes it an insect. */
export const LEG_PAIRS = 3;
