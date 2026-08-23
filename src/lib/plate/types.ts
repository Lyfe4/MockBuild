/**
 * The vocabulary of a hand-authored plate.
 *
 * ## Why this exists at all
 *
 * The procedural generator this replaced could draw a plausible beetle but not
 * a particular one, and no amount of parameter tuning was going to get it to
 * *Lucanus cervus*. A plate is the other approach: an author traces one real
 * animal from a reference and the result is stored as path data. The
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
 * That is the entire bilateral-symmetry mechanism, and the one thing carried
 * over from the generator because it was unambiguously right: a plate cannot
 * come out lopsided if there is only one half to get wrong.
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
  // A dragonfly's eyes wrap most of its head and meet on top of it; drawing
  // them as `eye` would say nothing about the one feature that identifies the
  // order at a glance. `eye` stays the generic id for everything else.
  'compound-eye',
  // The three simple eyes on the vertex, between the compound pair.
  'ocellus',
  'antenna',
  'mandible',
  'palp',
  // Thorax. `thorax` is the whole box for an animal whose plates are not
  // separable in dorsal view — a moth, a dragonfly; `pronotum` is the front
  // plate where it is a distinct shield, which for a beetle it always is.
  'thorax',
  'pronotum',
  'scutellum',
  // Wing cases and wings
  'elytron',
  // A stria is an engraved line *on* an elytron rather than the elytron itself,
  // and needs its own id because a part cannot be clipped to the id it carries.
  'stria',
  'seam',
  'forewing',
  'hindwing',
  // Veins and markings are drawn *on* a wing and clipped to it, so like `stria`
  // they cannot share the wing's id.
  'wing-vein',
  'wing-marking',
  // Abdomen. One `abdomen` outline, and `abdomen-segment` for the ring lines
  // across it — a dragonfly's ten segments are the length of the animal.
  'abdomen',
  'abdomen-segment',
  // The paired appendages at the tip of the abdomen: a dragonfly's claspers, a
  // cricket's tails.
  'cercus',
  'stinger',
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

/**
 * How solid a shape is.
 *
 * `solid` is the default and is what everything on a beetle is: the pigment
 * fills are `color-mix`ed into the surface token rather than sitting over it at
 * an opacity, so a plate dropped onto a dark card does not go muddy.
 *
 * `membrane` is the deliberate exception, and it exists because a dragonfly's
 * wing is not a surface — it is a window. Four of them overlap each other and
 * the abdomen, and painting them opaque would hide the animal behind its own
 * wings. A membrane part is drawn with a real `fill-opacity`, so what is under
 * it shows through, which is the whole point.
 *
 * Only a wing may declare it; `validatePlate` rejects it anywhere else. A
 * membranous abdomen is not a drawing decision, it is a typo.
 */
export const PLATE_OPACITIES = ['solid', 'membrane'] as const;

export type PlateOpacity = (typeof PLATE_OPACITIES)[number];

/** The parts a `membrane` opacity makes sense on. */
export const MEMBRANOUS_PART_IDS: readonly PlatePartId[] = ['forewing', 'hindwing'];

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
   * Whether what is behind this shape shows through it.
   *
   * Absent means `solid`, because almost everything is. See `PLATE_OPACITIES`.
   */
  readonly opacity?: PlateOpacity;
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
export const PLATE_ORDERS = [
  'coleoptera',
  'lepidoptera',
  'odonata',
  'hymenoptera',
  'hemiptera',
  'orthoptera',
] as const;

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
 * The parts a complete plate of each order must carry, in dorsal view.
 *
 * Not "every organ the animal has" — the parts whose *absence* is a mistake in
 * a drawing rather than a fact about the animal. A beetle plate with no
 * antennae is always an error; a moth plate with no elytra is not, because a
 * moth has none, and a dragonfly plate with no antennae is not either, because
 * a dragonfly's are two bristles you would need a lens to see.
 *
 * The legs are the interesting case. A beetle, a dragonfly and a bee all show
 * six legs from above and a plate that omits them is unfinished; a butterfly
 * with its wings spread shows none, and requiring them would make the validator
 * demand a drawing of something the reference does not contain. So Lepidoptera
 * does not list them, and the comment is here rather than in a commit message
 * because it is the sort of omission that looks like a bug.
 *
 * Three legs' worth of segments, not six: the renderer's reflection supplies
 * the other side, so requiring six would be requiring the author to draw the
 * plate twice.
 */
const LEGS = [
  'foreleg-femur',
  'foreleg-tibia',
  'foreleg-tarsus',
  'midleg-femur',
  'midleg-tibia',
  'midleg-tarsus',
  'hindleg-femur',
  'hindleg-tibia',
  'hindleg-tarsus',
] as const satisfies readonly PlatePartId[];

export const REQUIRED_PARTS: Record<PlateOrder, readonly PlatePartId[]> = {
  // Beetles: the pronotum and the elytra are the order, and the head bears
  // visible antennae in every family the archive is likely to hold.
  coleoptera: ['head', 'eye', 'antenna', 'pronotum', 'elytron', ...LEGS],
  // Butterflies and moths, wings spread: four wings, a furred thorax, an
  // abdomen, and antennae that are half the identification. No legs — see
  // above.
  lepidoptera: ['head', 'eye', 'antenna', 'thorax', 'abdomen', 'forewing', 'hindwing', 'wing-vein'],
  // Dragonflies: eyes that meet on the head, four separately veined wings, and
  // an abdomen long enough to be most of the animal. No antennae.
  odonata: [
    'head',
    'compound-eye',
    'thorax',
    'abdomen',
    'abdomen-segment',
    'forewing',
    'hindwing',
    'wing-vein',
    ...LEGS,
  ],
  // Bees, wasps and ants: the waist between thorax and abdomen is the order,
  // and it is drawn as the gap between the two parts rather than as a part of
  // its own. A stinger is not required — most Hymenoptera do not show one from
  // above, and many do not have one.
  //
  // Neither are the wings, which is the entry that has changed. Winglessness is
  // normal in this order rather than exceptional: every ant worker has none,
  // and so do the females of a good many other families. Requiring them here
  // made a wood ant plate unbuildable, and the fix is not to draw wings that
  // are not on the animal. The bumblebee's and the hornet's tests each assert
  // their own four wings, which is where a per-species fact belongs.
  hymenoptera: ['head', 'eye', 'antenna', 'thorax', 'abdomen', ...LEGS],
  // True bugs: the big triangular scutellum between the folded forewings is
  // what identifies the order from above. The hindwings are underneath it and
  // are not required.
  hemiptera: ['head', 'eye', 'antenna', 'pronotum', 'scutellum', 'forewing', 'abdomen', ...LEGS],
  // Crickets, grasshoppers and their kin. The saddle-shaped pronotum, the
  // leathery tegmina folded flat over the abdomen, and the pair of cerci at the
  // tip are what a dorsal drawing of this order has to show; the cerci are the
  // reason `cercus` was in `PLATE_PART_IDS` before any plate used it.
  //
  // No hindwings and no scutellum. A field cricket's hindwings are vestigial
  // and folded away under the tegmina where nothing can see them, and an
  // orthopteran has no scutellum to speak of — asking for either would be
  // asking an author to draw something the animal does not show.
  orthoptera: ['head', 'eye', 'antenna', 'pronotum', 'forewing', 'abdomen', 'cercus', ...LEGS],
};

/** The length of the body axis, head end to abdomen tip, in plate units. */
export const PLATE_BODY_LENGTH = 1000;

/** Re-exported so a plate's pigment and a species' pigment cannot drift apart. */
export type { SpeciesPigment };
