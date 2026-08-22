import type { Point } from '../core';
import { lineTo, moveTo, smoothClosedPath } from '../core';
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
 * A wing outline, as margin offsets sampled evenly from base to apex.
 *
 * Two margins because a wing is not symmetric about its own axis: a forewing's
 * leading edge is nearly straight and its trailing edge sweeps.
 */
export interface WingProfile {
  readonly leading: readonly number[];
  readonly trailing: readonly number[];
  /** A tail lobe off the trailing margin near the apex, for swallowtails. */
  readonly tail?: { readonly length: number; readonly width: number };
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
  /** Rounded, plus a long narrow lobe trailing from the anal angle. */
  tailed: {
    leading: [0.16, 0.34, 0.44, 0.5, 0.52, 0.5, 0.43, 0.3, 0.09],
    trailing: [0.15, 0.32, 0.42, 0.48, 0.5, 0.47, 0.38, 0.24, 0.07],
    tail: { length: 0.52, width: 0.07 },
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
 * The closed outline of one wing, in moth space.
 *
 * Walks out along the leading margin and back along the trailing one. A
 * scalloped hindwing has a small sine cut into the trailing return; a tailed
 * one has a lobe spliced in at the anal angle.
 */
export function wingOutline(
  profile: WingProfile,
  placement: WingPlacement,
  scalloped: boolean,
): Point[] {
  const samples = 18;
  const points: Point[] = [];

  for (let i = 0; i <= samples; i += 1) {
    const u = i / samples;

    points.push(toMothSpace(placement, u, offsetAt(profile.leading, u)));
  }

  if (profile.tail !== undefined) {
    /**
     * The tail: out past the apex on the trailing side and back, as a narrow
     * lobe. Spliced into the outline rather than drawn as a separate shape, so
     * the wing stays one closed path and one clip.
     */
    const { length, width } = profile.tail;
    const tipU = 1 + length;

    points.push(
      toMothSpace(placement, 1.02, -offsetAt(profile.trailing, 0.94) * 0.35),
      toMothSpace(placement, tipU * 0.7, -0.16 - width),
      toMothSpace(placement, tipU, -0.2),
      toMothSpace(placement, tipU * 0.72, -0.16 + width * 0.5),
    );
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
 * Drawn thin and stopping just short of the margin, the way an engraver
 * indicates venation without diagramming it. Fanned across the wing's full
 * span rather than following real vein topology — this is a plate, not a key.
 */
export function wingVeins(
  form: MothForm,
  profile: WingProfile,
  placement: WingPlacement,
): Point[][] {
  const count = Math.round(form.veinCount);
  const veins: Point[][] = [];

  for (let i = 0; i < count; i += 1) {
    // Spread across the wing from the trailing margin to the leading one.
    const across = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
    const endU = 0.82 - Math.abs(across) * 0.14;
    const margin = across >= 0 ? profile.leading : profile.trailing;
    const endV = across * offsetAt(margin, endU) * 0.82;

    veins.push([toMothSpace(placement, 0.08, 0), toMothSpace(placement, endU, endV)]);
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
