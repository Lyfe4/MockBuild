import { mulberry32, randomBetween, type Rng } from '@/lib/random';

import { between, betweenInt, pick, pickPigment, wobble } from '../core';
import { normaliseMothForm } from './generate';
import { MAX_PATTERN_LAYERS, WING_PATTERNS } from './types';
import type { MothForm, MothPresetSpec, MothRangeKey, WingPattern } from './types';

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
  'bandWidth',
  'eyespotCount',
  'eyespotSize',
  'eyespotRings',
  'dustingDensity',
  'hatching',
];

/**
 * Picks the pattern layers one specimen carries.
 *
 * One to three, drawn without replacement from the set the preset allows. This
 * is the character that varies most usefully between specimens of a kind: two
 * geometrids differ by whether one has a discal spot and the other an apex
 * patch far more visibly than by either having a wider band.
 *
 * Preserves `WING_PATTERNS` order, so the result is already in painting order
 * and the seed decides *which* layers rather than which order they stack in.
 */
function pickPatterns(
  rng: Rng,
  allowed: readonly WingPattern[],
  fallback: readonly WingPattern[],
): readonly WingPattern[] {
  if (allowed.length === 0) return fallback;

  const pool = [...allowed];
  const wanted = Math.min(
    pool.length,
    Math.max(1, Math.floor(randomBetween(rng, 1, MAX_PATTERN_LAYERS + 1))),
  );
  const chosen = new Set<WingPattern>();

  for (let i = 0; i < wanted && pool.length > 0; i += 1) {
    const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
    const [taken] = pool.splice(index, 1);

    if (taken !== undefined) chosen.add(taken);
  }

  return WING_PATTERNS.filter((pattern) => chosen.has(pattern));
}

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
    eyespotPupil: pick(rng, choices.eyespotPupil ?? [], spec.base.eyespotPupil),
    patterns: pickPatterns(rng, choices.patterns ?? [], spec.base.patterns),
    // Last, so adding a pigment set to a preset cannot shift the traits above it.
    pigment: pickPigment(rng, choices.pigment ?? [], spec.base.pigment),
  });
}

const BASE: MothForm = {
  forewingShape: 'triangular',
  hindwingShape: 'rounded',
  wingSpan: 1,
  wingAspect: 0.62,
  hindwingScale: 0.92,
  bodyLength: 0.85,
  bodyThickness: 0.7,
  antennaType: 'filiform',
  antennaLength: 0.7,
  veinCount: 5,
  patterns: ['discalSpot'],
  bandCount: 0,
  bandWidth: 1,
  eyespotCount: 0,
  eyespotSize: 0.8,
  eyespotRings: 2,
  eyespotPupil: false,
  pigment: 1,
  fringe: false,
  dustingDensity: 0.4,
  hatching: 0.35,
  scale: 0.94,
};

export const MOTH_PRESETS: readonly MothPresetSpec[] = [
  {
    name: 'Swallowtail',
    note: 'Tailed hindwings, margin-following bands, clubbed antennae',
    base: {
      ...BASE,
      forewingShape: 'triangular',
      hindwingShape: 'tailed',
      antennaType: 'clubbed',
      wingSpan: 1.15,
      wingAspect: 0.6,
      hindwingScale: 0.98,
      bodyLength: 0.72,
      bodyThickness: 0.5,
      patterns: ['marginalBand', 'apexPatch'],
      bandCount: 3,
      veinCount: 6,
      fringe: false,
    },
    ranges: {
      bandCount: [2, 4],
      bandWidth: [0.7, 1.35],
      wingSpan: [1, 1.3],
      // Hindwings as long as the forewings, which is what carries the tails.
      hindwingScale: [0.88, 1.1],
      wingAspect: [0.52, 0.7],
      veinCount: [4, 7],
      antennaLength: [0.6, 0.85],
      hatching: [0.2, 0.6],
    },
    choices: {
      hindwingShape: ['tailed'],
      antennaType: ['clubbed'],
      forewingShape: ['triangular'],
      // Banded, tipped, or both. Never eyespotted: that is the emperor's.
      patterns: ['marginalBand', 'apexPatch', 'discalSpot'],
      // Pale ground with dark banding: ochre, bone, slate.
      pigment: [1, 6, 4],
    },
  },
  {
    name: 'Emperor',
    note: 'Feathered antennae, large ringed eyespots on all four wings',
    base: {
      ...BASE,
      forewingShape: 'rounded',
      hindwingShape: 'rounded',
      antennaType: 'bipectinate',
      wingSpan: 1.1,
      wingAspect: 0.82,
      hindwingScale: 1.05,
      bodyLength: 0.9,
      bodyThickness: 1,
      patterns: ['eyespot'],
      eyespotCount: 1,
      eyespotSize: 1.15,
      eyespotRings: 3,
      eyespotPupil: true,
      veinCount: 4,
      antennaLength: 0.6,
    },
    ranges: {
      // Eyespots are the whole point of this one, so they move the most.
      eyespotCount: [1, 2],
      eyespotSize: [0.85, 1.4],
      eyespotRings: [2, 3],
      wingAspect: [0.74, 0.92],
      // The broadest hindwings of any preset: a saturniid's are no smaller
      // than its forewings, and drawing them smaller made this a diagram.
      hindwingScale: [0.95, 1.15],
      bodyThickness: [0.85, 1.15],
      antennaLength: [0.5, 0.75],
      hatching: [0.3, 0.7],
    },
    choices: {
      antennaType: ['bipectinate'],
      forewingShape: ['rounded', 'triangular'],
      hindwingShape: ['rounded'],
      eyespotPupil: [true, false],
      patterns: ['eyespot', 'marginalBand', 'dusting'],
      // The warm end — an eyespot needs a ground it can sit dark against.
      pigment: [1, 2, 5],
    },
  },
  {
    name: 'Geometrid',
    note: 'Small and broad-winged, cryptically banded and dusted',
    base: {
      ...BASE,
      forewingShape: 'rounded',
      hindwingShape: 'scalloped',
      antennaType: 'filiform',
      wingSpan: 0.85,
      wingAspect: 0.88,
      hindwingScale: 0.98,
      bodyLength: 0.6,
      bodyThickness: 0.42,
      patterns: ['dusting', 'marginalBand'],
      bandCount: 2,
      veinCount: 4,
      fringe: true,
      dustingDensity: 0.55,
    },
    ranges: {
      bandCount: [1, 3],
      bandWidth: [0.5, 1.1],
      dustingDensity: [0.3, 0.85],
      wingAspect: [0.8, 1],
      wingSpan: [0.72, 0.98],
      hindwingScale: [0.92, 1.06],
      bodyThickness: [0.34, 0.52],
      hatching: [0.15, 0.5],
    },
    choices: {
      hindwingShape: ['scalloped', 'rounded'],
      antennaType: ['filiform'],
      fringe: [true, false],
      // The most variable set: cryptic moths differ in *what* they carry.
      patterns: ['dusting', 'marginalBand', 'discalSpot', 'apexPatch'],
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
      hindwingScale: 0.66,
      bodyLength: 1.15,
      bodyThickness: 1.15,
      patterns: ['marginalBand', 'discalSpot'],
      bandCount: 1,
      veinCount: 3,
    },
    ranges: {
      wingSpan: [1.1, 1.4],
      // The character: forewings far narrower than any other preset's.
      wingAspect: [0.36, 0.5],
      /**
       * Still the smallest hindwings on the sheet, but no longer a token lobe.
       * A hawkmoth's really are much shorter than its forewings — this is the
       * one preset where a small hindwing is the animal rather than an error.
       */
      hindwingScale: [0.58, 0.76],
      bodyLength: [1, 1.2],
      bodyThickness: [1, 1.2],
      bandCount: [0, 2],
      bandWidth: [0.6, 1.2],
      hatching: [0.35, 0.8],
    },
    choices: {
      forewingShape: ['falcate'],
      hindwingShape: ['rounded'],
      antennaType: ['filiform', 'clubbed'],
      patterns: ['marginalBand', 'discalSpot', 'apexPatch'],
      // Bark and dead-leaf browns.
      pigment: [5, 3, 6],
    },
  },
];
