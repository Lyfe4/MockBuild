import { clamp, mulberry32 } from '@/lib/random';

import {
  composeAndFit,
  lineTo,
  moveTo,
  normalisePigment,
  type InsectGeometry,
  type InsectMark,
} from '../core';
import { buildBody } from './body';
import { metricsFor } from './metrics';
import { buildWingPatterns, wingClip } from './patterns';
import { MOTH_VIEW_BOX, type MothForm } from './types';
import {
  fringeLine,
  forewingProfile,
  hindwingProfile,
  wingPath,
  wingVeins,
  type WingPlacement,
  type WingProfile,
} from './wings';

/**
 * Composes a moth.
 *
 * The build order is part of the reproducibility contract: body, then the
 * hindwing and forewing in that order — hindwing first so the forewing overlaps
 * it, the way the wings sit on a set specimen.
 *
 * The form is drawn exactly as given; variation between specimens of a kind
 * happens when a preset is resolved.
 */

export function normaliseMothForm(form: MothForm): MothForm {
  return {
    forewingShape: form.forewingShape,
    hindwingShape: form.hindwingShape,
    wingSpan: clamp(form.wingSpan, 0.6, 1.4),
    wingAspect: clamp(form.wingAspect, 0.35, 1),
    hindwingScale: clamp(form.hindwingScale, 0.45, 1),
    bodyLength: clamp(form.bodyLength, 0.5, 1.2),
    bodyThickness: clamp(form.bodyThickness, 0.3, 1.2),
    antennaType: form.antennaType,
    antennaLength: clamp(form.antennaLength, 0.3, 1.1),
    veinCount: clamp(Math.round(form.veinCount), 0, 9),
    bandCount: clamp(Math.round(form.bandCount), 0, 4),
    eyespotCount: clamp(Math.round(form.eyespotCount), 0, 3),
    eyespotSize: clamp(form.eyespotSize, 0.3, 1.4),
    eyespotRings: clamp(Math.round(form.eyespotRings), 1, 3),
    pigment: normalisePigment(form.pigment),
    fringe: form.fringe,
    dusting: form.dusting,
    dustingDensity: clamp(form.dustingDensity, 0, 1),
    scale: clamp(form.scale, 0.5, 1),
  };
}

/** One wing: outline, veins, fringe and patterns, all clipped to the same surface. */
function buildWing(
  form: MothForm,
  profile: WingProfile,
  placement: WingPlacement,
  wing: 'forewing' | 'hindwing',
  scalloped: boolean,
  rng: ReturnType<typeof mulberry32>,
): { marks: InsectMark[]; outline: ReturnType<typeof wingPath> } {
  const outline = wingPath(profile, placement, scalloped);
  const clipTo = wingClip(wing);

  const marks: InsectMark[] = [
    {
      kind: 'path',
      part: 'wing',
      side: 'right',
      group: wing,
      commands: outline,
      closed: true,
      weight: 'outline',
    },
  ];

  for (const [index, vein] of wingVeins(form, profile, placement).entries()) {
    const [from, to] = vein;

    if (from === undefined || to === undefined) continue;

    marks.push({
      kind: 'path',
      part: 'vein',
      side: 'right',
      group: `${wing}-vein-${String(index)}`,
      clipTo,
      commands: [moveTo(from.x, from.y), lineTo(to.x, to.y)],
      closed: false,
      weight: 'detail',
    });
  }

  if (form.fringe) {
    marks.push({
      kind: 'path',
      part: 'fringe',
      side: 'right',
      group: wing,
      clipTo,
      commands: fringeLine(profile, placement),
      closed: false,
      weight: 'detail',
    });
  }

  marks.push(...buildWingPatterns(form, profile, placement, clipTo, rng));

  return { marks, outline };
}

/**
 * Generates the geometry for one moth or butterfly.
 *
 * Deterministic: the same `(form, seed)` always produces a deeply equal result.
 */
export function generateMoth(form: MothForm, seed: number): InsectGeometry {
  const safeForm = normaliseMothForm(form);
  const rng = mulberry32(seed);
  const metrics = metricsFor(safeForm);

  const hindwing = buildWing(
    safeForm,
    hindwingProfile(safeForm.hindwingShape),
    metrics.hindwing,
    'hindwing',
    safeForm.hindwingShape === 'scalloped',
    rng,
  );

  const forewing = buildWing(
    safeForm,
    forewingProfile(safeForm.forewingShape),
    metrics.forewing,
    'forewing',
    false,
    rng,
  );

  /**
   * Painting order, back to front: hindwing, forewing, then the body over both.
   * On a set specimen the forewing overlaps the hindwing and the thorax covers
   * where they meet, and drawing them in any other order shows the joins.
   */
  const authored: InsectMark[] = [
    ...hindwing.marks,
    ...forewing.marks,
    ...buildBody(safeForm, metrics, rng),
  ];

  return composeAndFit(authored, {
    viewBox: MOTH_VIEW_BOX,
    scale: safeForm.scale,
    pigment: safeForm.pigment,
    clips: {
      [wingClip('hindwing')]: hindwing.outline,
      [wingClip('forewing')]: forewing.outline,
    },
  });
}
