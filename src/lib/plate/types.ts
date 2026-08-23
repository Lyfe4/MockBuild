/**
 * The vocabulary of a hand-authored plate.
 *
 * ## Why this exists at all
 *
 * The procedural generator in `src/lib/insect` could draw a plausible beetle
 * but not a particular one, and no amount of parameter tuning was going to get
 * it to *Lucanus cervus*. A plate is the other approach: an author traces one
 * real animal from a reference and the result is stored as path data. The
 * schema's job is to make that authoring safe — to catch the mistakes a human
 * drawing coordinates by hand actually makes — and to keep the drawing free of
 * anything the renderer or the season owns.
 *
 * What a plate therefore does *not* contain: colours, stroke widths, view
 * boxes, transforms, or a left half. Rank and fill are *roles*; the stylesheet
 * decides what they resolve to.
 *
 * ## Plate space
 *
 * The midline is `x = 0`. `y` runs from 0 at the head end, at the top, to 1000
 * at the tip of the abdomen — so the body axis is always a thousand units long
 * whatever the animal, and two plates of different species are directly
 * comparable.
 *
 * Authors draw the **right half only**, `x >= 0`, and the renderer reflects it.
 * That is the entire bilateral-symmetry mechanism, inherited from the
 * generator's `composeAndFit` because it was the part of the generator that was
 * unambiguously right: a plate cannot come out lopsided if there is only one
 * half to get wrong.
 *
 * Appendages are free to leave the 0–1000 band — a stag beetle's hind tarsi
 * reach well past its abdomen, and its mandibles start above its head, which is
 * why `y = 0` is the head end rather than the topmost ink. The renderer measures
 * the drawing and fits it; nothing here is clamped.
 */

import type { SpeciesPigment } from '@/types';

/**
 * Where a line sits in the engraver's hierarchy.
 *
 * The same three ranks the generator used, and for the same reason: a plate
 * reads because its lines are ranked. Silhouette heaviest, the structure inside
 * it a step back, surface texture finer again. A rank, not a width — the widths
 * are `--plate-stroke-*` tokens, so a plate drawn at 80 pixels and the same
 * plate at 600 keep the same hierarchy.
 */
export const PLATE_RANKS = ['outline', 'structure', 'detail'] as const;

export type PlateRank = (typeof PLATE_RANKS)[number];

/**
 * What fills a shape, as a role rather than a colour.
 *
 * `none` is an open line or an unfilled outline. `surface` is bare paper, for a
 * part that must knock out whatever it overlaps. `pigment` and `pigment-deep`
 * are the specimen's own earth at two strengths, and `ink` is the engraver's
 * black — used as a *fill* only for the small solid parts, an eye or a tarsal
 * claw, where an outline would be a blot at plate size.
 */
export const PLATE_FILLS = ['none', 'surface', 'pigment', 'pigment-deep', 'ink'] as const;

export type PlateFill = (typeof PLATE_FILLS)[number];

/**
 * Which part of the animal a path draws.
 *
 * Anatomical names, not drawing names, and one flat list rather than one per
 * order — the same call the generator made. The renderer maps a part to a
 * default treatment, and a caption can count legs without reading geometry.
 *
 * Legs are named by pair and segment because a leg is three separately curved
 * pieces with visible joints, and the validator has to be able to say that the
 * middle leg has no tibia. One `tarsus` id covers the whole chain of small
 * segments for one leg, which is normally several paths.
 */
export const PLATE_PART_IDS = [
  // Head and its appendages
  'head',
  'eye',
  'antenna',
  'mandible',
  'palp',
  // Thorax and wing cases
  'pronotum',
  'scutellum',
  'elytron',
  // A stria is an engraved line *on* an elytron rather than the elytron itself,
  // and needs its own id because a part cannot be clipped to the id it carries.
  'stria',
  'seam',
  // Legs, front to back, each in three segments
  'foreleg-femur',
  'foreleg-tibia',
  'foreleg-tarsus',
  'midleg-femur',
  'midleg-tibia',
  'midleg-tarsus',
  'hindleg-femur',
  'hindleg-tibia',
  'hindleg-tarsus',
  // Surface
  'marking',
  'hatching',
] as const;

export type PlatePartId = (typeof PLATE_PART_IDS)[number];

/** One path of a plate. */
export interface PlatePart {
  /** Which part of the animal this is. Not unique — a tarsus is several paths. */
  readonly id: PlatePartId;
  readonly rank: PlateRank;
  readonly fill: PlateFill;
  /**
   * SVG path data in plate space.
   *
   * Cubic Béziers and lines, absolute commands: `M`, `L`, `C`, `Z`. Arcs and
   * quadratics are deliberately absent — an engraved curve is a cubic, and
   * allowing three ways to write one would mean three ways to mirror it.
   */
  readonly d: string;
  /**
   * Set to `false` for a part that straddles the midline.
   *
   * The scutellum and the elytral seam are single parts on the axis of
   * symmetry; reflecting them would draw them twice, one copy a hair off the
   * other, which at plate size shows as a doubled line. Absent means mirrored,
   * because almost everything is.
   */
  readonly mirror?: false;
  /**
   * The part whose outline confines this one.
   *
   * Set on hatching and markings. The renderer builds one clip region per
   * referenced id from every path carrying it, so hatching laid across an
   * elytron stops at the elytron's curved margin without the author having to
   * trim each stroke by hand.
   *
   * The clip is a safety net, not the drawing: a stroke that only stays on the
   * elytron because the clip cut it is a stroke in the wrong place. Same rule
   * the generator had, and for the same reason — geometry that leans on the
   * clip is geometry that lies about itself.
   */
  readonly clipTo?: PlatePartId;
}

/** Which sex of the animal a plate draws. Stag beetles are not subtle about it. */
export const PLATE_SEXES = ['male', 'female', 'unsexed'] as const;

export type PlateSex = (typeof PLATE_SEXES)[number];

/**
 * The orders a plate can be checked against.
 *
 * Each names the parts a complete drawing of that order must have, which is
 * what `validatePlate` enforces. A beetle plate missing its antennae is a
 * mistake every time; a moth plate missing its elytra is not, because a moth
 * has none.
 */
export const PLATE_ORDERS = ['coleoptera', 'lepidoptera'] as const;

export type PlateOrder = (typeof PLATE_ORDERS)[number];

/** Where a plate was traced from. Provenance travels with the drawing. */
export interface PlateReference {
  /** The work the figure appears in. */
  readonly title: string;
  readonly artist: string;
  readonly year: number;
  /** Where the file came from, so the claim can be checked. */
  readonly source: string;
  /** The terms, in words. `references/SOURCES.md` holds the long version. */
  readonly licence: string;
}

/** One species, drawn once. */
export interface SpeciesPlate {
  /** The slug of the `Species` record this draws. */
  readonly species: string;
  readonly order: PlateOrder;
  readonly sex: PlateSex;
  /**
   * The feature the drawing takes care over, named in the alt text.
   *
   * A stag beetle without its mandibles is a beetle; the mandibles are the
   * identification. Naming it here rather than deriving it from the morphology
   * characters keeps the honest split: the characters are what a key filters
   * on, and this is what a reader is being shown.
   */
  readonly hallmark?: string;
  readonly reference: PlateReference;
  /**
   * The paths, in drawing order.
   *
   * Back to front: what is behind comes first. The renderer paints them in
   * order and does no sorting, so the array *is* the stacking — a leg that
   * should pass under an elytron is placed by moving it earlier, rather than by
   * a z-index that would have to be invented.
   */
  readonly parts: readonly PlatePart[];
}

/**
 * The parts a complete plate of each order must carry.
 *
 * Six legs' worth of segments on a beetle, checked as the three authored groups
 * — the renderer's reflection supplies the other three, so requiring six here
 * would be requiring the author to draw the plate twice.
 */
export const REQUIRED_PARTS: Record<PlateOrder, readonly PlatePartId[]> = {
  coleoptera: [
    'head',
    'eye',
    'antenna',
    'pronotum',
    'elytron',
    'foreleg-femur',
    'foreleg-tibia',
    'foreleg-tarsus',
    'midleg-femur',
    'midleg-tibia',
    'midleg-tarsus',
    'hindleg-femur',
    'hindleg-tibia',
    'hindleg-tarsus',
  ],
  lepidoptera: [
    'head',
    'eye',
    'antenna',
    'foreleg-femur',
    'foreleg-tibia',
    'foreleg-tarsus',
    'midleg-femur',
    'midleg-tibia',
    'midleg-tarsus',
    'hindleg-femur',
    'hindleg-tibia',
    'hindleg-tarsus',
  ],
};

/** The length of the body axis, head end to abdomen tip, in plate units. */
export const PLATE_BODY_LENGTH = 1000;

/** Re-exported so a plate's pigment and a species' pigment cannot drift apart. */
export type { SpeciesPigment };
