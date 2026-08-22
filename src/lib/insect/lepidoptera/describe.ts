import type { ForewingShape, HindwingShape, MothAntennaType, MothForm } from './types';

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

  if (form.bandCount > 0) {
    clauses.push(`${countWord(form.bandCount)} bands across the wings`);
  }

  if (form.eyespotCount > 0) {
    const scale = form.eyespotSize >= 1 ? 'large' : form.eyespotSize <= 0.5 ? 'small' : '';
    const eyespots = scale === '' ? 'eyespots' : `${scale} eyespots`;

    clauses.push(`${countWord(form.eyespotCount)} ${eyespots} on each wing`);
  }

  if (form.dusting) clauses.push('a fine dusting of scales');

  const opening = `A ${sizeWord(form)} moth, drawn from above with wings spread`;
  const last = clauses.pop() ?? '';

  return clauses.length === 0
    ? `${opening}: ${last}.`
    : `${opening}: ${clauses.join(', ')} and ${last}.`;
}
