/**
 * A real animal, described well enough to draw it and to key it out.
 *
 * The archive's illustrations used to be procedurally generated, and a
 * generated specimen needed no record beyond the parameters that drew it. A
 * hand-authored plate is the other way round: the drawing is traced from a real
 * animal, so the record is the primary thing and the plate is one view of it.
 *
 * Two audiences, therefore, in one type. `taxonomy`, `distribution`, `notes`
 * and `sources` are what a catalogue entry reads out. `morphology`,
 * `activeMonths` and `sizeMm` are machine-readable characters — a later
 * identification key filters on them and a phenology calendar plots them — so
 * every one of them is a closed union or a number, never prose.
 *
 * Enumerations are `as const` tuples rather than `enum`s: the union type plus
 * an iterable list at runtime, and nothing emitted under
 * `verbatimModuleSyntax`.
 */

/**
 * Which of the six plate pigments this species is drawn in.
 *
 * An index, not a colour: the renderer maps it onto the `--pigment-N` tokens
 * through a `data-pigment` attribute and the season decides what that resolves
 * to.
 */
export const SPECIES_PIGMENTS = [1, 2, 3, 4, 5, 6] as const;

export type SpeciesPigment = (typeof SPECIES_PIGMENTS)[number];

/**
 * The formal name, in the five parts a label needs.
 *
 * `species` is the epithet alone (`cervus`), not the binomial: a caption that
 * wants the binomial composes it from `genus` and `species`, and one that wants
 * to italicise only the epithet can. `authority` keeps its own parentheses,
 * because whether they are there is information — Linnaeus described this
 * animal in another genus, and `(Linnaeus, 1758)` says so.
 */
export interface Taxonomy {
  readonly order: string;
  readonly family: string;
  readonly genus: string;
  readonly species: string;
  readonly authority: string;
}

/** Body length in millimetres, smallest to largest adult. */
export interface SizeRange {
  readonly min: number;
  readonly max: number;
}

/**
 * Which measurement `sizeMm` is.
 *
 * Groups are conventionally sized by different dimensions and the numbers are
 * not comparable across them: a beetle is given by body length, a butterfly and
 * a dragonfly by wingspan. Recording only the millimetres would put "75" beside
 * "86" as though they described the same thing, and a 75 mm stag beetle is a
 * much larger animal than an 86 mm swallowtail.
 */
export const SIZE_BASES = ['body length', 'wingspan'] as const;

export type SizeBasis = (typeof SIZE_BASES)[number];

/** A month of the year, 1 = January. */
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const MONTHS: readonly Month[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * What covers the back.
 *
 * The first question an identification key asks, and the one that decides how
 * the plate is built: `elytra` means two hardened cases meeting at a seam,
 * `scaled` means overlapping wings, and the two are drawn nothing alike.
 */
export const WING_COVERS = ['elytra', 'membranous', 'scaled', 'absent'] as const;

export type WingCover = (typeof WING_COVERS)[number];

/** Antennal form, in the terms an entomological key uses. */
export const ANTENNA_FORMS = [
  'filiform',
  'clavate',
  'lamellate',
  'serrate',
  'bipectinate',
  'setaceous',
] as const;

export type AntennaForm = (typeof ANTENNA_FORMS)[number];

/** What is painted on the wings or wing cases, if anything. */
export const MARKING_FORMS = ['none', 'spots', 'bands', 'stripes', 'eyespots'] as const;

export type MarkingForm = (typeof MARKING_FORMS)[number];

/** The silhouette, seen from above. */
export const BODY_SHAPES = ['elongate', 'oval', 'round', 'slender'] as const;

export type BodyShape = (typeof BODY_SHAPES)[number];

/**
 * A size bracket, for filtering.
 *
 * Coarser than `sizeMm` and derived from it, because "show me the large ones"
 * is a question a reader asks and "show me 45–75 mm" is not. Roughly: tiny
 * under 5 mm, small under 15, medium under 30, large above it.
 */
export const SIZE_CLASSES = ['tiny', 'small', 'medium', 'large'] as const;

export type SizeClass = (typeof SIZE_CLASSES)[number];

/**
 * The colour a reader would name if asked, in words rather than a value.
 *
 * Deliberately not the pigment index. The pigment says what the *plate* is
 * inked in, which the season shifts; this says what the *animal* is, which it
 * does not. A key filters on this one.
 */
export const COLOUR_FAMILIES = [
  'black',
  'dark brown',
  'reddish brown',
  'red',
  'tan',
  'yellow',
  'cream',
  'green',
  'grey',
  'metallic',
] as const;

export type ColourFamily = (typeof COLOUR_FAMILIES)[number];

/**
 * The characters a key filters on.
 *
 * All six are closed unions so a filter panel can be generated from the type
 * rather than hand-maintained, and so a new species cannot invent a character
 * state that nothing else in the collection shares.
 */
export interface Morphology {
  readonly wingCover: WingCover;
  readonly antennae: AntennaForm;
  readonly markings: MarkingForm;
  readonly bodyShape: BodyShape;
  readonly sizeClass: SizeClass;
  readonly colourFamily: ColourFamily;
}

/** Where a fact came from. Every species record carries at least one. */
export interface SpeciesSource {
  readonly title: string;
  readonly url: string;
}

/** One real species in the collection. */
export interface Species {
  /** Slug, and the key a plate references. `genus-species`, lower case. */
  readonly id: string;
  readonly taxonomy: Taxonomy;
  /**
   * The vernacular name, written as it reads **mid-sentence**.
   *
   * So `European stag beetle` and `oil beetle`: capitalised only where a word
   * is a proper noun. Alt text drops it into a sentence verbatim, and a heading
   * that wants a capital can add one — which is the easy direction. Working out
   * that the E in European is not sentence case is the hard one.
   */
  readonly commonName: string;
  /** Adult body length in millimetres, across both sexes and the whole range. */
  readonly sizeMm: SizeRange;
  /** Which dimension `sizeMm` measures. See `SIZE_BASES`. */
  readonly sizeBasis: SizeBasis;
  /** One sentence. Native range, not the pet trade. */
  readonly distribution: string;
  /** Months adults are on the wing, for the phenology calendar. */
  readonly activeMonths: readonly Month[];
  readonly morphology: Morphology;
  /** Two or three factual sentences. Our own words, not a quotation. */
  readonly notes: string;
  readonly sources: readonly SpeciesSource[];
  /** Which of the six plate pigments the drawing is inked in. */
  readonly pigment: SpeciesPigment;
  /**
   * How large this species is drawn relative to the others, 0.1 to 1.
   *
   * Not a linear ratio of millimetres. A seven-spot ladybird is a tenth of the
   * length of a stag beetle, and drawn at 0.1 it would be nine pixels wide on a
   * contact sheet — legible as a dot and nothing else. The values are the
   * square root of the ratio against the largest animal in the collection,
   * which keeps the ordering true and every plate readable.
   */
  /**
   * How large to draw this animal relative to the plate frame, 0.3–1.
   *
   * A collection sheet in which every specimen fills its own box tells the
   * reader nothing about size. This is the one number that carries real-world
   * scale into the drawing, so it is derived from `sizeMm` rather than picked:
   * the largest beetle in Europe gets 1, and a ladybird gets a fraction of it.
   */
  readonly scale: number;
}
