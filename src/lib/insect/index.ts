import { describeBeetle, generateBeetle, type BeetleForm } from './coleoptera';
import type { InsectGeometry } from './core';
import { describeMoth, generateMoth, type MothForm } from './lepidoptera';

/**
 * Procedural insect generator.
 *
 * Pure TypeScript: no React, no DOM, no randomness that is not seeded. Two
 * orders share a core of geometry, mirroring and fitting; each brings its own
 * anatomy.
 */

/**
 * One insect, of whichever order.
 *
 * A discriminated union rather than a common base interface: a beetle's
 * parameters and a moth's have almost nothing in common, and flattening them
 * into one optional-heavy shape would let a caller ask for a beetle with
 * eyespots. The tag is what lets `generateInsect` stay exhaustive.
 */
export type InsectForm =
  | { readonly order: 'coleoptera'; readonly form: BeetleForm }
  | { readonly order: 'lepidoptera'; readonly form: MothForm };

/** The insect orders the generator can draw. */
export const INSECT_ORDERS = ['coleoptera', 'lepidoptera'] as const;

export type InsectOrder = (typeof INSECT_ORDERS)[number];

/**
 * Draws any insect.
 *
 * The single entry point the renderer depends on, so `InsectIllustration` never
 * learns what a pronotum or an eyespot is — it takes an `InsectForm` and gets
 * marks back. Adding an order is a case here and a folder, and touches no
 * component.
 */
export function generateInsect(insect: InsectForm, seed: number): InsectGeometry {
  switch (insect.order) {
    case 'coleoptera':
      return generateBeetle(insect.form, seed);
    case 'lepidoptera':
      return generateMoth(insect.form, seed);
  }
}

/** The accessible description for any insect. */
export function describeInsect(insect: InsectForm): string {
  switch (insect.order) {
    case 'coleoptera':
      return describeBeetle(insect.form);
    case 'lepidoptera':
      return describeMoth(insect.form);
  }
}

export {
  ANTENNA_TYPES,
  BEETLE_PRESETS,
  BEETLE_VIEW_BOX,
  describeBeetle,
  generateBeetle,
  LEG_PAIRS,
  MARKING_TYPES,
  PRONOTUM_SHAPES,
  resolveBeetlePreset,
  seedFromName,
} from './coleoptera';
export type {
  AntennaType,
  BeetleForm,
  BeetlePresetSpec,
  MarkingType,
  PronotumShape,
} from './coleoptera';

export {
  describeMoth,
  FOREWING_SHAPES,
  generateMoth,
  HINDWING_SHAPES,
  MOTH_ANTENNA_TYPES,
  MOTH_PRESETS,
  MOTH_VIEW_BOX,
  resolveMothPreset,
  WING_COUNT,
} from './lepidoptera';
export type {
  ForewingShape,
  HindwingShape,
  MothAntennaType,
  MothForm,
  MothPresetSpec,
} from './lepidoptera';

export {
  INSECT_PARTS,
  LINE_WEIGHTS,
  markPoints,
  MARK_TONES,
  PIGMENTS,
  pigmentWord,
  toPathData,
} from './core';
export type {
  DotMark,
  InsectGeometry,
  InsectMark,
  InsectPart,
  LineWeight,
  MarkTone,
  PathCommand,
  PathMark,
  Pigment,
  Point,
  Side,
  ViewBox,
} from './core';
