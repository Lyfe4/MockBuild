import { jitter, type Rng } from '@/lib/random';

import type { BeetleMetrics } from './metrics';
import { closePath, curveTo, lineTo, moveTo, quadTo, symmetricOutline } from './path';
import type { BeetleForm, BeetleMark, PathCommand, Point } from './types';

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
function antenna(form: BeetleForm, metrics: BeetleMetrics, socket: Point, rng: Rng): BeetleMark[] {
  const reach = metrics.length * 0.42 * form.antennaLength;
  const marks: BeetleMark[] = [];

  // Sweeps forward and outward, curving away from the body.
  const tip = { x: socket.x + reach * 0.62, y: socket.y - reach * 0.78 };
  const control1 = { x: socket.x + reach * 0.42, y: socket.y - reach * 0.2 };
  const control2 = { x: socket.x + reach * 0.68, y: socket.y - reach * 0.46 };

  if (form.antennaType === 'serrate') {
    /**
     * Sawtooth: each segment throws a short triangular process off its outer
     * edge. Drawn as one zig-zag polyline rather than separate teeth, so the
     * shaft stays a single continuous stroke the way an engraver would cut it.
     */
    const teeth = 7;
    const commands: PathCommand[] = [moveTo(socket.x, socket.y)];

    for (let i = 1; i <= teeth; i += 1) {
      const t = i / teeth;
      const along = {
        x: socket.x + (tip.x - socket.x) * t,
        y: socket.y + (tip.y - socket.y) * t,
      };
      const outward = reach * 0.09 * (1 - t * 0.4);

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
 * One mandible.
 *
 * At `mandibleSize` 0 this is a short hook barely clear of the head; at 1.5 it
 * is a stag beetle's antler, longer than the head and curving back inwards.
 */
function mandible(form: BeetleForm, metrics: BeetleMetrics): PathCommand[] {
  const reach = metrics.headLength * (0.35 + form.mandibleSize * 1.5);
  const base = { x: metrics.headHalfWidth * 0.55, y: 0 };
  const tip = { x: base.x + reach * 0.22, y: -reach };

  return [
    moveTo(base.x, base.y),
    // Outer edge bows away from the midline, then hooks back in at the tip.
    curveTo(
      { x: base.x + reach * 0.62, y: -reach * 0.3 },
      { x: base.x + reach * 0.5, y: -reach * 0.82 },
      tip,
    ),
    // Inner edge returns, leaving a slim jaw rather than a filled wedge.
    quadTo({ x: base.x + reach * 0.12, y: -reach * 0.45 }, { x: base.x * 0.72, y: 0 }),
    closePath,
  ];
}

/** The whole head: capsule, one eye, one mandible, one antenna. */
export function buildHead(form: BeetleForm, metrics: BeetleMetrics, rng: Rng): BeetleMark[] {
  const marks: BeetleMark[] = [
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
