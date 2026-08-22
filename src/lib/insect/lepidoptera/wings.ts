import { randomBetween, type Rng } from '@/lib/random';

import { lineTo, moveTo, quadTo, smoothClosedPath } from '../core';
import type { PathCommand, Point } from '../core';
import type { ForewingShape, HindwingShape, MothForm } from './types';

/**
 * Wing geometry.
 *
 * ## The wing's own frame
 *
 * Every wing is authored in a local frame: `u` runs 0 (base, on the body) to 1
 * (apex), and `v` runs across it — positive towards the leading edge, negative
 * towards the trailing. A profile gives the offset of each margin at any `u`.
 *
 * That frame is what makes pattern containment provable rather than hopeful.
 * A band or an eyespot placed at `(u, v)` with `|v|` inside the profile is
 * inside the wing *by construction*, whatever angle the wing is pinned at and
 * whatever shape it happens to be — no polygon intersection, no clipping the
 * geometry to find out where it ended up. The renderer still clips as a second
 * line of defence for the curved margins between samples.
 */

/**
 * A tail lobe hanging off the trailing margin.
 *
 * `at` is where along the wing it springs from, `length` how far past the
 * margin it reaches and `width` how broad it is at the root — all in the wing's
 * own units, so a tail stays in proportion whatever the wing is scaled to.
 */
export interface WingTail {
  readonly at: number;
  readonly length: number;
  readonly width: number;
}

/**
 * A wing outline, as margin offsets sampled evenly from base to apex.
 *
 * Two margins because a wing is not symmetric about its own axis: a forewing's
 * leading edge is nearly straight and its trailing edge sweeps.
 */
export interface WingProfile {
  readonly leading: readonly number[];
  readonly trailing: readonly number[];
  /** A tail lobe off the trailing margin, for swallowtails. */
  readonly tail?: WingTail;
}

const FOREWING_PROFILES: Record<ForewingShape, WingProfile> = {
  /** Straight leading edge, swept trailing edge, pointed apex. */
  triangular: {
    leading: [0.1, 0.2, 0.26, 0.3, 0.32, 0.31, 0.28, 0.2, 0.02],
    trailing: [0.14, 0.32, 0.44, 0.52, 0.56, 0.54, 0.45, 0.28, 0.02],
  },
  /**
   * Sickle-shaped: the apex is drawn out and hooked forward, so the leading
   * margin stays high almost to the tip while the trailing one falls away
   * early. This is the hawkmoth silhouette.
   */
  falcate: {
    leading: [0.09, 0.16, 0.2, 0.23, 0.25, 0.26, 0.26, 0.22, 0.04],
    trailing: [0.13, 0.26, 0.32, 0.34, 0.32, 0.26, 0.17, 0.08, 0.01],
  },
  /** Broad and blunt, with no defined apex at all. */
  rounded: {
    leading: [0.12, 0.26, 0.35, 0.41, 0.44, 0.44, 0.4, 0.31, 0.12],
    trailing: [0.14, 0.3, 0.42, 0.5, 0.54, 0.54, 0.49, 0.37, 0.13],
  },
};

const HINDWING_PROFILES: Record<HindwingShape, WingProfile> = {
  rounded: {
    leading: [0.16, 0.34, 0.44, 0.5, 0.52, 0.5, 0.44, 0.32, 0.1],
    trailing: [0.14, 0.3, 0.4, 0.46, 0.48, 0.46, 0.39, 0.27, 0.08],
  },
  /**
   * Rounded, plus a broad lobe hanging off the trailing margin.
   *
   * The tail used to be spliced in past the apex, which put it *ahead* of the
   * wing — a swallowtail's tails hang off the outer margin near the anal angle
   * and sweep away from the body, which is the whole silhouette of the group.
   * Broad at the root and only gently tapered: a hairline tail reads as a
   * scratch on the plate rather than as part of the animal.
   */
  tailed: {
    leading: [0.16, 0.34, 0.44, 0.5, 0.52, 0.5, 0.43, 0.3, 0.09],
    trailing: [0.15, 0.32, 0.42, 0.48, 0.5, 0.47, 0.38, 0.24, 0.07],
    tail: { at: 0.74, length: 0.46, width: 0.16 },
  },
  /** The margin cut into shallow lobes, as on many geometrids. */
  scalloped: {
    leading: [0.16, 0.33, 0.43, 0.49, 0.51, 0.49, 0.43, 0.31, 0.1],
    trailing: [0.14, 0.3, 0.4, 0.45, 0.47, 0.45, 0.38, 0.26, 0.08],
  },
};

/** Interpolates a margin offset at any `u` in `[0, 1]`. */
export function offsetAt(margin: readonly number[], u: number): number {
  if (margin.length === 0) return 0;

  const clamped = Math.min(1, Math.max(0, u));
  const position = clamped * (margin.length - 1);
  const index = Math.min(margin.length - 2, Math.floor(position));
  const t = position - index;

  const a = margin[index] ?? 0;
  const b = margin[index + 1] ?? a;

  return a + (b - a) * t;
}

/** The widest the given margin ever gets. */
export function widestOffset(margin: readonly number[]): number {
  return margin.reduce((best, value) => Math.max(best, value), 0);
}

/**
 * How far out along the wing the outer edge lies, at a given offset across it.
 *
 * The inverse of the profile, near the apex: for a point `v` across the wing,
 * the largest `u` at which the margin still reaches that far. It is what makes
 * a band that *follows the outer edge* possible — offset this curve inwards and
 * you have the shape an engraver actually draws, rather than a line ruled
 * across the wing at a constant `u`.
 *
 * Sampled rather than solved. The profile is piecewise linear through nine
 * points and a closed-form inverse would be more machinery than the half-unit
 * of precision is worth here.
 */
export function outerEdgeAt(margin: readonly number[], v: number): number {
  const target = Math.abs(v);
  const samples = 48;

  for (let i = samples; i >= 0; i -= 1) {
    const u = i / samples;

    if (offsetAt(margin, u) >= target) return u;
  }

  return 0;
}

/**
 * Pulls an offset across the wing back inside the margin at that point.
 *
 * The two margins are not symmetric, so which one bounds a point depends on
 * which side of the axis it is on — clamping against a single limit would let a
 * vein run off the narrow side while leaving room on the wide one.
 *
 * Every vein anchor *and every control point* goes through this. A quadratic
 * does not pass through its control point, but the renderer clips to the
 * outline and the tests measure the control points too, so a control outside
 * the wing is a mark that lies about where it is.
 *
 * @param safety Fraction of the available offset to allow, under 1.
 */
export function clampAcross(profile: WingProfile, u: number, v: number, safety: number): number {
  const margin = v >= 0 ? profile.leading : profile.trailing;
  const limit = offsetAt(margin, u) * safety;

  return v >= 0 ? Math.min(v, limit) : Math.max(v, -limit);
}

/** Where a wing sits on the body and how it is scaled into moth space. */
export interface WingPlacement {
  /** The wing base, on the body's edge, in moth space. */
  readonly base: Point;
  /** Direction of the wing axis, radians clockwise from +x. */
  readonly angle: number;
  /** Length of the axis, base to apex. */
  readonly length: number;
  /** Multiplier on the profile's margin offsets. */
  readonly chord: number;
}

/** Local wing coordinates to moth space. */
export function toMothSpace(placement: WingPlacement, u: number, v: number): Point {
  const cos = Math.cos(placement.angle);
  const sin = Math.sin(placement.angle);
  const along = u * placement.length;
  const across = v * placement.chord;

  return {
    // The axis, plus the across-component along the axis's normal.
    x: placement.base.x + along * cos - across * sin,
    y: placement.base.y + along * sin + across * cos,
  };
}

export function forewingProfile(shape: ForewingShape): WingProfile {
  return FOREWING_PROFILES[shape];
}

export function hindwingProfile(shape: HindwingShape): WingProfile {
  return HINDWING_PROFILES[shape];
}

/**
 * The tail lobe, as the run of points that replaces part of the margin walk.
 *
 * ## Which margin a tail hangs off
 *
 * The `+v` side, which for a hindwing is the one that reads as the rear edge.
 * A hindwing is set at a positive angle — its axis runs outward *and* backward
 * — so `+v`, being the axis normal, points mostly straight back down the plate.
 * That is where a swallowtail's tails go: off the outer margin near the anal
 * angle, sweeping away from the body and slightly inwards.
 *
 * The tail used to be spliced past the apex on the `-v` side, which on that
 * same reasoning pointed *forwards*, over the forewing. It read as a spur on
 * the wrong edge of the animal.
 *
 * Spliced into the outline rather than drawn as a separate shape, so the wing
 * stays one closed path and one clip — a tail that was its own mark would need
 * its own clip and would show a join where it met the wing.
 */
function tailPoints(profile: WingProfile, placement: WingPlacement, tail: WingTail): Point[] {
  const marginAt = (u: number): number => offsetAt(profile.leading, u);

  // The two roots on the margin, in ascending `u`: the walk runs base to apex.
  const rootFar = Math.max(0.06, tail.at - tail.width);
  const rootNear = Math.min(0.97, tail.at + tail.width);

  // Straight out from the margin, and a little further along the wing.
  const reach = marginAt(tail.at) + tail.length;
  const tipU = tail.at + tail.length * 0.26;

  return [
    { u: rootFar, v: marginAt(rootFar) },
    // Broad most of the way down, then closing to a blunt point.
    { u: tipU - tail.width * 0.34, v: reach * 0.62 },
    { u: tipU + tail.width * 0.16, v: reach },
    { u: tipU + tail.width * 0.5, v: reach * 0.66 },
    { u: rootNear, v: marginAt(rootNear) },
  ].map(({ u, v }) => toMothSpace(placement, u, v));
}

/**
 * The closed outline of one wing, in moth space.
 *
 * Walks out along the leading margin and back along the trailing one. A
 * scalloped hindwing has a small sine cut into the trailing return; a tailed
 * one has its lobe spliced into the outward walk at the anal angle.
 */
export function wingOutline(
  profile: WingProfile,
  placement: WingPlacement,
  scalloped: boolean,
): Point[] {
  /**
   * Sampled finely enough that the chord between two samples never cuts inside
   * the true margin by more than a hair.
   *
   * That matters for more than smoothness: patterns are placed against the
   * *smooth* profile, so a coarse outline would let a mark generated correctly
   * still land outside the polygon the renderer clips to, near the apex where
   * the margin curves most.
   */
  const samples = 30;
  const points: Point[] = [];

  const tail = profile.tail;
  const skipFrom = tail === undefined ? 2 : Math.max(0.06, tail.at - tail.width);
  const skipTo = tail === undefined ? -1 : Math.min(0.97, tail.at + tail.width);
  let tailSpliced = tail === undefined;

  for (let i = 0; i <= samples; i += 1) {
    const u = i / samples;

    // Where the tail springs from, the tail *is* the margin.
    if (!tailSpliced && tail !== undefined && u >= skipFrom) {
      points.push(...tailPoints(profile, placement, tail));
      tailSpliced = true;
    }

    if (u >= skipFrom && u <= skipTo) continue;

    points.push(toMothSpace(placement, u, offsetAt(profile.leading, u)));
  }

  for (let i = samples; i >= 0; i -= 1) {
    const u = i / samples;
    let offset = offsetAt(profile.trailing, u);

    if (scalloped) {
      // Six shallow lobes cut into the margin. Shallow on purpose: deep enough
      // to read as scalloping, not so deep it looks torn.
      offset *= 1 - 0.12 * (1 - Math.cos(u * Math.PI * 6)) * 0.5;
    }

    points.push(toMothSpace(placement, u, -offset));
  }

  return points;
}

/** The wing outline as a smooth closed path. */
export function wingPath(profile: WingProfile, placement: WingPlacement, scalloped: boolean) {
  return smoothClosedPath(wingOutline(profile, placement, scalloped));
}

/**
 * Veins radiating from the wing base.
 *
 * Curved, and forking once or twice on the way out. Straight rays from a common
 * point read as a fan or a sunburst — the one thing venation must not look
 * like; a real vein leaves the base on a shallow arc and divides before it
 * reaches the margin, and reproducing just that much is what makes the wing
 * look like a membrane rather than a shape.
 *
 * Fanned across the wing's full span rather than following real vein topology.
 * This is a plate, not a key.
 *
 * @returns One entry per vein, each holding the main stroke and its branches.
 *   Grouped rather than flattened so a vein stays one thing to count however
 *   many strokes it happens to be drawn with.
 */
export function wingVeins(
  form: MothForm,
  profile: WingProfile,
  placement: WingPlacement,
  rng: Rng,
): PathCommand[][][] {
  const count = Math.round(form.veinCount);
  const veins: PathCommand[][][] = [];

  /** How much of the wing a vein may use at any point along it. */
  const SAFETY = 0.78;

  const at = (u: number, v: number): Point =>
    toMothSpace(placement, u, clampAcross(profile, u, v, SAFETY));

  const root = toMothSpace(placement, 0.08, 0);

  for (let i = 0; i < count; i += 1) {
    // Spread across the wing from the trailing margin to the leading one.
    const across = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
    const endU = 0.8 - Math.abs(across) * 0.14;
    const margin = across >= 0 ? profile.leading : profile.trailing;
    const endV = across * offsetAt(margin, endU) * 0.82;

    /**
     * The bow. Pushed off the straight run by a fraction that grows towards the
     * margins, so the outermost veins curve most — which is what a wing does,
     * and it stops the middle vein from reading as an axis.
     */
    const bow = 0.06 + Math.abs(across) * 0.07;
    const bend = -Math.sign(across || 1) * bow;

    const end = at(endU, endV);
    const control = at(endU * 0.5, endV * 0.5 + bend);

    const strokes: PathCommand[][] = [[moveTo(root.x, root.y), quadTo(control, end)]];

    /**
     * One branch, or two on a longer vein. They fork off past the midpoint and
     * run to the margin either side of the parent, which is roughly what a
     * radial sector does and reads correctly at plate size.
     */
    const branches = endU > 0.72 ? 2 : 1;

    for (let b = 0; b < branches; b += 1) {
      const forkU = endU * randomBetween(rng, 0.52, 0.68);
      const forkV = endV * (forkU / endU) + bend * 0.6;
      const fork = at(forkU, forkV);

      // Branches diverge away from the parent, alternating side.
      const spread = (b === 0 ? 1 : -1) * randomBetween(rng, 0.1, 0.2);
      const tipU = Math.min(0.9, endU + randomBetween(rng, 0.02, 0.08));
      const tip = at(tipU, endV + spread);
      const forkControl = at((forkU + tipU) / 2, (forkV + endV + spread) / 2 + spread * 0.3);

      strokes.push([moveTo(fork.x, fork.y), quadTo(forkControl, tip)]);
    }

    veins.push(strokes);
  }

  return veins;
}

/** A line just inside the outer margin, standing in for the fringe of scales. */
export function fringeLine(profile: WingProfile, placement: WingPlacement) {
  const samples = 14;
  const commands = [];

  for (let i = 0; i <= samples; i += 1) {
    // Only the outer third of each margin: the fringe is on the wing's edge,
    // not where it meets the body.
    const u = 0.62 + (i / samples) * 0.34;
    const point = toMothSpace(placement, u, offsetAt(profile.leading, u) * 0.86);

    commands.push(i === 0 ? moveTo(point.x, point.y) : lineTo(point.x, point.y));
  }

  for (let i = samples; i >= 0; i -= 1) {
    const u = 0.62 + (i / samples) * 0.34;
    const point = toMothSpace(placement, u, -offsetAt(profile.trailing, u) * 0.86);

    commands.push(lineTo(point.x, point.y));
  }

  return commands;
}
