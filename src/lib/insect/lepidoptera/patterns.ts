import { randomBetween, type Rng } from '@/lib/random';

import type { InsectMark } from '../core';
import { closePath, lineTo, moveTo } from '../core';
import type { MothForm } from './types';
import { offsetAt, toMothSpace, type WingPlacement, type WingProfile } from './wings';

/**
 * What is painted on the wings: bands, eyespots and dusting.
 *
 * ## Staying on the wing
 *
 * Every pattern is placed in the wing's own `(u, v)` frame and sized against
 * the margin offsets at its own `u`, so it is inside the outline *by
 * construction* — no polygon intersection, and the geometry is correct on its
 * own rather than only after the renderer clips it. Clipping is still applied
 * on top, because a straight sample between two profile points cannot follow a
 * curved margin exactly and an eyespot near the edge would otherwise clear it
 * by a hair.
 *
 * `INSET` is the margin of safety: patterns use this fraction of the space
 * actually available, which is what keeps them clear of a scalloped edge.
 */
const INSET = 0.82;

/** The clip surface a wing's patterns belong to. Mirrored with them. */
export function wingClip(wing: 'forewing' | 'hindwing'): string {
  return `${wing}-right`;
}

interface PatternContext {
  readonly form: MothForm;
  readonly profile: WingProfile;
  readonly placement: WingPlacement;
  readonly clipTo: string;
}

/**
 * Transverse bands across the wing.
 *
 * Run across the wing rather than along it — perpendicular to the axis, from
 * one margin to the other — because that is how a band on a real wing runs, and
 * it is what makes them read as bands rather than as stripes.
 */
function bands({ form, profile, placement, clipTo }: PatternContext): InsectMark[] {
  const count = Math.round(form.bandCount);
  const marks: InsectMark[] = [];

  for (let i = 0; i < count; i += 1) {
    // Spread across the outer two thirds; a band at the wing base would be
    // hidden under the body.
    const centre = 0.34 + ((i + 0.5) / count) * 0.52;
    const halfThickness = 0.035;
    const from = Math.max(0.05, centre - halfThickness);
    const to = Math.min(0.97, centre + halfThickness);

    marks.push({
      kind: 'path',
      part: 'marking',
      side: 'right',
      clipTo,
      commands: [
        pointCommand(placement, from, offsetAt(profile.leading, from) * INSET, true),
        pointCommand(placement, to, offsetAt(profile.leading, to) * INSET, false),
        pointCommand(placement, to, -offsetAt(profile.trailing, to) * INSET, false),
        pointCommand(placement, from, -offsetAt(profile.trailing, from) * INSET, false),
        closePath,
      ],
      closed: true,
      weight: 'detail',
    });
  }

  return marks;
}

function pointCommand(placement: WingPlacement, u: number, v: number, start: boolean) {
  const point = toMothSpace(placement, u, v);

  return start ? moveTo(point.x, point.y) : lineTo(point.x, point.y);
}

/**
 * Eyespots: a filled pupil inside concentric rings.
 *
 * Emitted as rings rather than as stacked discs so the paper shows between
 * them, which is what an engraver would do and what stops a large eyespot
 * reading as a blot.
 */
function eyespots({ form, profile, placement, clipTo }: PatternContext): InsectMark[] {
  const count = Math.round(form.eyespotCount);
  const rings = Math.max(1, Math.round(form.eyespotRings));
  const marks: InsectMark[] = [];

  for (let i = 0; i < count; i += 1) {
    const u = count === 1 ? 0.56 : 0.4 + (i / (count - 1)) * 0.34;

    // The space actually available across the wing at this point.
    const available = Math.min(offsetAt(profile.leading, u), offsetAt(profile.trailing, u)) * INSET;

    if (available <= 0) continue;

    // Shrink to fit rather than clamp the position: an eyespot pushed off its
    // own centre to fit reads as a mistake, a slightly smaller one does not.
    const outer = Math.min(form.eyespotSize * 0.16, available * 0.92);
    const centre = toMothSpace(placement, u, 0);

    for (let ring = rings; ring >= 1; ring -= 1) {
      marks.push({
        kind: 'dot',
        part: 'marking',
        side: 'right',
        clipTo,
        center: centre,
        radius: outer * placement.chord * (ring / rings),
        ring: outer * placement.chord * 0.14,
      });
    }

    // The pupil, filled.
    marks.push({
      kind: 'dot',
      part: 'marking',
      side: 'right',
      clipTo,
      center: centre,
      radius: outer * placement.chord * 0.28,
    });
  }

  return marks;
}

/** A field of fine dots — the scale dusting that mottles a geometrid's wing. */
function dusting(context: PatternContext, rng: Rng): InsectMark[] {
  const { form, profile, placement, clipTo } = context;
  const count = Math.round(10 + form.dustingDensity * 40);
  const marks: InsectMark[] = [];

  for (let i = 0; i < count; i += 1) {
    const u = randomBetween(rng, 0.12, 0.94);
    const leading = offsetAt(profile.leading, u) * INSET;
    const trailing = offsetAt(profile.trailing, u) * INSET;
    const v = randomBetween(rng, -trailing, leading);
    const point = toMothSpace(placement, u, v);

    marks.push({
      kind: 'dot',
      part: 'marking',
      side: 'right',
      clipTo,
      center: point,
      radius: placement.chord * 0.012,
    });
  }

  return marks;
}

/** Every pattern on one wing, in the order they are painted. */
export function buildWingPatterns(
  form: MothForm,
  profile: WingProfile,
  placement: WingPlacement,
  clipTo: string,
  rng: Rng,
): InsectMark[] {
  const context: PatternContext = { form, profile, placement, clipTo };

  return [...bands(context), ...eyespots(context), ...(form.dusting ? dusting(context, rng) : [])];
}
