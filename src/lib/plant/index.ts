/**
 * Procedural plant generator.
 *
 * Pure TypeScript: no React, no DOM, no randomness that is not seeded. Feed it
 * a `PlantForm` and a seed, get back plain geometry; rendering lives in
 * `components/PlantIllustration`.
 */
export { generatePlant, seedFromId } from './generate';
export { describePlant } from './describe';
export { toPathData } from './path';
export { hashString, mulberry32 } from './prng';
export { FLOWER_TYPES, LEAF_SHAPES, VIEW_BOX } from './types';
export type {
  FlowerMark,
  FlowerType,
  LeafMark,
  LeafShape,
  PathCommand,
  PlantForm,
  PlantGeometry,
  Point,
  StemMark,
} from './types';
