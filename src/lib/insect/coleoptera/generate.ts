import { clamp, hashString, mulberry32 } from '@/lib/random';

import { composeAndFit, normalisePigment, type InsectGeometry, type InsectMark } from '../core';
import { buildElytra, elytronOutline } from './elytra';
import { buildHead } from './head';
import { buildLegs } from './legs';
import { buildMarkings } from './markings';
import { metricsFor } from './metrics';
import { buildThorax } from './thorax';
import { BEETLE_VIEW_BOX, type BeetleForm } from './types';

/**
 * Composes a beetle.
 *
 * The build order is part of the reproducibility contract: head, thorax,
 * elytra, markings, legs, each drawing from the same RNG in sequence.
 * Reordering these calls changes every beetle.
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
    antennaLength: clamp(form.antennaLength, 0.3, 1.6),
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
    ...buildMarkings(safeForm, metrics, rng),
    ...buildLegs(safeForm, metrics, rng),
  ];

  return composeAndFit(authored, {
    viewBox: BEETLE_VIEW_BOX,
    scale: safeForm.scale,
    pigment: safeForm.pigment,
    // Markings name this surface through `clipTo`; the left one is mirrored
    // from it automatically, alongside the marks that reference it.
    clips: { 'elytron-right': elytronOutline(safeForm, metrics) },
  });
}
