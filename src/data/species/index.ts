import type { Species } from '@/types';

import { LUCANUS_CERVUS } from './lucanus-cervus';

/**
 * The entomological collection.
 *
 * One species so far — the spike. Ordered by scientific name, which is the
 * order a systematic collection is arranged in and the order the catalogue
 * will read out.
 */
export const SPECIES: readonly Species[] = [LUCANUS_CERVUS];

/** One species by slug, or `undefined` if the collection has no such record. */
export function findSpecies(id: string): Species | undefined {
  return SPECIES.find((species) => species.id === id);
}

export { LUCANUS_CERVUS } from './lucanus-cervus';
