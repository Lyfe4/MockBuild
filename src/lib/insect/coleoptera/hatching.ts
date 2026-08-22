import { randomBetween, type Rng } from '@/lib/random';

import { elytronProfile, halfWidthAt } from './elytra';
import type { BeetleMetrics } from './metrics';
import { lineTo, moveTo } from '../core';
import type { InsectMark, Point } from '../core';
import { pronotumProfile } from './thorax';
import type { BeetleForm } from './types';

/**
 * Hatching — the short parallel strokes an engraver lays along a curved surface
 * to say that it turns away from the light.
 *
 * It goes where a beetle's shell actually falls away: the outer third of each
 * wing case, and the sides of the pronotum. Not across the middle of either.
 * Hatching over the whole surface is shading, and shading is not what a
 * specimen plate does — the plate is a diagram that happens to be beautiful, so
 * the modelling stays at the edges where it describes the form.
 *
 * The finest weight in the hierarchy, always ink, and always clipped: the
 * strokes are generated inside the surface's own measured profile *and* named
 * to a clip, on the same two-mechanism rule as the markings.
 */

/** The clip surfaces hatching is confined to. Mirrored with the marks. */
export const ELYTRON_CLIP = 'elytron-right';
export const PRONOTUM_CLIP = 'pronotum-right';

/** Strokes per wing case at full density. Enough to read as texture, not as fur. */
const ELYTRON_STROKES = 14;

/** Strokes per pronotum side. Fewer: it is a much smaller surface. */
const PRONOTUM_STROKES = 6;

/** One hatch stroke, as a mark. */
function stroke(from: Point, to: Point, clipTo: string): InsectMark {
  return {
    kind: 'path',
    part: 'hatch',
    side: 'right',
    clipTo,
    commands: [moveTo(from.x, from.y), lineTo(to.x, to.y)],
    closed: false,
    weight: 'detail',
  };
}

/**
 * Hatching along the outer third of one wing case.
 *
 * Each stroke is measured against the elytron's half-width at its own `y`, so
 * it lies inside the margin however far the wing case has tapered by then, and
 * is slanted slightly forward — hatching that ran exactly across the body would
 * read as a rung rather than as a curved surface.
 */
function elytronHatching(form: BeetleForm, metrics: BeetleMetrics, rng: Rng): InsectMark[] {
  const count = Math.round(ELYTRON_STROKES * form.hatching);

  if (count === 0) return [];

  const { elytraStart: y0, elytraLength: h } = metrics;
  const profile = elytronProfile(form, metrics);
  const marks: InsectMark[] = [];

  for (let i = 0; i < count; i += 1) {
    // Spread down the wing case, clear of the shoulder and of the apex.
    const y = y0 + h * (0.14 + ((i + 0.5) / count) * 0.72);
    const available = halfWidthAt(profile, y);

    if (available <= 0) continue;

    /**
     * Where the stroke starts and stops across the wing case. The seed varies
     * the inner end more than the outer: an engraver's hatching is even at the
     * margin and ragged where it runs out, never the other way round.
     */
    const inner = available * randomBetween(rng, 0.6, 0.72);
    const outer = available * 0.94;

    if (outer <= inner) continue;

    marks.push(stroke({ x: inner, y }, { x: outer, y: y - h * 0.035 }, ELYTRON_CLIP));
  }

  return marks;
}

/** Hatching down one side of the pronotum, on the same rule. */
function pronotumHatching(form: BeetleForm, metrics: BeetleMetrics, rng: Rng): InsectMark[] {
  const count = Math.round(PRONOTUM_STROKES * form.hatching);

  if (count === 0) return [];

  const { pronotumStart: y0, pronotumLength: h } = metrics;
  const profile = pronotumProfile(form, metrics);
  const marks: InsectMark[] = [];

  for (let i = 0; i < count; i += 1) {
    const y = y0 + h * (0.18 + ((i + 0.5) / count) * 0.64);
    const available = halfWidthAt(profile, y);

    if (available <= 0) continue;

    const inner = available * randomBetween(rng, 0.52, 0.66);
    const outer = available * 0.92;

    if (outer <= inner) continue;

    marks.push(stroke({ x: inner, y }, { x: outer, y: y - h * 0.06 }, PRONOTUM_CLIP));
  }

  return marks;
}

/** All the hatching on the right half of the animal. */
export function buildHatching(form: BeetleForm, metrics: BeetleMetrics, rng: Rng): InsectMark[] {
  if (form.hatching <= 0) return [];

  return [...elytronHatching(form, metrics, rng), ...pronotumHatching(form, metrics, rng)];
}
