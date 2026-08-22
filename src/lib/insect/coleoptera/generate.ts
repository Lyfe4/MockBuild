import { clamp, hashString, mulberry32 } from '@/lib/random';

import { composeAndFit, normalisePigment, type InsectGeometry, type InsectMark } from '../core';
import { buildElytra, elytronOutline } from './elytra';
import { buildHatching } from './hatching';
import { buildHead } from './head';
import { buildLegs } from './legs';
import { buildMarkings } from './markings';
import { metricsFor } from './metrics';
import { buildThorax, pronotumOutline } from './thorax';
import { BEETLE_VIEW_BOX, type BeetleForm } from './types';

/**
 * Composes a beetle.
 *
 * The build order is part of the reproducibility contract: head, thorax,
 * elytra, hatching, markings, legs, each drawing from the same RNG in sequence.
 * Reordering these calls changes every beetle.
 *
 * It is also the painting order. Striae and hatching describe the surface;
 * markings are laid on top of both; the legs go last so nothing on the body
 * crosses them.
 *
 * The form is drawn exactly as given. Variation between specimens of a kind
 * happens when a preset is resolved (`presets.ts`), not here — so a caller who
 * hands over a specific form gets that beetle and not a nudged version of it.
 */

/** Turns any string — a preset name, a catalogue number — into a seed. */
export function seedFromName(name: string): number {
  return hashString(name);
}

export function normaliseBeetleForm(form: BeetleForm): BeetleForm {
  return {
    bodyLength: clamp(form.bodyLength, 0.6, 1),
    bodyWidth: clamp(form.bodyWidth, 0.4, 1.2),
    headWidth: clamp(form.headWidth, 0.3, 1),
    eyeSize: clamp(form.eyeSize, 0.2, 1),
    antennaType: form.antennaType,
    antennaLength: clamp(form.antennaLength, 0.3, 1.8),
    mandibleSize: clamp(form.mandibleSize, 0, 1.5),
    pronotumShape: form.pronotumShape,
    pronotumWidth: clamp(form.pronotumWidth, 0.5, 1.2),
    pronotumRidge: form.pronotumRidge,
    horn: form.horn,
    hornLength: clamp(form.hornLength, 0.2, 1),
    elytraLength: clamp(form.elytraLength, 0.5, 1),
    elytraWidth: clamp(form.elytraWidth, 0.5, 1.2),
    elytraTaper: clamp(form.elytraTaper, 0, 1),
    striaeCount: clamp(Math.round(form.striaeCount), 0, 10),
    punctures: form.punctures,
    hatching: clamp(form.hatching, 0, 1),
    legLength: clamp(form.legLength, 0.5, 1.4),
    femurThickness: clamp(form.femurThickness, 0.4, 1.4),
    legSpread: clamp(form.legSpread, 0, 1),
    tibialSpines: form.tibialSpines,
    pigment: normalisePigment(form.pigment),
    marking: form.marking,
    markingCount: clamp(Math.round(form.markingCount), 1, 9),
    markingSize: clamp(form.markingSize, 0.3, 1.5),
    scale: clamp(form.scale, 0.5, 1),
  };
}

/**
 * Generates the geometry for one beetle.
 *
 * Deterministic: the same `(form, seed)` always produces a deeply equal result.
 */
export function generateBeetle(form: BeetleForm, seed: number): InsectGeometry {
  const safeForm = normaliseBeetleForm(form);
  const rng = mulberry32(seed);
  const metrics = metricsFor(safeForm);

  const authored: InsectMark[] = [
    ...buildHead(safeForm, metrics, rng),
    ...buildThorax(safeForm, metrics),
    ...buildElytra(safeForm, metrics, rng),
    // Hatching before the markings, so a spot sits over the shading exactly as
    // it sits over the striae — the surface is described first, then painted.
    ...buildHatching(safeForm, metrics, rng),
    ...buildMarkings(safeForm, metrics, rng),
    ...buildLegs(safeForm, metrics, rng),
  ];

  return composeAndFit(authored, {
    viewBox: BEETLE_VIEW_BOX,
    scale: safeForm.scale,
    pigment: safeForm.pigment,
    /**
     * Markings and hatching name these surfaces through `clipTo`; the left of
     * each is mirrored automatically, alongside the marks that reference it.
     * The pronotum straddles the midline, so its two clips are the same shape —
     * it is named `-right` only so the mirror rule reaches the hatching on it.
     */
    clips: {
      'elytron-right': elytronOutline(safeForm, metrics),
      'pronotum-right': pronotumOutline(safeForm, metrics),
    },
  });
}
