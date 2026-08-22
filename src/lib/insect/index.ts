/**
 * Procedural insect generator.
 *
 * Pure TypeScript: no React, no DOM, no randomness that is not seeded. The
 * geometry, mirroring and fitting live in `core` so a second order can share
 * them; `coleoptera` brings the beetle anatomy.
 */
export {
  ANTENNA_TYPES,
  BEETLE_PRESETS,
  BEETLE_VIEW_BOX,
  describeBeetle,
  generateBeetle,
  LEG_PAIRS,
  MARKING_TYPES,
  normaliseBeetleForm,
  PRONOTUM_SHAPES,
  resolveBeetlePreset,
  seedFromName,
} from './coleoptera';
export type {
  AntennaType,
  BeetleForm,
  BeetlePresetSpec,
  BeetleRangeKey,
  MarkingType,
  PronotumShape,
} from './coleoptera';

export { INSECT_PARTS, markPoints, toPathData } from './core';
export type {
  DotMark,
  InsectGeometry,
  InsectMark,
  InsectPart,
  PathCommand,
  PathMark,
  Point,
  Side,
  ViewBox,
} from './core';
