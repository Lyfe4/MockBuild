import type { FlowerType, LeafShape, PlantForm } from './types';

/**
 * Turns a form into a sentence.
 *
 * This is the illustration's accessible description, so it is written to be
 * *read aloud*: it describes what someone would see, in the order they would
 * notice it, and stops. It is not a caption and not a botanical diagnosis — the
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
      return `a spike of ${scale} flowers along the stem`;
  }
}

/**
 * A one-sentence description of the plant a form will draw.
 *
 * @example
 * describePlant(form)
 * // "A tall, sparsely branched plant set with narrow lance-shaped leaves and
 * //  a spike of small flowers along the stem."
 */
export function describePlant(form: PlantForm): string {
  const parts = [`A ${heightWord(form.height)}, ${branchingWord(form)} plant`];

  if (form.leafDensity > 0) {
    parts.push(`${foliageWord(form.leafDensity)} ${LEAF_WORDS[form.leafShape]}`);
  } else {
    parts.push('with bare stems');
  }

  const flowers = flowerClause(form.flowerType, form.flowerSize);

  if (flowers !== null) {
    parts.push(`and ${flowers}`);
  }

  return `${parts.join(' ')}.`;
}
