import { mulberry32, type Rng } from '@/lib/random';

import { between, betweenInt, pick, pickPigment, wobble } from '../core';
import { normaliseMothForm } from './generate';
import type { MothForm, MothPresetSpec, MothRangeKey } from './types';

/**
 * Lepidoptera presets, as regions of parameter space.
 *
 * Same model as the beetles: `base` is what every specimen of a kind shares,
 * `ranges` and `choices` are what the seed picks from. The families are the
 * shape of real ones; no species is copied.
 */

/** Parameters with no declared range still wobble by this much. */
const FREE_WOBBLE = 0.12;

const INTEGER_KEYS = new Set<MothRangeKey>([
  'veinCount',
  'bandCount',
  'eyespotCount',
  'eyespotRings',
]);

/**
 * Fixed key order: the RNG is consumed in this sequence, so it is part of the
 * reproducibility contract. Iterating an object's own keys would make every
 * specimen depend on the order its preset happened to be written in.
 */
const NUMERIC_KEYS: readonly MothRangeKey[] = [
  'wingSpan',
  'wingAspect',
  'hindwingScale',
  'bodyLength',
  'bodyThickness',
  'antennaLength',
  'veinCount',
  'bandCount',
  'eyespotCount',
  'eyespotSize',
  'eyespotRings',
  'dustingDensity',
];

/** Picks one specimen out of a preset. See `resolveBeetlePreset` for the model. */
export function resolveMothPreset(spec: MothPresetSpec, seed: number): MothForm {
  const rng: Rng = mulberry32(seed);
  const ranges = spec.ranges ?? {};
  const choices = spec.choices ?? {};

  const numbers: Partial<Record<MothRangeKey, number>> = {};

  for (const key of NUMERIC_KEYS) {
    const range = ranges[key];

    if (range === undefined) {
      numbers[key] = wobble(rng, spec.base[key], FREE_WOBBLE);
      continue;
    }

    numbers[key] = INTEGER_KEYS.has(key) ? betweenInt(rng, range) : between(rng, range);
  }

  return normaliseMothForm({
    ...spec.base,
    ...numbers,
    forewingShape: pick(rng, choices.forewingShape ?? [], spec.base.forewingShape),
    hindwingShape: pick(rng, choices.hindwingShape ?? [], spec.base.hindwingShape),
    antennaType: pick(rng, choices.antennaType ?? [], spec.base.antennaType),
    fringe: pick(rng, choices.fringe ?? [], spec.base.fringe),
    dusting: pick(rng, choices.dusting ?? [], spec.base.dusting),
    // Last, so adding a pigment set to a preset cannot shift the traits above it.
    pigment: pickPigment(rng, choices.pigment ?? [], spec.base.pigment),
  });
}

const BASE: MothForm = {
  forewingShape: 'triangular',
  hindwingShape: 'rounded',
  wingSpan: 1,
  wingAspect: 0.62,
  hindwingScale: 0.78,
  bodyLength: 0.85,
  bodyThickness: 0.7,
  antennaType: 'filiform',
  antennaLength: 0.7,
  veinCount: 5,
  bandCount: 0,
  eyespotCount: 0,
  eyespotSize: 0.8,
  eyespotRings: 2,
  pigment: 1,
  fringe: false,
  dusting: false,
  dustingDensity: 0.4,
  scale: 0.94,
};

export const MOTH_PRESETS: readonly MothPresetSpec[] = [
  {
    name: 'Swallowtail',
    note: 'Tailed hindwings, banded, clubbed antennae',
    base: {
      ...BASE,
      forewingShape: 'triangular',
      hindwingShape: 'tailed',
      antennaType: 'clubbed',
      wingSpan: 1.15,
      wingAspect: 0.6,
      hindwingScale: 0.82,
      bodyLength: 0.72,
      bodyThickness: 0.5,
      bandCount: 3,
      veinCount: 6,
      fringe: false,
    },
    ranges: {
      bandCount: [2, 4],
      wingSpan: [1, 1.3],
      hindwingScale: [0.72, 0.92],
      wingAspect: [0.52, 0.7],
      veinCount: [4, 7],
      antennaLength: [0.6, 0.85],
    },
    choices: {
      hindwingShape: ['tailed'],
      antennaType: ['clubbed'],
      forewingShape: ['triangular'],
      // Pale ground with dark banding: ochre, bone, slate.
      pigment: [1, 6, 4],
    },
  },
  {
    name: 'Emperor',
    note: 'Feathered antennae, large concentric eyespots',
    base: {
      ...BASE,
      forewingShape: 'rounded',
      hindwingShape: 'rounded',
      antennaType: 'bipectinate',
      wingSpan: 1.1,
      wingAspect: 0.82,
      hindwingScale: 0.9,
      bodyLength: 0.9,
      bodyThickness: 1,
      eyespotCount: 1,
      eyespotSize: 1.15,
      eyespotRings: 3,
      veinCount: 4,
      antennaLength: 0.6,
    },
    ranges: {
      // Eyespots are the whole point of this one, so they move the most.
      eyespotCount: [1, 2],
      eyespotSize: [0.85, 1.4],
      eyespotRings: [2, 3],
      wingAspect: [0.74, 0.92],
      bodyThickness: [0.85, 1.15],
      antennaLength: [0.5, 0.75],
    },
    choices: {
      antennaType: ['bipectinate'],
      forewingShape: ['rounded', 'triangular'],
      hindwingShape: ['rounded'],
      // The warm end — an eyespot needs a ground it can sit dark against.
      pigment: [1, 2, 5],
    },
  },
  {
    name: 'Geometrid',
    note: 'Small and broad-winged, banded, finely dusted',
    base: {
      ...BASE,
      forewingShape: 'rounded',
      hindwingShape: 'scalloped',
      antennaType: 'filiform',
      wingSpan: 0.85,
      wingAspect: 0.88,
      hindwingScale: 0.86,
      bodyLength: 0.6,
      bodyThickness: 0.42,
      bandCount: 2,
      veinCount: 4,
      fringe: true,
      dusting: true,
      dustingDensity: 0.55,
    },
    ranges: {
      bandCount: [1, 3],
      dustingDensity: [0.3, 0.85],
      wingAspect: [0.8, 1],
      wingSpan: [0.72, 0.98],
      bodyThickness: [0.34, 0.52],
    },
    choices: {
      hindwingShape: ['scalloped', 'rounded'],
      antennaType: ['filiform'],
      dusting: [true],
      fringe: [true, false],
      // Cryptic: chalk, lichen-olive and grey.
      pigment: [6, 3, 4],
    },
  },
  {
    name: 'Hawkmoth',
    note: 'Narrow swept forewings, small hindwings, heavy streamlined body',
    base: {
      ...BASE,
      forewingShape: 'falcate',
      hindwingShape: 'rounded',
      antennaType: 'filiform',
      wingSpan: 1.25,
      wingAspect: 0.42,
      hindwingScale: 0.52,
      bodyLength: 1.15,
      bodyThickness: 1.15,
      bandCount: 1,
      veinCount: 3,
    },
    ranges: {
      wingSpan: [1.1, 1.4],
      // The character: forewings far narrower than any other preset's.
      wingAspect: [0.36, 0.5],
      hindwingScale: [0.45, 0.62],
      bodyLength: [1, 1.2],
      bodyThickness: [1, 1.2],
      bandCount: [0, 2],
    },
    choices: {
      forewingShape: ['falcate'],
      hindwingShape: ['rounded'],
      antennaType: ['filiform', 'clubbed'],
      // Bark and dead-leaf browns.
      pigment: [5, 3, 6],
    },
  },
];
