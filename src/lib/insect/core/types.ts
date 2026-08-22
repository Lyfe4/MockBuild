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
  // Lepidoptera
  'wing',
  'vein',
  'fringe',
  // Both: whatever is painted on the wing or wing case
  'marking',
] as const;

export type InsectPart = (typeof INSECT_PARTS)[number];

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
  /** Stroke width in canvas units. Set for open lines; ignored when closed. */
  readonly width: number;
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
   * Outlines the renderer should turn into clip paths, keyed by the name that
   * marks reference through `clipTo`.
   */
  readonly clips: Readonly<Record<string, readonly PathCommand[]>>;
}
