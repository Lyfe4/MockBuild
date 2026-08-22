import { randomBetween, type Rng } from '@/lib/random';

import { elytronProfile } from './elytra';
import type { BeetleMetrics } from './metrics';
import { closePath, lineTo, moveTo } from '../core';
import type { InsectMark, Point } from '../core';
import type { BeetleForm } from './types';

/**
 * What is painted on the elytra.
 *
 * Markings are authored for the **right** elytron only and mirrored with
 * everything else, so a ladybird's spots land in matching pairs rather than
 * scattering.
 *
 * ## Staying inside the wing case
 *
 * Two mechanisms, deliberately both. The geometry here is generated *within*
 * the elytron's own profile — every spot centre is placed against the measured
 * half-width at its own `y`, and bands are cut to it — so the data is correct
 * on its own and can be asserted on without rendering. The renderer then also
 * clips the markings group to the elytron outline, which catches the edges that
 * a bounding-box calculation cannot: a round spot near a curving margin.
 *
 * Relying on the clip alone would produce geometry that lies about itself;
 * relying on the placement alone would let a spot bleed over a taper.
 */

/** The clip surface markings are confined to. Mirrored with them. */
export const ELYTRON_CLIP = 'elytron-right';

/**
 * The elytron's half-width at a given `y`, by sampling its profile.
 *
 * Linear interpolation between profile points is a slight underestimate against
 * the smoothed outline the renderer draws, which is the right direction to be
 * wrong in: markings end up marginally inside rather than marginally over.
 */
function halfWidthAt(profile: readonly Point[], y: number): number {
  let best = 0;

  for (let i = 0; i < profile.length - 1; i += 1) {
    const a = profile[i];
    const b = profile[i + 1];

    if (a === undefined || b === undefined) continue;
    if (a.y === b.y) continue;

    const low = Math.min(a.y, b.y);
    const high = Math.max(a.y, b.y);

    if (y < low || y > high) continue;

    const t = (y - a.y) / (b.y - a.y);

    best = Math.max(best, a.x + (b.x - a.x) * t);
  }

  return best;
}

export function buildMarkings(form: BeetleForm, metrics: BeetleMetrics, rng: Rng): InsectMark[] {
  if (form.marking === 'none') return [];

  const { elytraStart: y0, elytraLength: h } = metrics;
  const profile = elytronProfile(form, metrics);
  const marks: InsectMark[] = [];

  switch (form.marking) {
    /** Round spots, scattered down the wing case in a loose column. */
    case 'spots': {
      const count = Math.max(1, Math.round(form.markingCount));
      const nominal = metrics.elytraHalfWidth * 0.17 * form.markingSize;

      for (let i = 0; i < count; i += 1) {
        // Spread down the elytron, kept clear of the shoulder and the apex.
        const t = (i + 0.5) / count;
        const y = y0 + h * (0.12 + t * 0.74);
        const available = halfWidthAt(profile, y);

        if (available <= 0) continue;

        /**
         * Shrink the spot to the space rather than shoving it into place.
         *
         * A large spot low on a strongly tapered wing case simply does not fit
         * at its nominal size, and clamping its centre would push it over the
         * seam — a spot straddling the midline is the one thing that reads
         * instantly as broken on a bilateral animal. A slightly smaller spot
         * reads as a slightly smaller spot.
         */
        const radius = Math.min(nominal, available * 0.4);
        const usable = Math.max(0, available - radius * 2);

        // Anywhere in the space left over: `x - radius >= 0` and
        // `x + radius <= available` both hold by construction.
        const x = radius + usable * randomBetween(rng, 0.15, 0.85);

        marks.push({
          kind: 'dot',
          part: 'marking',
          side: 'right',
          clipTo: ELYTRON_CLIP,
          center: { x, y },
          radius,
        });
      }

      return marks;
    }

    /** Transverse bands, cut to the wing case at both of their edges. */
    case 'bands': {
      const count = Math.max(1, Math.round(form.markingCount));
      const thickness = h * 0.07 * form.markingSize;

      for (let i = 0; i < count; i += 1) {
        const centre = y0 + h * (0.18 + ((i + 0.5) / count) * 0.66);
        const top = centre - thickness / 2;
        const bottom = centre + thickness / 2;
        const topWidth = halfWidthAt(profile, top);
        const bottomWidth = halfWidthAt(profile, bottom);

        marks.push({
          kind: 'path',
          part: 'marking',
          side: 'right',
          clipTo: ELYTRON_CLIP,
          // A quadrilateral following the margin, so the band narrows with the
          // taper rather than sticking out of it.
          commands: [
            moveTo(0, top),
            lineTo(topWidth * 0.97, top),
            lineTo(bottomWidth * 0.97, bottom),
            lineTo(0, bottom),
            closePath,
          ],
          closed: true,
          width: 0,
        });
      }

      return marks;
    }

    /** One longitudinal stripe, running beside the seam. */
    case 'stripe': {
      const top = y0 + h * 0.1;
      const bottom = y0 + h * 0.9;

      /**
       * Sized against the narrowest point it has to cross, not the widest. A
       * stripe fitted to the shoulder would run off the edge by the time it
       * reached a tapered apex.
       */
      const narrowest = Math.min(halfWidthAt(profile, top), halfWidthAt(profile, bottom));

      if (narrowest <= 0) return marks;

      const inner = Math.min(metrics.elytraHalfWidth * 0.18, narrowest * 0.25);
      const outer = Math.min(
        inner + metrics.elytraHalfWidth * 0.3 * form.markingSize,
        narrowest * 0.95,
      );

      marks.push({
        kind: 'path',
        part: 'marking',
        side: 'right',
        clipTo: ELYTRON_CLIP,
        commands: [
          moveTo(inner, top),
          lineTo(outer, top),
          lineTo(outer, bottom),
          lineTo(inner, bottom),
          closePath,
        ],
        closed: true,
        width: 0,
      });

      return marks;
    }
  }
}
