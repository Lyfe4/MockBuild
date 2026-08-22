import type { Range } from '../core';

/**
 * Lepidoptera — the moth and butterfly generator's vocabulary.
 *
 * Everything geometric lives in `../core` and is shared with the beetles. What
 * is here is specific to the order: four wings spread as a pinned specimen, and
 * the characters that tell one family from another at a glance.
 */

/** The forewing's outline. The dominant shape in the silhouette. */
export const FOREWING_SHAPES = ['triangular', 'falcate', 'rounded'] as const;

export type ForewingShape = (typeof FOREWING_SHAPES)[number];

/** The hindwing's outline, including whether it carries a tail. */
export const HINDWING_SHAPES = ['rounded', 'tailed', 'scalloped'] as const;

export type HindwingShape = (typeof HINDWING_SHAPES)[number];

/**
 * Antenna form — the single character that separates butterflies from moths in
 * every field guide, and saturniids from everything else.
 */
export const MOTH_ANTENNA_TYPES = ['filiform', 'clubbed', 'bipectinate'] as const;

export type MothAntennaType = (typeof MOTH_ANTENNA_TYPES)[number];

/**
 * The parameters that define a moth or butterfly.
 *
 * As with beetles, a `MothForm` fully determines the drawing; variation between
 * specimens happens when a preset is resolved.
 */
export interface MothForm {
  forewingShape: ForewingShape;
  hindwingShape: HindwingShape;

  /** Wing length from base to apex, relative to the body. Range 0.6–1.4. */
  wingSpan: number;
  /** Wing breadth relative to its length. Range 0.35–1. Low is a hawkmoth. */
  wingAspect: number;
  /** How much smaller the hindwing is than the forewing. Range 0.45–1. */
  hindwingScale: number;

  /** Body length. Range 0.5–1.2. */
  bodyLength: number;
  /** Body thickness. Range 0.3–1.2; hawkmoths are heavy, geometrids are thin. */
  bodyThickness: number;

  antennaType: MothAntennaType;
  /** Antenna length relative to the body. Range 0.3–1.1. */
  antennaLength: number;

  /** Veins radiating from each wing base. `0` leaves the wing plain. Range 0–9. */
  veinCount: number;

  /** Transverse bands across each wing. Range 0–4. */
  bandCount: number;
  /** Eyespots per wing. Range 0–3. */
  eyespotCount: number;
  /** Eyespot radius. Range 0.3–1.4. */
  eyespotSize: number;
  /** Concentric rings around each eyespot's pupil. Range 1–3. */
  eyespotRings: number;

  /** Draw the scalloped fringe line just inside the outer margin. */
  fringe: boolean;

  /** Scatter fine dots across the wings. */
  dusting: boolean;
  /** How thickly, when dusted. Range 0–1. */
  dustingDensity: number;

  /** How much of the view box the fitted drawing fills. Range 0.5–1. */
  scale: number;
}

/** Numeric parameters a preset may declare a range for. */
export type MothRangeKey = {
  [K in keyof MothForm]: MothForm[K] extends number ? K : never;
}[keyof MothForm];

/** A kind of moth, as a region of parameter space. See `resolveMothPreset`. */
export interface MothPresetSpec {
  readonly name: string;
  readonly note: string;
  readonly base: MothForm;
  readonly ranges?: Partial<Record<MothRangeKey, Range>>;
  readonly choices?: {
    readonly forewingShape?: readonly ForewingShape[];
    readonly hindwingShape?: readonly HindwingShape[];
    readonly antennaType?: readonly MothAntennaType[];
    readonly fringe?: readonly boolean[];
    readonly dusting?: readonly boolean[];
  };
}

/**
 * The canvas every moth is fitted into.
 *
 * Landscape, unlike the beetle's: a specimen with its wings spread is far wider
 * than it is long, and forcing it into a portrait frame would shrink it to
 * nothing. The geometry carries its own view box so a plate can hold both.
 */
export const MOTH_VIEW_BOX = { width: 150, height: 120 } as const;

/** Four wings, always. Two forewings and two hindwings. */
export const WING_COUNT = 4;
