/**
 * SPIKE — procedural beetle generator.
 *
 * Pure TypeScript: no React, no DOM, no randomness that is not seeded. Feed it
 * a `BeetleForm` and a seed, get back plain mirrored geometry; rendering lives
 * in `components/InsectIllustration`.
 *
 * Shares only `@/lib/random` with the plant generator, so either can be deleted
 * whole when the pivot is decided.
 */
export { describeBeetle } from './describe';
export { generateBeetle, seedFromName } from './generate';
export { toPathData } from './path';
export {
  ANTENNA_TYPES,
  INSECT_PARTS,
  LEG_PAIRS,
  MARKING_TYPES,
  PRONOTUM_SHAPES,
  VIEW_BOX,
} from './types';
export type {
  AntennaType,
  BeetleForm,
  BeetleGeometry,
  BeetleMark,
  DotMark,
  InsectPart,
  MarkingType,
  PathCommand,
  PathMark,
  Point,
  PronotumShape,
  Side,
} from './types';
