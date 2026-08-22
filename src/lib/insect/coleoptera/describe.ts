import { pigmentWord } from '../core';
import type { AntennaType, BeetleForm, MarkingType } from './types';

/**
 * Turns a form into a sentence, for the illustration's accessible description.
 *
 * Written to be *read aloud*, in the order a viewer takes the animal in: shape
 * first, then the two characters that actually distinguish beetles at a glance
 * — the antennae and whatever is painted on the wing cases — then the
 * exaggerations, if any.
 *
 * It reads the same parameters the drawing does, so the two cannot drift.
 */

/** Body proportion, as a shape word rather than a number. */
function shapeWord(form: BeetleForm): string {
  const aspect = form.bodyWidth * form.elytraWidth;

  if (aspect >= 0.95) return 'broad, rounded';
  if (aspect >= 0.7) return 'oval';

  return 'slender, elongate';
}

const ANTENNA_WORDS: Record<AntennaType, string> = {
  filiform: 'long thread-like antennae',
  clavate: 'antennae ending in a small club',
  lamellate: 'antennae tipped with a fan of flat plates',
  serrate: 'saw-toothed antennae',
};

/** Bands `markingCount` into a word, so the sentence does not read as data. */
function countWord(count: number): string {
  if (count <= 1) return 'a single';
  if (count === 2) return 'a pair of';
  if (count <= 4) return 'a few';

  return 'numerous';
}

function markingClause(marking: MarkingType, count: number, size: number): string | null {
  const scale = size >= 1.1 ? 'large' : size <= 0.6 ? 'small' : '';
  const sized = (noun: string): string => (scale === '' ? noun : `${scale} ${noun}`);

  switch (marking) {
    case 'none':
      return null;
    case 'spots':
      return `${countWord(count)} ${sized('spots')} on each wing case`;
    case 'bands':
      return `${countWord(count)} ${sized('bands')} across the wing cases`;
    case 'stripe':
      return `a ${scale === '' ? 'single' : scale} stripe down each wing case`;
  }
}

/**
 * A one-sentence description of the beetle a form will draw.
 *
 * @example
 * describeBeetle(form)
 * // "A slender, elongate beetle with long thread-like antennae, grooved wing
 * //  cases and a pair of small spots on each wing case."
 */
export function describeBeetle(form: BeetleForm): string {
  const clauses: string[] = [ANTENNA_WORDS[form.antennaType]];

  if (form.striaeCount >= 4) {
    clauses.push('deeply grooved wing cases');
  } else if (form.striaeCount > 0) {
    clauses.push('finely grooved wing cases');
  }

  const markings = markingClause(form.marking, form.markingCount, form.markingSize);

  if (markings !== null) clauses.push(markings);

  // The showy characters last: they are the exception, not the description.
  if (form.mandibleSize >= 0.8) clauses.push('greatly enlarged antler-like jaws');
  if (form.horn) clauses.push('a forward-pointing horn on the thorax');

  const shape = shapeWord(form);
  // 'A oval beetle' is the kind of thing that makes a description sound generated.
  const article = /^[aeiou]/i.test(shape) ? 'An' : 'A';
  /**
   * The colour goes in the opening rather than in the clause list. It is not a
   * character the animal either has or lacks — every specimen is washed in
   * something — so it belongs with the shape, where a viewer meets it.
   */
  const opening = `${article} ${shape} beetle in ${pigmentWord(form.pigment)}, drawn from above`;

  if (clauses.length === 1) return `${opening} with ${clauses[0] ?? ''}.`;

  const last = clauses.pop() ?? '';

  return `${opening} with ${clauses.join(', ')} and ${last}.`;
}
