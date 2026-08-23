import type { Species } from '@/types';

import type { CatalogueQuery } from './query';

/**
 * Turning a query into a list of species.
 *
 * Pure functions over an array — no memoisation, no index, no fuzzy matching.
 * The collection is small enough that a linear scan per keystroke is free, and
 * the moment it is not, this is the one file that changes.
 */

/**
 * Diacritics folded and case dropped, so `machaon` finds *Papilio machaon* and
 * `Kafer` finds a *Käfer*. Search on a taxonomic catalogue that only matched
 * exact accents would fail on the names most likely to be typed from memory.
 */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** `Genus species` — the name the catalogue sorts and searches on. */
export function binomialOf(species: Species): string {
  return `${species.taxonomy.genus} ${species.taxonomy.species}`;
}

function searchableText(species: Species): string {
  const { taxonomy } = species;

  return fold(
    `${binomialOf(species)} ${species.commonName} ${taxonomy.family} ${taxonomy.order} ${species.id}`,
  );
}

function matches(species: Species, query: CatalogueQuery): boolean {
  if (query.search !== '' && !searchableText(species).includes(fold(query.search))) {
    return false;
  }

  if (query.families.length > 0 && !query.families.includes(species.taxonomy.family)) return false;

  return true;
}

export function filterSpecies(all: readonly Species[], query: CatalogueQuery): Species[] {
  return all.filter((species) => matches(species, query));
}

export function sortSpecies(all: readonly Species[], sort: CatalogueQuery['sort']): Species[] {
  const sorted = [...all];

  switch (sort) {
    case 'name':
      return sorted.sort((a, b) => binomialOf(a).localeCompare(binomialOf(b), 'en-AU'));
    case 'catalogue':
      return sorted.sort((a, b) => a.id.localeCompare(b.id));
  }
}

export function queryCatalogue(all: readonly Species[], query: CatalogueQuery): Species[] {
  return sortSpecies(filterSpecies(all, query), query.sort);
}

/** Every family in the collection, alphabetically — the family select's options. */
export function familiesOf(all: readonly Species[]): string[] {
  return [...new Set(all.map((species) => species.taxonomy.family))].sort((a, b) =>
    a.localeCompare(b, 'en-AU'),
  );
}
