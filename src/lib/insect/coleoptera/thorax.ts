import type { BeetleMetrics } from './metrics';
import { lineTo, moveTo, symmetricOutline } from '../core';
import type { InsectMark, PathCommand, Point } from '../core';
import type { BeetleForm } from './types';

/**
 * The pronotum — the shield between head and elytra — and its optional horn.
 *
 * Both straddle the midline, so both are built with `symmetricOutline` from a
 * right-hand profile. Nothing here is mirrored by `generate.ts`; these marks
 * are already symmetric in themselves.
 */

/**
 * The pronotum profile.
 *
 * `rounded` bulges smoothly to its widest point about two thirds back;
 * `angular` carries defined shoulders and a straight-cut rear margin, which is
 * most of what separates a ground beetle's outline from a ladybird's.
 */
export function pronotumProfile(form: BeetleForm, metrics: BeetleMetrics): Point[] {
  const { pronotumStart: y0, pronotumLength: h, pronotumHalfWidth: w } = metrics;

  if (form.pronotumShape === 'angular') {
    return [
      { x: 0, y: y0 },
      { x: w * 0.52, y: y0 + h * 0.05 },
      { x: w * 0.9, y: y0 + h * 0.32 },
      { x: w, y: y0 + h * 0.72 },
      // A defined hind corner, then straight across to the midline.
      { x: w * 0.98, y: y0 + h },
      { x: 0, y: y0 + h },
    ];
  }

  return [
    { x: 0, y: y0 - h * 0.02 },
    { x: w * 0.46, y: y0 + h * 0.08 },
    { x: w * 0.86, y: y0 + h * 0.38 },
    { x: w, y: y0 + h * 0.68 },
    { x: w * 0.82, y: y0 + h * 0.96 },
    { x: 0, y: y0 + h },
  ];
}

/** The closed outline of the whole pronotum. The hatching clips to it. */
export function pronotumOutline(form: BeetleForm, metrics: BeetleMetrics): PathCommand[] {
  return symmetricOutline(pronotumProfile(form, metrics));
}

/** Pronotum, midline ridge and horn. */
export function buildThorax(form: BeetleForm, metrics: BeetleMetrics): InsectMark[] {
  const { pronotumStart: y0, pronotumLength: h } = metrics;

  const marks: InsectMark[] = [
    {
      kind: 'path',
      part: 'pronotum',
      side: 'centre',
      commands: pronotumOutline(form, metrics),
      closed: true,
      weight: 'outline',
    },
  ];

  if (form.pronotumRidge) {
    marks.push({
      kind: 'path',
      part: 'pronotum',
      side: 'centre',
      commands: [moveTo(0, y0 + h * 0.14), lineTo(0, y0 + h * 0.88)],
      closed: false,
      weight: 'structure',
    });
  }

  if (form.horn) {
    /**
     * A forward-pointing horn, drawn as a narrow symmetric spike rising from
     * the front of the pronotum and overhanging the head. Authored as a half
     * profile like everything else on the midline.
     */
    const reach = metrics.headLength * (0.6 + form.hornLength * 1.6);
    const base = metrics.pronotumHalfWidth * 0.3;

    marks.push({
      kind: 'path',
      part: 'horn',
      side: 'centre',
      commands: symmetricOutline([
        { x: 0, y: y0 - reach },
        { x: base * 0.35, y: y0 - reach * 0.62 },
        { x: base * 0.7, y: y0 - reach * 0.2 },
        { x: base, y: y0 + h * 0.18 },
        { x: 0, y: y0 + h * 0.22 },
      ]),
      closed: true,
      weight: 'outline',
    });
  }

  return marks;
}
