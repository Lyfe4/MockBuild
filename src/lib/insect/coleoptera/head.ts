import { jitter, type Rng } from '@/lib/random';

import type { BeetleMetrics } from './metrics';
import { closePath, curveTo, lineTo, moveTo, quadTo, symmetricOutline } from '../core';
import type { InsectMark, PathCommand, Point } from '../core';
import type { BeetleForm } from './types';

/**
 * Head capsule, eyes, mandibles and antennae.
 *
 * Everything paired is authored on the **right** only and given `side: 'right'`.
 * `generate.ts` reflects it. The head capsule itself straddles the midline and
 * is built with `symmetricOutline`, so it is symmetric by construction rather
 * than by luck.
 */

/**
 * One antenna is one appendage however many marks draw it — a lamellate tip is
 * a shaft plus four blades. They all carry this group so the count is countable.
 */
const ANTENNA_GROUP = 'antenna-0';

/** The head capsule: a rounded trapezoid, wider at the back where it meets the thorax. */
function headCapsule(metrics: BeetleMetrics): PathCommand[] {
  const { headLength: h, headHalfWidth: w } = metrics;

  return symmetricOutline([
    { x: 0, y: -h * 0.06 },
    { x: w * 0.5, y: 0 },
    { x: w * 0.88, y: h * 0.3 },
    { x: w, y: h * 0.68 },
    { x: w * 0.95, y: h },
    { x: 0, y: h * 1.02 },
  ]);
}

/**
 * One antenna, from its socket at the front corner of the head.
 *
 * The four types differ in what happens at the *tip*, so the shaft is shared
 * and each type adds its own terminal marks. That is also how a key reads them:
 * the shaft tells you little, the last few segments tell you the family.
 */
function antenna(form: BeetleForm, metrics: BeetleMetrics, socket: Point, rng: Rng): InsectMark[] {
  const reach = metrics.length * 0.42 * form.antennaLength;
  const marks: InsectMark[] = [];

  // Sweeps forward and outward, curving away from the body.
  const tip = { x: socket.x + reach * 0.62, y: socket.y - reach * 0.78 };
  const control1 = { x: socket.x + reach * 0.42, y: socket.y - reach * 0.2 };
  const control2 = { x: socket.x + reach * 0.68, y: socket.y - reach * 0.46 };

  if (form.antennaType === 'serrate') {
    /**
     * Sawtooth: each segment throws a short process off its outer edge.
     *
     * Deliberately shallow. The teeth are a *texture* on an otherwise straight
     * antenna — a serrate antenna in the hand looks like a file, not a zigzag —
     * and at the amplitude this first had, the shaft stopped reading as an
     * antenna at all. Fewer teeth, and around 40% of the former depth: the eye
     * should register a rough edge before it registers individual points.
     */
    const teeth = 5;
    const commands: PathCommand[] = [moveTo(socket.x, socket.y)];

    for (let i = 1; i <= teeth; i += 1) {
      const t = i / teeth;
      const along = {
        x: socket.x + (tip.x - socket.x) * t,
        y: socket.y + (tip.y - socket.y) * t,
      };
      const outward = reach * 0.036 * (1 - t * 0.4);

      commands.push(lineTo(along.x + outward, along.y + outward * 0.35), lineTo(along.x, along.y));
    }

    marks.push({
      kind: 'path',
      part: 'antenna',
      side: 'right',
      group: ANTENNA_GROUP,
      commands,
      closed: false,
      width: 1,
    });

    return marks;
  }

  marks.push({
    kind: 'path',
    part: 'antenna',
    side: 'right',
    group: ANTENNA_GROUP,
    commands: [moveTo(socket.x, socket.y), curveTo(control1, control2, tip)],
    closed: false,
    width: 1.1,
  });

  if (form.antennaType === 'clavate') {
    // A club: one swollen terminal segment.
    marks.push({
      kind: 'dot',
      part: 'antenna',
      side: 'right',
      group: ANTENNA_GROUP,
      center: tip,
      radius: reach * 0.1 * jitter(rng, 0.12),
    });
  }

  if (form.antennaType === 'lamellate') {
    /**
     * A fan of flat plates the beetle can open and shut — the scarab and stag
     * character. Drawn as short parallel blades springing from the tip, angled
     * so the fan reads even at thumbnail size.
     */
    const blades = 4;
    const bladeLength = reach * 0.3;

    for (let i = 0; i < blades; i += 1) {
      const spread = (i / (blades - 1)) * 0.9 - 0.45;
      const angle = Math.atan2(tip.y - control2.y, tip.x - control2.x) + spread;

      marks.push({
        kind: 'path',
        part: 'antenna',
        side: 'right',
        group: ANTENNA_GROUP,
        commands: [
          moveTo(tip.x, tip.y),
          lineTo(tip.x + Math.cos(angle) * bladeLength, tip.y + Math.sin(angle) * bladeLength),
        ],
        closed: false,
        width: 0.9,
      });
    }
  }

  return marks;
}

/**
 * One mandible, drawn as an antler.
 *
 * The shape a stag beetle's jaws actually make, and the one that reads as
 * *mandibles* rather than as horns at thumbnail size: they bow outwards from
 * the head, then sweep back **inwards** so the tips nearly meet over the
 * midline, and the inner edge carries two or three teeth.
 *
 * The inward hook is what does the work. A pair of outward-curving spikes reads
 * as antennae or as horns; a pair that closes towards each other reads as a
 * grasping jaw, which is what it is.
 *
 * At `mandibleSize` 0 this collapses to a short hook barely clear of the head,
 * with the teeth too small to see — which is right for the beetles that have
 * ordinary jaws.
 */
function mandible(form: BeetleForm, metrics: BeetleMetrics): PathCommand[] {
  const reach = metrics.headLength * (0.35 + form.mandibleSize * 1.6);
  const base = { x: metrics.headHalfWidth * 0.55, y: 0 };

  /**
   * How far the tips close towards the midline, as a fraction of the outward
   * bow. Large jaws close further — a major male's tips almost touch — so this
   * scales with size rather than being fixed.
   */
  const closure = 0.35 + form.mandibleSize * 0.42;
  const bow = reach * 0.5;

  const tip = { x: base.x + bow * (1 - closure), y: -reach };

  const commands: PathCommand[] = [
    moveTo(base.x, base.y),
    // Outer edge: out and forward, then curving back in to the tip.
    curveTo(
      { x: base.x + bow * 1.25, y: -reach * 0.34 },
      { x: base.x + bow * 1.05, y: -reach * 0.82 },
      tip,
    ),
  ];

  /**
   * Inner edge, walked back down towards the head with teeth cut into it. Two
   * teeth on a modest jaw, three on a full antler — more than that turns to
   * mush at the size this is drawn.
   */
  const teeth = form.mandibleSize >= 1 ? 3 : 2;
  const innerBase = { x: base.x * 0.68, y: 0 };

  for (let i = 1; i <= teeth; i += 1) {
    const t = i / (teeth + 1);
    // Down the inner edge from tip towards head.
    const along = {
      x: tip.x + (innerBase.x - tip.x) * t,
      y: tip.y + (innerBase.y - tip.y) * t,
    };
    // Each tooth points inwards, towards the opposing jaw.
    const toothDepth = reach * 0.13 * (1 - t * 0.35);

    commands.push(
      lineTo(along.x - toothDepth, along.y - toothDepth * 0.25),
      lineTo(along.x, along.y),
    );
  }

  commands.push(quadTo({ x: base.x * 0.5, y: -reach * 0.18 }, innerBase), closePath);

  return commands;
}

/** The whole head: capsule, one eye, one mandible, one antenna. */
export function buildHead(form: BeetleForm, metrics: BeetleMetrics, rng: Rng): InsectMark[] {
  const marks: InsectMark[] = [
    {
      kind: 'path',
      part: 'head',
      side: 'centre',
      commands: headCapsule(metrics),
      closed: true,
      width: 0,
    },
  ];

  marks.push({
    kind: 'dot',
    part: 'eye',
    side: 'right',
    // Set at the widest part of the head, as a compound eye sits.
    center: { x: metrics.headHalfWidth * 0.82, y: metrics.headLength * 0.55 },
    radius: metrics.headHalfWidth * 0.3 * (0.6 + form.eyeSize * 0.7),
  });

  marks.push({
    kind: 'path',
    part: 'mandible',
    side: 'right',
    commands: mandible(form, metrics),
    closed: true,
    width: 0,
  });

  marks.push(
    ...antenna(
      form,
      metrics,
      { x: metrics.headHalfWidth * 0.72, y: metrics.headLength * 0.22 },
      rng,
    ),
  );

  return marks;
}
