/**
 * Hand-authored species plates.
 *
 * Pure TypeScript: no React, no DOM, no randomness. The schema, the parser that
 * reads its path data, the validator that checks a plate before it is trusted,
 * and the one sentence that describes it. Nothing here draws — the renderer in
 * `components/SpeciesIllustration` turns a plate into SVG and the stylesheet
 * turns its ranks and fills into ink.
 *
 * This replaces `src/lib/insect`, which stays only so the two can be compared
 * on `/lab/plates`.
 */

export { describePlate } from './describe';
export { platePoints, plateViewBox, viewBoxAttribute } from './fit';
export type { PlateViewBox } from './fit';
export type { DescribeOptions } from './describe';
export { boundsOf, formatPathData, parsePathData, pathPoints, PathSyntaxError } from './pathData';
export type { PlateBounds, PlatePoint, PlateSegment } from './pathData';
export {
  PLATE_BODY_LENGTH,
  PLATE_FILLS,
  PLATE_ORDERS,
  PLATE_PART_IDS,
  PLATE_RANKS,
  PLATE_SEXES,
  REQUIRED_PARTS,
} from './types';
export { SPECIES_PIGMENTS } from '@/types';
export type {
  PlateFill,
  PlateOrder,
  PlatePart,
  PlatePartId,
  PlateRank,
  PlateReference,
  PlateSex,
  SpeciesPigment,
  SpeciesPlate,
} from './types';
export { isValidPlate, PLATE_ERROR_CODES, validatePlate } from './validate';
export type { PlateError, PlateErrorCode } from './validate';
