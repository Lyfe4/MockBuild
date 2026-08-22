import { mulberry32, type Rng } from '@/lib/random';

import { between, betweenInt, pick, wobble } from '../core';
import { normaliseBeetleForm } from './generate';
import type { BeetleForm, BeetlePresetSpec, BeetleRangeKey } from './types';

/**
 * Beetle presets, as regions of parameter space.
 *
 * Each spec says what every specimen of a kind shares and what the seed is free
 * to choose. Resolving it produces one individual. The point is that a sheet of
 * one preset reads as a series of specimens of one kind rather than the same
 * diagram repeated — which is what the first version did, because the seed only
 * reached details that consumed randomness downstream.
 *
 * The families are the shape of real ones; no species is copied.
 */

/** Parameters with no declared range still wobble by this much. */
const FREE_WOBBLE = 0.12;

/** Integer-valued parameters, so resolution knows to round rather than clamp. */
const INTEGER_KEYS = new Set<BeetleRangeKey>(['striaeCount', 'markingCount']);

/** Every numeric parameter, so `wobble` can reach the ones without a range. */
const NUMERIC_KEYS: readonly BeetleRangeKey[] = [
  'bodyLength',
  'bodyWidth',
  'headWidth',
  'eyeSize',
  'antennaLength',
  'mandibleSize',
  'pronotumWidth',
  'hornLength',
  'elytraLength',
  'elytraWidth',
  'elytraTaper',
  'striaeCount',
  'legLength',
  'femurThickness',
  'legSpread',
  'markingCount',
  'markingSize',
];

/**
 * Picks one specimen out of a preset.
 *
 * Continuous characters with a declared range are sampled across it; the rest
 * take the base value with a small wobble, so nothing is ever pinned exactly.
 * Categorical characters are chosen from their allowed set, or kept from the
 * base when the preset declares none — those are the traits that make the
 * preset what it is, and rolling them would produce a different beetle rather
 * than a different individual.
 */
export function resolveBeetlePreset(spec: BeetlePresetSpec, seed: number): BeetleForm {
  const rng: Rng = mulberry32(seed);
  const ranges = spec.ranges ?? {};
  const choices = spec.choices ?? {};

  const numbers: Partial<Record<BeetleRangeKey, number>> = {};

  /**
   * Fixed key order, not `Object.keys(ranges)`: the RNG is consumed in this
   * sequence, so the order is part of the reproducibility contract. Iterating
   * an object's own keys would make every specimen depend on the order the
   * preset happened to be written in.
   */
  for (const key of NUMERIC_KEYS) {
    const range = ranges[key];

    if (range === undefined) {
      numbers[key] = wobble(rng, spec.base[key], FREE_WOBBLE);
      continue;
    }

    numbers[key] = INTEGER_KEYS.has(key) ? betweenInt(rng, range) : between(rng, range);
  }

  return normaliseBeetleForm({
    ...spec.base,
    ...numbers,
    antennaType: pick(rng, choices.antennaType ?? [], spec.base.antennaType),
    pronotumShape: pick(rng, choices.pronotumShape ?? [], spec.base.pronotumShape),
    marking: pick(rng, choices.marking ?? [], spec.base.marking),
    pronotumRidge: pick(rng, choices.pronotumRidge ?? [], spec.base.pronotumRidge),
    punctures: pick(rng, choices.punctures ?? [], spec.base.punctures),
    horn: pick(rng, choices.horn ?? [], spec.base.horn),
    tibialSpines: pick(rng, choices.tibialSpines ?? [], spec.base.tibialSpines),
  });
}

/** Shared baseline, so each preset states only what makes it that preset. */
const BASE: BeetleForm = {
  bodyLength: 0.85,
  bodyWidth: 0.8,
  headWidth: 0.6,
  eyeSize: 0.6,
  antennaType: 'filiform',
  antennaLength: 0.9,
  mandibleSize: 0.2,
  pronotumShape: 'rounded',
  pronotumWidth: 0.85,
  pronotumRidge: false,
  horn: false,
  hornLength: 0.5,
  elytraLength: 0.85,
  elytraWidth: 1,
  elytraTaper: 0.3,
  striaeCount: 0,
  punctures: false,
  legLength: 1,
  femurThickness: 1,
  legSpread: 0.6,
  tibialSpines: false,
  marking: 'none',
  markingCount: 4,
  markingSize: 0.9,
  scale: 0.92,
};

export const BEETLE_PRESETS: readonly BeetlePresetSpec[] = [
  {
    name: 'Longhorn',
    note: 'Slender and parallel-sided, antennae longer than the body',
    base: {
      ...BASE,
      bodyLength: 1,
      bodyWidth: 0.52,
      elytraLength: 1,
      elytraWidth: 0.72,
      elytraTaper: 0.18,
      antennaType: 'filiform',
      antennaLength: 1.4,
      eyeSize: 0.8,
      pronotumWidth: 0.72,
      legLength: 1.15,
      femurThickness: 0.7,
      marking: 'bands',
      markingCount: 2,
      markingSize: 0.7,
    },
    ranges: {
      // The defining character, and the one that varies most between specimens.
      antennaLength: [1.05, 1.6],
      bodyWidth: [0.46, 0.62],
      elytraTaper: [0.1, 0.34],
      markingCount: [1, 3],
      markingSize: [0.5, 0.95],
      legLength: [1, 1.3],
    },
    // Banded or plain: both are common in the group.
    choices: { marking: ['bands', 'none'], antennaType: ['filiform'] },
  },
  {
    name: 'Ladybird',
    note: 'Almost hemispherical, short clubbed antennae, spotted',
    base: {
      ...BASE,
      bodyLength: 0.62,
      bodyWidth: 1.15,
      elytraLength: 0.62,
      elytraWidth: 1.2,
      elytraTaper: 0.05,
      antennaType: 'clavate',
      antennaLength: 0.38,
      headWidth: 0.42,
      eyeSize: 0.45,
      pronotumWidth: 0.78,
      legLength: 0.62,
      femurThickness: 0.85,
      legSpread: 0.45,
      marking: 'spots',
      markingCount: 5,
      markingSize: 1.05,
    },
    ranges: {
      // Spot number and size are exactly what tells two ladybirds apart.
      markingCount: [3, 9],
      markingSize: [0.6, 1.35],
      bodyWidth: [1.02, 1.2],
      elytraWidth: [1.08, 1.2],
      elytraTaper: [0, 0.14],
      antennaLength: [0.32, 0.48],
    },
    choices: { marking: ['spots'], antennaType: ['clavate'], pronotumShape: ['rounded'] },
  },
  {
    name: 'Stag',
    note: 'Heavy build, antler-like mandibles, lamellate antennae',
    base: {
      ...BASE,
      bodyLength: 0.95,
      bodyWidth: 0.95,
      elytraLength: 0.8,
      elytraWidth: 1.05,
      elytraTaper: 0.22,
      antennaType: 'lamellate',
      antennaLength: 0.55,
      mandibleSize: 1.2,
      headWidth: 1,
      eyeSize: 0.5,
      pronotumShape: 'angular',
      pronotumWidth: 0.98,
      pronotumRidge: true,
      legLength: 1.05,
      femurThickness: 1.3,
      legSpread: 0.75,
      tibialSpines: true,
      marking: 'none',
    },
    ranges: {
      // Stag mandibles vary enormously between individuals — major and minor
      // males of one species barely look related.
      mandibleSize: [0.8, 1.5],
      headWidth: [0.82, 1],
      bodyWidth: [0.86, 1.05],
      femurThickness: [1.1, 1.4],
      antennaLength: [0.45, 0.68],
    },
    choices: {
      antennaType: ['lamellate'],
      pronotumShape: ['angular', 'rounded'],
      pronotumRidge: [true, false],
      marking: ['none'],
    },
  },
  {
    name: 'Ground',
    note: 'Tapered, deeply striate wing cases, long running legs',
    base: {
      ...BASE,
      bodyLength: 0.92,
      bodyWidth: 0.72,
      elytraLength: 0.92,
      elytraWidth: 0.9,
      elytraTaper: 0.62,
      antennaType: 'serrate',
      antennaLength: 0.85,
      headWidth: 0.7,
      pronotumShape: 'angular',
      pronotumWidth: 0.8,
      pronotumRidge: true,
      striaeCount: 8,
      punctures: true,
      legLength: 1.3,
      femurThickness: 0.9,
      legSpread: 0.85,
      tibialSpines: true,
      marking: 'stripe',
      markingSize: 0.6,
    },
    ranges: {
      striaeCount: [4, 10],
      elytraTaper: [0.42, 0.78],
      bodyWidth: [0.64, 0.82],
      legLength: [1.15, 1.4],
      markingSize: [0.45, 0.8],
    },
    choices: {
      antennaType: ['serrate', 'filiform'],
      punctures: [true, false],
      marking: ['stripe', 'none'],
      pronotumShape: ['angular'],
    },
  },
];
