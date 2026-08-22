import { pigmentWord } from '../core';
import type { ForewingShape, HindwingShape, MothAntennaType, MothForm, WingPattern } from './types';

/**
 * Turns a form into a sentence, for the illustration's accessible description.
 *
 * Written to be read aloud, in the order a viewer takes the animal in: the
 * wings first, because they are almost the whole silhouette, then the antennae,
 * then whatever is painted on them.
 */

const FOREWING_WORDS: Record<ForewingShape, string> = {
  triangular: 'sharply triangular forewings',
  falcate: 'narrow, sickle-shaped forewings',
  rounded: 'broad, rounded forewings',
};

const HINDWING_WORDS: Record<HindwingShape, string> = {
  rounded: 'rounded hindwings',
  tailed: 'hindwings drawn out into long tails',
  scalloped: 'scallop-edged hindwings',
};

const ANTENNA_WORDS: Record<MothAntennaType, string> = {
  filiform: 'thread-like antennae',
  clubbed: 'antennae ending in a small club',
  bipectinate: 'broad feathered antennae',
};

/** Bands the wingspan against the body into a size word. */
function sizeWord(form: MothForm): string {
  const reach = form.wingSpan * (2 - form.bodyThickness * 0.5);

  if (reach >= 2.1) return 'broad-winged';
  if (reach >= 1.6) return 'medium-sized';

  return 'small';
}

function countWord(count: number): string {
  if (count <= 1) return 'a single';
  if (count === 2) return 'a pair of';

  return 'several';
}

/**
 * What each pattern layer is called.
 *
 * A layer that needs a number — bands, eyespots — takes it from the form; the
 * rest read the same however the specimen came out. Returns `null` for a layer
 * whose count happens to be zero, so the sentence does not promise a band that
 * was never drawn.
 */
function patternClause(pattern: WingPattern, form: MothForm): string | null {
  switch (pattern) {
    case 'dusting':
      return 'a fine dusting of scales';
    case 'marginalBand':
      return form.bandCount > 0
        ? `${countWord(form.bandCount)} bands following the wing margins`
        : null;
    case 'apexPatch':
      return 'a dark patch at each wing tip';
    case 'discalSpot':
      return 'a single spot in the middle of each wing';
    case 'eyespot': {
      if (form.eyespotCount <= 0) return null;

      const scale = form.eyespotSize >= 1 ? 'large' : form.eyespotSize <= 0.5 ? 'small' : '';
      const eyespots = scale === '' ? 'ringed eyespots' : `${scale} ringed eyespots`;

      return `${countWord(form.eyespotCount)} ${eyespots} on each wing`;
    }
  }
}

/**
 * A one-sentence description of the moth a form will draw.
 *
 * @example
 * describeMoth(form)
 * // "A broad-winged moth, drawn from above with wings spread: sharply
 * //  triangular forewings, hindwings drawn out into long tails, broad
 * //  feathered antennae and a pair of large eyespots on each wing."
 */
export function describeMoth(form: MothForm): string {
  const clauses: string[] = [
    FOREWING_WORDS[form.forewingShape],
    HINDWING_WORDS[form.hindwingShape],
    ANTENNA_WORDS[form.antennaType],
  ];

  /**
   * The pattern layers, in painting order, so the sentence describes the wing
   * the way it was built up. Reading the form's own list rather than inspecting
   * each count in turn is what keeps the description and the drawing in step
   * when a layer is added.
   */
  for (const pattern of form.patterns) {
    const clause = patternClause(pattern, form);

    if (clause !== null) clauses.push(clause);
  }

  // Colour in the opening, with the size: every specimen has one, so it is
  // not a character to be listed alongside the ones that vary.
  const opening = `A ${sizeWord(form)} moth in ${pigmentWord(form.pigment)}, drawn from above with wings spread`;
  const last = clauses.pop() ?? '';

  return clauses.length === 0
    ? `${opening}: ${last}.`
    : `${opening}: ${clauses.join(', ')} and ${last}.`;
}
