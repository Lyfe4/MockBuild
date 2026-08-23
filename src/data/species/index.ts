import type { SpeciesPlate } from '@/lib/plate';
import type { Species } from '@/types';

import { LUCANUS_CERVUS } from './lucanus-cervus';
import { LUCANUS_CERVUS_PLATE } from './lucanus-cervus.plate';

/**
 * The entomological collection.
 *
 * Ordered by scientific name, which is the order a systematic collection is
 * arranged in and the order the catalogue reads out by default.
 *
 * Records and plates are separate arrays joined by `species` id rather than one
 * object with a `plate` field, because the two have different lifetimes: a
 * record is written once from published sources, and a plate is redrawn.
 */
export const SPECIES: readonly Species[] = [LUCANUS_CERVUS];

/** Every plate, keyed by the record it draws. */
const PLATES: readonly SpeciesPlate[] = [LUCANUS_CERVUS_PLATE];

/** One species by slug, or `undefined` if the collection has no such record. */
export function findSpecies(id: string): Species | undefined {
  return SPECIES.find((species) => species.id === id);
}

/** The plate for one species, or `undefined` if none has been drawn yet. */
export function findPlate(id: string): SpeciesPlate | undefined {
  return PLATES.find((plate) => plate.species === id);
}

export { LUCANUS_CERVUS } from './lucanus-cervus';
export { LUCANUS_CERVUS_PLATE } from './lucanus-cervus.plate';
