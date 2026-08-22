/**
 * The vocabulary shared by every insect order the generator draws.
 *
 * ## Insect space
 *
 * The origin sits on the midline at the front of the animal, `x` runs across
 * the body (positive to the animal's right, as the plate is viewed) and `y`
 * runs down the body towards the rear. Dorsal view throughout.
 *
 * The whole point of that choice is that mirroring is `x -> -x` and nothing
 * else. Every paired part is authored once on the right and reflected by
 * `composeAndFit`, which is what guarantees the bilateral symmetry an
 * entomological plate lives or dies by — for a beetle's legs exactly as much as
 * for a moth's wings.
 *
 * A finished `InsectGeometry` is already in canvas space.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Which of the six plate pigments a specimen is coloured with.
 *
 * An index, not a colour. The generator has no idea what ochre looks like and
 * must not: the renderer maps the index onto `--pigment-N` through a
 * `data-pigment` attribute, and the season decides what that resolves to. Kept
 * in `core` because both orders are painted from the same six.
 */
export const PIGMENTS = [1, 2, 3, 4, 5, 6] as const;

export type Pigment = (typeof PIGMENTS)[number];

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
 * Which anatomical part a mark belongs to, across both orders.
 *
 * One union rather than one per order: the renderer maps parts to colours and
 * would otherwise need a discriminated switch to know whether `wing` or
 * `elytron` is even a possibility. Nothing stops a beetle emitting a `wing`
 * except the beetle code not doing so.
 *
 * Carried on every mark so the renderer can style parts without the generator
 * knowing anything about colour, and so tests can count legs and antennae
 * without inspecting geometry.
 */
export const INSECT_PARTS = [
  // Shared
  'head',
  'eye',
  'antenna',
  'leg',
  'spine',
  'body',
  'segment',
  // Coleoptera
  'mandible',
  'pronotum',
  'horn',
  'elytron',
  'seam',
  'stria',
  'puncture',
  'hatch',
  // Lepidoptera
  'wing',
  'vein',
  'fringe',
  // Both: whatever is painted on the wing or wing case
  'marking',
] as const;

export type InsectPart = (typeof INSECT_PARTS)[number];

/**
 * The engraver's line hierarchy: three weights and no others.
 *
 * A plate reads because its lines are ranked. The silhouette is cut heaviest,
 * the parts *inside* it — a seam, an antenna shaft, a leg — sit a step back,
 * and the texture that describes a surface is finer again. Four weights would
 * be indistinguishable at plate size; one would flatten the drawing.
 *
 * A weight, not a number: the actual widths are `--insect-stroke-*` tokens, so
 * the generator ranks a line and the stylesheet decides how heavy that rank is.
 * That is also why fitting no longer scales stroke widths — line weight belongs
 * to the plate, not to how large this particular specimen happened to be drawn.
 */
export const LINE_WEIGHTS = ['outline', 'structure', 'detail'] as const;

export type LineWeight = (typeof LINE_WEIGHTS)[number];

/**
 * What a mark is painted with.
 *
 * Four tones and no colours: the renderer resolves each against the season and
 * the specimen's pigment, so the generator can say "this ring is the deep tone
 * and this centre is bare paper" without ever learning what either looks like.
 *
 * `ink` is the engraver's line. `pigment` is the wash at strength, `deep` the
 * same earth ground darker, and `pale` is the paper showing through — which an
 * eyespot needs at its centre and nothing else does.
 *
 * Optional, because almost nothing needs to say: a mark with no tone takes the
 * default for its part, which keeps the rule that markings are pigment and
 * everything else is ink in one place.
 */
export const MARK_TONES = ['ink', 'pigment', 'deep', 'pale'] as const;

export type MarkTone = (typeof MARK_TONES)[number];

/**
 * Which half of the animal a mark belongs to.
 *
 * `centre` means the mark straddles the midline and is symmetric in itself —
 * the head capsule, the elytral seam, a moth's abdomen. `right` and `left`
 * marks come in mirrored pairs, always.
 */
export type Side = 'left' | 'right' | 'centre';

interface MarkBase {
  readonly part: InsectPart;
  readonly side: Side;
  /** What to paint this with. Omitted means "whatever this part usually is". */
  readonly tone?: MarkTone;
  /**
   * Which appendage this mark belongs to, for parts drawn from several marks.
   *
   * A leg is three strokes and a feathered antenna is a shaft plus a dozen
   * barbs, so counting marks does not count appendages. The group makes
   * "exactly six legs and two antennae" something that can be asserted directly
   * rather than inferred from a segment count that would change the moment a
   * leg gained a joint.
   */
  readonly group?: string;
  /**
   * The surface this mark must be clipped to, if any.
   *
   * Set on patterns that belong to a wing or a wing case. The renderer builds a
   * clip path per surface and puts the marks that name it inside — which is how
   * an eyespot near a scalloped margin stays on the wing without the generator
   * having to solve a polygon intersection.
   */
  readonly clipTo?: string;
}

/** An outline or a line. `closed` decides whether the renderer fills it. */
export interface PathMark extends MarkBase {
  readonly kind: 'path';
  readonly commands: readonly PathCommand[];
  readonly closed: boolean;
  /** Where this line sits in the hierarchy. Applies to closed outlines too. */
  readonly weight: LineWeight;
}

/** A filled circle: an eye, a puncture, a spot, one ring of an eyespot. */
export interface DotMark extends MarkBase {
  readonly kind: 'dot';
  readonly center: Point;
  readonly radius: number;
  /**
   * Draw as a ring rather than a disc, at this stroke width.
   *
   * An eyespot is concentric rings around a filled pupil; without this each
   * ring would have to be two overlapping discs in the right order.
   */
  readonly ring?: number;
}

export type InsectMark = DotMark | PathMark;

export interface ViewBox {
  readonly width: number;
  readonly height: number;
}

export interface InsectGeometry {
  readonly viewBox: ViewBox;
  readonly marks: readonly InsectMark[];
  /**
   * The pigment index the renderer should dress the whole animal in.
   *
   * Carried on the geometry rather than read off the form by the component, so
   * the renderer keeps taking one object and knowing nothing about beetles.
   */
  readonly pigment: Pigment;
  /**
   * Outlines the renderer should turn into clip paths, keyed by the name that
   * marks reference through `clipTo`.
   */
  readonly clips: Readonly<Record<string, readonly PathCommand[]>>;
}
