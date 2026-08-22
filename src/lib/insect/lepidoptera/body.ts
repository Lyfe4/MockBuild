import { jitter, type Rng } from '@/lib/random';

import type { InsectMark, PathCommand, Point } from '../core';
import { curveTo, lineTo, moveTo, symmetricOutline } from '../core';
import type { MothMetrics } from './metrics';
import type { MothForm } from './types';

/**
 * Head, thorax, abdomen and antennae.
 *
 * The body is one symmetric outline straddling the midline; the abdomen carries
 * a few hatch lines standing in for its segments. Antennae are paired and
 * authored on the right only.
 */

/** One antenna is one appendage however many marks draw it. */
const ANTENNA_GROUP = 'antenna-0';

/**
 * The body as a single silhouette: head, thorax and abdomen in one outline.
 *
 * Drawn as one shape rather than three because on a pinned specimen they read
 * as one — the divisions are shown by the hatch lines and by the wings covering
 * the joins, not by a gap in the outline.
 */
function bodyOutline(metrics: MothMetrics): PathCommand[] {
  const { headHalfWidth: hw, thoraxHalfWidth: tw, abdomenHalfWidth: aw } = metrics;

  return symmetricOutline([
    { x: 0, y: -metrics.headLength * 0.12 },
    { x: hw * 0.8, y: metrics.headLength * 0.3 },
    { x: hw, y: metrics.headLength },
    { x: tw * 0.94, y: metrics.thoraxStart + metrics.thoraxLength * 0.3 },
    { x: tw, y: metrics.thoraxStart + metrics.thoraxLength * 0.7 },
    { x: aw, y: metrics.abdomenStart + metrics.abdomenLength * 0.2 },
    { x: aw * 0.82, y: metrics.abdomenStart + metrics.abdomenLength * 0.62 },
    { x: aw * 0.44, y: metrics.abdomenStart + metrics.abdomenLength * 0.9 },
    { x: 0, y: metrics.bodyEnd },
  ]);
}

/**
 * One antenna, from its socket at the front of the head.
 *
 * As with the beetles, the shaft is shared and the type is expressed at the
 * tip — except for `bipectinate`, where the whole shaft is the character.
 */
function antenna(form: MothForm, metrics: MothMetrics, socket: Point, rng: Rng): InsectMark[] {
  const reach = metrics.bodyEnd * 0.5 * form.antennaLength;
  const tip = { x: socket.x + reach * 0.66, y: socket.y - reach * 0.72 };
  const control1 = { x: socket.x + reach * 0.36, y: socket.y - reach * 0.24 };
  const control2 = { x: socket.x + reach * 0.62, y: socket.y - reach * 0.5 };

  const marks: InsectMark[] = [
    {
      kind: 'path',
      part: 'antenna',
      side: 'right',
      group: ANTENNA_GROUP,
      commands: [moveTo(socket.x, socket.y), curveTo(control1, control2, tip)],
      closed: false,
      width: form.antennaType === 'bipectinate' ? 0.9 : 0.7,
    },
  ];

  if (form.antennaType === 'clubbed') {
    // The butterfly character: a swollen tip on an otherwise thread-like shaft.
    marks.push({
      kind: 'dot',
      part: 'antenna',
      side: 'right',
      group: ANTENNA_GROUP,
      center: tip,
      radius: reach * 0.075 * jitter(rng, 0.1),
    });
  }

  if (form.antennaType === 'bipectinate') {
    /**
     * Feathered: a comb of barbs off both sides of the shaft, longest at the
     * middle and tapering to nothing at either end. This is the saturniid
     * character and it is the whole reason the antenna is worth drawing large.
     */
    const barbs = 11;

    for (let i = 1; i < barbs; i += 1) {
      const t = i / barbs;
      const along = {
        x: socket.x + (tip.x - socket.x) * t,
        y: socket.y + (tip.y - socket.y) * t,
      };
      // A shallow arch: nothing at the base, longest around the middle.
      const length = reach * 0.17 * Math.sin(t * Math.PI);
      // Perpendicular to the shaft's overall run.
      const dx = tip.x - socket.x;
      const dy = tip.y - socket.y;
      const norm = Math.hypot(dx, dy) || 1;
      const nx = (-dy / norm) * length;
      const ny = (dx / norm) * length;

      marks.push({
        kind: 'path',
        part: 'antenna',
        side: 'right',
        group: ANTENNA_GROUP,
        commands: [moveTo(along.x - nx, along.y - ny), lineTo(along.x + nx, along.y + ny)],
        closed: false,
        width: 0.42,
      });
    }
  }

  return marks;
}

/** Body outline, segment hatching, eyes and antennae. */
export function buildBody(form: MothForm, metrics: MothMetrics, rng: Rng): InsectMark[] {
  const marks: InsectMark[] = [
    {
      kind: 'path',
      part: 'body',
      side: 'centre',
      commands: bodyOutline(metrics),
      closed: true,
      width: 0,
    },
  ];

  /**
   * Abdominal segments, as hatch lines across the body.
   *
   * Five is enough to say "segmented" without turning the abdomen into a
   * ladder. They stop short of the outline on both sides so the silhouette
   * stays clean.
   */
  const segments = 5;

  for (let i = 1; i <= segments; i += 1) {
    const t = i / (segments + 1);
    const y = metrics.abdomenStart + metrics.abdomenLength * t;
    // Follow the abdomen's taper rather than running the full width.
    const halfWidth = metrics.abdomenHalfWidth * (1 - t * 0.5) * 0.78;

    marks.push({
      kind: 'path',
      part: 'segment',
      side: 'centre',
      commands: [moveTo(-halfWidth, y), lineTo(halfWidth, y)],
      closed: false,
      width: 0.5,
    });
  }

  marks.push({
    kind: 'dot',
    part: 'eye',
    side: 'right',
    center: { x: metrics.headHalfWidth * 0.72, y: metrics.headLength * 0.52 },
    radius: metrics.headHalfWidth * 0.34,
  });

  marks.push(
    ...antenna(form, metrics, { x: metrics.headHalfWidth * 0.6, y: metrics.headLength * 0.2 }, rng),
  );

  return marks;
}
