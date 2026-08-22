import { jitter, randomBetween, type Rng } from '@/lib/random';

import type { BeetleMetrics } from './metrics';
import { lineTo, moveTo } from './path';
import type { BeetleForm, BeetleMark, Point } from './types';
import { LEG_PAIRS } from './types';

/**
 * Six legs, in three pairs, posed as they would be on a pinned specimen —
 * splayed and slightly forward at the front, back at the rear.
 *
 * Three pairs are authored on the **right**; `generate.ts` mirrors them, which
 * is what keeps the pose symmetric. A real pinned beetle is never quite
 * symmetric, but a plate of one is: the engraver tidies it.
 */

/** Where each pair attaches, as a fraction along the body, and which way it points. */
const ATTACHMENTS: readonly { readonly along: number; readonly angle: number }[] = [
  // Fore: forward and out, ahead of the shoulders.
  { along: 0.16, angle: -0.75 },
  // Mid: straight out.
  { along: 0.34, angle: 0.15 },
  // Hind: back and out; the longest pair on most beetles.
  { along: 0.52, angle: 0.95 },
];

/**
 * One leg, as three jointed segments.
 *
 * Drawn as separate strokes of decreasing width rather than one tapered
 * outline: the width steps land exactly at the joints, which is what makes a
 * leg read as femur, tibia and tarsus rather than as a bent wire.
 */
function leg(
  form: BeetleForm,
  metrics: BeetleMetrics,
  socket: Point,
  angle: number,
  group: string,
  rng: Rng,
): BeetleMark[] {
  const reach = metrics.length * 0.3 * form.legLength;
  const spread = 0.3 + form.legSpread * 0.7;

  // Femur out from the body, tibia angled back, tarsus a short continuation.
  const femurAngle = angle * spread;
  const tibiaAngle = femurAngle + randomBetween(rng, 0.5, 0.85) * (angle < 0 ? -1 : 1);
  const tarsusAngle = tibiaAngle + 0.25 * (angle < 0 ? -1 : 1);

  const femurEnd = {
    x: socket.x + Math.cos(femurAngle) * reach * 0.52,
    y: socket.y + Math.sin(femurAngle) * reach * 0.52,
  };
  const tibiaEnd = {
    x: femurEnd.x + Math.cos(tibiaAngle) * reach * 0.46,
    y: femurEnd.y + Math.sin(tibiaAngle) * reach * 0.46,
  };
  const tarsusEnd = {
    x: tibiaEnd.x + Math.cos(tarsusAngle) * reach * 0.26,
    y: tibiaEnd.y + Math.sin(tarsusAngle) * reach * 0.26,
  };

  const femurWidth = 1.5 * form.femurThickness * jitter(rng, 0.1);

  const marks: BeetleMark[] = [
    {
      kind: 'path',
      part: 'leg',
      side: 'right',
      group,
      commands: [moveTo(socket.x, socket.y), lineTo(femurEnd.x, femurEnd.y)],
      closed: false,
      width: femurWidth,
    },
    {
      kind: 'path',
      part: 'leg',
      side: 'right',
      group,
      commands: [moveTo(femurEnd.x, femurEnd.y), lineTo(tibiaEnd.x, tibiaEnd.y)],
      closed: false,
      width: femurWidth * 0.62,
    },
    {
      kind: 'path',
      part: 'leg',
      side: 'right',
      group,
      commands: [moveTo(tibiaEnd.x, tibiaEnd.y), lineTo(tarsusEnd.x, tarsusEnd.y)],
      closed: false,
      width: femurWidth * 0.38,
    },
  ];

  if (form.tibialSpines) {
    // Two short spines off the tibia, angled towards the tarsus.
    for (const t of [0.45, 0.8]) {
      const base = {
        x: femurEnd.x + (tibiaEnd.x - femurEnd.x) * t,
        y: femurEnd.y + (tibiaEnd.y - femurEnd.y) * t,
      };
      const spineAngle = tibiaAngle + 1.2;
      const spineLength = reach * 0.11;

      marks.push({
        kind: 'path',
        part: 'spine',
        side: 'right',
        group,
        commands: [
          moveTo(base.x, base.y),
          lineTo(
            base.x + Math.cos(spineAngle) * spineLength,
            base.y + Math.sin(spineAngle) * spineLength,
          ),
        ],
        closed: false,
        width: 0.5,
      });
    }
  }

  return marks;
}

/** All three right-hand legs. */
export function buildLegs(form: BeetleForm, metrics: BeetleMetrics, rng: Rng): BeetleMark[] {
  const marks: BeetleMark[] = [];

  for (let pair = 0; pair < LEG_PAIRS; pair += 1) {
    const attachment = ATTACHMENTS[pair];

    if (attachment === undefined) continue;

    /**
     * Sockets sit just inside the body outline, so the leg emerges from under
     * the animal rather than being pinned to its edge. Which half-width to use
     * depends on whether the pair attaches beside the pronotum or the elytra.
     */
    const y = metrics.length * attachment.along;
    const halfWidth = y < metrics.elytraStart ? metrics.pronotumHalfWidth : metrics.elytraHalfWidth;

    marks.push(
      ...leg(
        form,
        metrics,
        { x: halfWidth * 0.72, y },
        attachment.angle,
        `leg-${String(pair)}`,
        rng,
      ),
    );
  }

  return marks;
}
