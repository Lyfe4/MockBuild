import { jitter, type Rng } from '@/lib/random';

import type { BeetleMetrics } from './metrics';
import { lineTo, moveTo, quadTo, smoothClosedPath } from '../core';
import type { InsectMark, PathCommand, Point } from '../core';
import type { BeetleForm } from './types';

/**
 * The elytra — the hardened wing cases that make up most of a beetle's
 * silhouette — plus the seam between them, their longitudinal striae and the
 * rows of punctures those striae carry.
 *
 * One elytron is authored, on the right. The seam is the only midline mark.
 */

/**
 * The outline of the right elytron.
 *
 * Runs from the shoulder, out to the widest point, then back to the apex on the
 * midline. `elytraTaper` decides whether the sides run near-parallel — a ground
 * beetle — or pinch sharply to a point.
 *
 * Exported because the markings need the same profile to stay inside it, and
 * the renderer clips to it.
 */
export function elytronProfile(form: BeetleForm, metrics: BeetleMetrics): Point[] {
  const { elytraStart: y0, elytraLength: h, elytraHalfWidth: w } = metrics;
  const taper = form.elytraTaper;

  // Where the widest point sits: further forward on a strongly tapered form.
  const shoulder = 0.16 - taper * 0.06;

  return [
    // Shoulder, just off the midline where it meets the pronotum.
    { x: w * 0.24, y: y0 },
    { x: w * 0.86, y: y0 + h * shoulder },
    { x: w, y: y0 + h * 0.34 },
    { x: w * (1 - taper * 0.34), y: y0 + h * 0.62 },
    { x: w * (0.82 - taper * 0.52), y: y0 + h * 0.84 },
    { x: w * (0.42 - taper * 0.3), y: y0 + h * 0.97 },
    // Apex, on the midline.
    { x: 0, y: y0 + h },
    { x: 0, y: y0 },
  ];
}

/** The closed outline of one elytron, as path commands. */
export function elytronOutline(form: BeetleForm, metrics: BeetleMetrics): PathCommand[] {
  return smoothClosedPath(elytronProfile(form, metrics));
}

/**
 * The elytron's half-width at a given `y`, by sampling its profile.
 *
 * Linear interpolation between profile points is a slight underestimate against
 * the smoothed outline the renderer draws, which is the right direction to be
 * wrong in: anything placed against it ends up marginally inside rather than
 * marginally over. Shared by the markings and the hatching, which both have to
 * know how much wing case there is at a given point.
 */
export function halfWidthAt(profile: readonly Point[], y: number): number {
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

export function buildElytra(form: BeetleForm, metrics: BeetleMetrics, rng: Rng): InsectMark[] {
  const { elytraStart: y0, elytraLength: h, elytraHalfWidth: w } = metrics;

  const marks: InsectMark[] = [
    {
      kind: 'path',
      part: 'elytron',
      side: 'right',
      commands: elytronOutline(form, metrics),
      closed: true,
      weight: 'outline',
    },
    {
      /**
       * The seam. The one line that must sit exactly on the midline — it is
       * where the two wing cases meet, and any wobble in it reads instantly as
       * a crooked drawing.
       */
      kind: 'path',
      part: 'seam',
      side: 'centre',
      commands: [moveTo(0, y0), lineTo(0, y0 + h)],
      closed: false,
      weight: 'structure',
    },
  ];

  const striae = Math.round(form.striaeCount);

  for (let i = 0; i < striae; i += 1) {
    /**
     * Striae run the length of the elytron, parallel to the seam and following
     * its taper. Spaced across the inner four fifths so the outermost never
     * rides the outline itself.
     */
    const across = (i + 1) / (striae + 1);
    const x = w * across * 0.82;
    const start = { x: x * 0.9, y: y0 + h * 0.06 };
    const end = { x: x * (1 - form.elytraTaper * 0.45), y: y0 + h * 0.92 };

    /**
     * A stria is engraved, not painted: the finest weight in the hierarchy and
     * always ink, whatever the specimen is coloured. It has to sit *under* the
     * markings — a spot laid over a groove is what a real elytron looks like,
     * and a groove ruled across a spot is what a diagram looks like — which the
     * build order in `generate.ts` takes care of.
     */
    marks.push({
      kind: 'path',
      part: 'stria',
      side: 'right',
      commands: [
        moveTo(start.x, start.y),
        quadTo({ x: x * 1.04, y: y0 + h * 0.5 }, { x: end.x, y: end.y }),
      ],
      closed: false,
      weight: 'detail',
    });

    if (form.punctures) {
      // Dots set along the groove, the way a punctate stria is engraved.
      const count = 7;

      for (let j = 0; j < count; j += 1) {
        const t = (j + 0.5) / count;

        marks.push({
          kind: 'dot',
          part: 'puncture',
          side: 'right',
          center: {
            x: start.x + (end.x - start.x) * t,
            y: start.y + (end.y - start.y) * t,
          },
          radius: w * 0.018 * jitter(rng, 0.18),
        });
      }
    }
  }

  return marks;
}
