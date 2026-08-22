import type { FlowerType, LeafShape, PlantForm, PlantHabit } from './types';

/**
 * Turns a form into a sentence.
 *
 * This is the illustration's accessible description, so it is written to be
 * *read aloud*: it describes what someone would see, in the order they would
 * notice it — habit first, because that is what you register from across the
 * room — and stops. It is not a caption and not a botanical diagnosis; the
 * specimen's own record carries that.
 *
 * It reads the same parameters the drawing does, so the two cannot drift.
 */

/** Bands `height` into a word. Thresholds match the visible steps in habit. */
function heightWord(height: number): string {
  if (height >= 0.8) return 'tall';
  if (height >= 0.55) return 'medium-height';

  return 'low';
}

/**
 * The habit clause.
 *
 * `rosette` and `tuft` do not branch at all, so for those the phrase replaces
 * the branching description entirely rather than contradicting it.
 */
const HABIT_WORDS: Record<PlantHabit, string> = {
  upright: 'upright',
  arching: 'arching',
  rosette: 'ground-hugging rosette of a',
  tuft: 'grassy tuft of a',
  trailing: 'trailing',
};

/** Whether the habit branches, and so whether a branching phrase makes sense. */
function branches(habit: PlantHabit): boolean {
  return habit !== 'rosette' && habit !== 'tuft';
}

/** Bands branch fan-out and depth together — what the silhouette actually shows. */
function branchingWord(form: PlantForm): string {
  if (form.branchDepth <= 1) return 'barely branched';

  const busyness = form.branchCount * form.branchDepth;

  if (busyness >= 12) return 'densely branched';
  if (busyness >= 6) return 'branched';

  return 'sparsely branched';
}

/** Bands `leafDensity`. Zero is handled by the caller. */
function foliageWord(density: number): string {
  if (density >= 0.7) return 'thickly set with';
  if (density >= 0.35) return 'set with';

  return 'sparsely set with';
}

const LEAF_WORDS: Record<LeafShape, string> = {
  lanceolate: 'narrow lance-shaped leaves',
  ovate: 'broad oval leaves',
  palmate: 'hand-shaped lobed leaves',
  linear: 'thin grass-like leaves',
  lobed: 'wavy-edged lobed leaves',
};

/** Bands `flowerSize` into a word used inside the flower clause. */
function flowerSizeWord(size: number): string {
  if (size >= 1.3) return 'large';
  if (size >= 0.8) return 'medium-sized';

  return 'small';
}

/**
 * The flower clause, or `null` when there is nothing to say.
 *
 * Each arrangement gets the phrasing a field guide would use, so the
 * description stays informative rather than reciting the parameter name back.
 */
function flowerClause(type: FlowerType, size: number): string | null {
  const scale = flowerSizeWord(size);

  switch (type) {
    case 'none':
      return null;
    case 'single':
      return `a single ${scale} flower at the tip`;
    case 'cluster':
      return `clusters of ${scale} flowers at the branch tips`;
    case 'umbel':
      return `a flat-topped umbel of ${scale} flowers`;
    case 'spike':
      return `a spike of ${scale} flowers opening from the base upwards`;
  }
}

/**
 * A one-sentence description of the plant a form will draw.
 *
 * @example
 * describePlant(form)
 * // "A tall, arching plant set with narrow lance-shaped leaves, a spike of
 * //  small flowers opening from the base upwards, and its roots exposed."
 */
export function describePlant(form: PlantForm): string {
  const habit = HABIT_WORDS[form.habit];

  const opening = branches(form.habit)
    ? `A ${heightWord(form.height)}, ${habit} ${branchingWord(form)} plant`
    : `A ${heightWord(form.height)} ${habit} plant`;

  const parts = [opening];

  if (form.leafDensity > 0) {
    parts.push(`${foliageWord(form.leafDensity)} ${LEAF_WORDS[form.leafShape]}`);
  } else {
    parts.push('with bare stems');
  }

  const flowers = flowerClause(form.flowerType, form.flowerSize);

  if (flowers !== null) {
    parts.push(`and ${flowers}`);
  }

  // Roots go last because that is the order the eye takes them in, and because
  // "shown with its roots exposed" is a fact about the plate rather than about
  // the plant.
  if (form.roots) {
    parts.push(`${flowers === null ? 'and' : ''} shown with its roots exposed`.trim());
  }

  return `${parts.join(' ')}.`;
}
