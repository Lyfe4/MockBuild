import type { Pigment, Range } from '../core';

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
 * The pattern layers a wing can carry.
 *
 * A moth's wing is not "patterned" or "plain" — it is one to three layers laid
 * over each other, and which layers those are is more of what tells two
 * families apart than how many spots either has. A preset names the layers its
 * kind is found with and the seed picks a few, so a sheet of one preset varies
 * in *kind* of pattern rather than only in quantity.
 *
 * Declaration order is painting order, back to front: dusting is the ground the
 * rest sits on, an eyespot is the last thing an engraver puts down.
 */
export const WING_PATTERNS = [
  /** A field of fine scale dots across the whole wing. */
  'dusting',
  /** A band parallel to the outer edge, following its curve rather than cutting across it. */
  'marginalBand',
  /** A wedge of colour in the corner at the wing tip. */
  'apexPatch',
  /** A single solid mark in the middle of the wing, where the discal cell is. */
  'discalSpot',
  /** Concentric rings around a pale centre. */
  'eyespot',
] as const;

export type WingPattern = (typeof WING_PATTERNS)[number];

/** The most layers one wing may carry. Beyond three the wing turns to mud. */
export const MAX_PATTERN_LAYERS = 3;

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
  /**
   * The hindwing's length as a fraction of the forewing's. Range 0.5–1.15.
   *
   * Above 1 on the broad-winged families, which is right: a saturniid's
   * hindwing is no smaller than its forewing, and drawing it as a token lobe
   * behind one was the single thing that made these read as diagrams.
   */
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

  /**
   * Which pattern layers this wing carries, painted in `WING_PATTERNS` order.
   * Between none and three; duplicates and unknown names are dropped.
   */
  patterns: readonly WingPattern[];

  /** Bands across each wing, when `marginalBand` is one of the layers. Range 0–4. */
  bandCount: number;
  /** How broad each band is drawn. Range 0.4–1.6. */
  bandWidth: number;
  /** Eyespots per wing, when `eyespot` is one of the layers. Range 0–3. */
  eyespotCount: number;
  /** Eyespot radius. Range 0.3–1.4. */
  eyespotSize: number;
  /** Concentric rings around each eyespot's pale centre. Range 1–3. */
  eyespotRings: number;
  /** Give the eyespot a dark pupil at its centre. */
  eyespotPupil: boolean;

  /**
   * Which of the six plate pigments this specimen is washed and patterned in.
   * An index; the season decides what it resolves to. Range 1–6.
   */
  pigment: Pigment;

  /** Draw the scalloped fringe line just inside the outer margin. */
  fringe: boolean;

  /** How thickly the wings are dusted, when `dusting` is one of the layers. Range 0–1. */
  dustingDensity: number;

  /**
   * How densely the base of each wing — the part nearest the body — is hatched.
   * `0` leaves it clean. Range 0–1.
   */
  hatching: number;

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
    readonly eyespotPupil?: readonly boolean[];
    readonly pigment?: readonly Pigment[];
    /** The layers this kind is found with. The seed picks one to three. */
    readonly patterns?: readonly WingPattern[];
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
