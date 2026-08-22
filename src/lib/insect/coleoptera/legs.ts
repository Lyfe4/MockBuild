import { randomBetween, type Rng } from '@/lib/random';

import type { BeetleMetrics } from './metrics';
import { lineTo, moveTo, quadTo } from '../core';
import type { InsectMark, LineWeight, PathCommand, Point } from '../core';
import type { BeetleForm } from './types';
import { LEG_PAIRS } from './types';

/**
 * Six legs, in three pairs, posed as they would be on a pinned specimen —
 * splayed and slightly forward at the front, back at the rear.
 *
 * Three pairs are authored on the **right**; `generate.ts` mirrors them, which
 * is what keeps the pose symmetric. A real pinned beetle is never quite
 * symmetric, but a plate of one is: the engraver tidies it.
 */

/**
 * How heavy a femur is drawn.
 *
 * `femurThickness` used to set a stroke width directly. It now selects a rank
 * in the line hierarchy instead, which is the only thing that decides a stroke
 * width anywhere in the drawing — a stag's swollen femur really is as heavy a
 * line as the body outline, and a longhorn's is genuinely a detail.
 */
function femurWeight(thickness: number): LineWeight {
  if (thickness >= 1.15) return 'outline';
  if (thickness <= 0.8) return 'detail';

  return 'structure';
}

/** One rank lighter, so the tibia always steps back from the femur. */
function lighter(weight: LineWeight): LineWeight {
  return weight === 'outline' ? 'structure' : 'detail';
}

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
  spread: number,
  rng: Rng,
): InsectMark[] {
  const reach = metrics.length * 0.3 * form.legLength;

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

  const heft = femurWeight(form.femurThickness);

  /**
   * A segment as a shallow arc rather than a straight line.
   *
   * Real limbs bow; a leg built from three exactly straight sticks reads as a
   * mechanism. The control point is pushed off the chord along its own normal,
   * so the bow follows whatever direction the segment happens to run in.
   *
   * @param bow Fraction of the segment's length, signed. Small — 6–8% is a
   *   noticeable curve at this scale and 15% is a banana.
   */
  const arc = (from: Point, to: Point, bow: number): PathCommand[] => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };

    return [
      moveTo(from.x, from.y),
      // Normal to the chord is (dy, -dx).
      quadTo({ x: midpoint.x + dy * bow, y: midpoint.y - dx * bow }, to),
    ];
  };

  // Femur and tibia bow in opposite directions, which is what gives a leg its
  // characteristic shallow zig rather than a single smooth curve.
  const marks: InsectMark[] = [
    {
      kind: 'path',
      part: 'leg',
      side: 'right',
      group,
      commands: arc(socket, femurEnd, 0.08),
      closed: false,
      weight: heft,
    },
    {
      kind: 'path',
      part: 'leg',
      side: 'right',
      group,
      commands: arc(femurEnd, tibiaEnd, -0.07),
      closed: false,
      weight: lighter(heft),
    },
    {
      kind: 'path',
      part: 'leg',
      side: 'right',
      group,
      commands: arc(tibiaEnd, tarsusEnd, 0.05),
      closed: false,
      weight: 'detail',
    },
  ];

  /**
   * The tarsus, hinted rather than drawn out: three tick marks across the last
   * segment standing in for its joints. A beetle's tarsus is five tiny
   * segments, and drawing them at this scale produces a smudge — the ticks
   * carry the idea of "jointed foot" at a fraction of the ink.
   */
  const tarsusVector = { x: tarsusEnd.x - tibiaEnd.x, y: tarsusEnd.y - tibiaEnd.y };
  const tarsusLength = Math.hypot(tarsusVector.x, tarsusVector.y);

  if (tarsusLength > 0) {
    // Unit normal to the tarsus, so each tick crosses it squarely whatever
    // direction the leg happens to run in.
    const nx = -tarsusVector.y / tarsusLength;
    const ny = tarsusVector.x / tarsusLength;
    const half = reach * 0.022;

    for (const t of [0.4, 0.68, 0.94]) {
      const at = { x: tibiaEnd.x + tarsusVector.x * t, y: tibiaEnd.y + tarsusVector.y * t };

      marks.push({
        kind: 'path',
        part: 'leg',
        side: 'right',
        group,
        commands: [
          moveTo(at.x - nx * half, at.y - ny * half),
          lineTo(at.x + nx * half, at.y + ny * half),
        ],
        closed: false,
        weight: 'detail',
      });
    }
  }

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
        weight: 'detail',
      });
    }
  }

  return marks;
}

/** All three right-hand legs. */
export function buildLegs(form: BeetleForm, metrics: BeetleMetrics, rng: Rng): InsectMark[] {
  const marks: InsectMark[] = [];

  /**
   * The pose, varied by seed.
   *
   * `legSpread` says how splayed this *kind* of beetle is set; the seed then
   * decides how this particular specimen was pinned, because no two are pinned
   * alike. Drawn once here rather than per pair so the whole animal shares one
   * pose instead of each leg picking its own.
   */
  const spread = (0.3 + form.legSpread * 0.7) * randomBetween(rng, 0.86, 1.14);

  for (let pair = 0; pair < LEG_PAIRS; pair += 1) {
    const attachment = ATTACHMENTS[pair];

    if (attachment === undefined) continue;

    /**
     * A slight offset per pair, on top of the pose. The setter works down the
     * animal one pair at a time and never quite repeats the angle; without
     * this the three pairs fan out with a regularity that reads as drawn
     * rather than as pinned. Mirrored with everything else, so the two sides
     * still match exactly.
     */
    const offset = randomBetween(rng, -0.16, 0.16);

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
        attachment.angle + offset,
        `leg-${String(pair)}`,
        spread,
        rng,
      ),
    );
  }

  return marks;
}
