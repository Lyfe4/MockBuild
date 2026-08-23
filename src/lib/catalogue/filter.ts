import { seasonsOfMonths } from '@/lib/season';
import type { Season, Species } from '@/types';

import type { CatalogueQuery, SortKey } from './query';

/**
 * Turning a query into a list of species.
 *
 * Pure functions over an array — no memoisation, no index, no fuzzy matching.
 * The collection is small enough that a linear scan per keystroke is free, and
 * the day it is not, this is the one file that changes.
 *
 * Every facet is an AND against the others and an OR within itself, which is
 * what a reader expects of a set of checkboxes: two orders ticked widens, an
 * order and a family ticked narrows.
 */

/**
 * Diacritics folded and case dropped, so `machaon` finds *Papilio machaon* and
 * `Muller` finds `(Müller, 1764)`. A taxonomic search that only matched exact
 * accents would fail on the names most likely to be typed from memory.
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

/** The seasons a species is on the wing in, in Thornfield's southern calendar. */
export function seasonsOf(species: Species): Season[] {
  return seasonsOfMonths(species.activeMonths);
}

function searchableText(species: Species, accession: string): string {
  const { taxonomy } = species;

  return fold(
    [
      binomialOf(species),
      species.commonName,
      taxonomy.family,
      taxonomy.order,
      taxonomy.authority,
      species.id,
      accession,
    ].join(' '),
  );
}

/**
 * How a species is looked up by number.
 *
 * Passed in rather than imported, because `lib` does not know about `data` —
 * the accession number belongs to the index that holds the specimen, not to the
 * function that filters it.
 */
export type AccessionLookup = (species: Species) => string;

const NO_ACCESSION: AccessionLookup = () => '';

export interface QueryOptions {
  readonly accessionOf?: AccessionLookup;
}

function matches(species: Species, query: CatalogueQuery, accessionOf: AccessionLookup): boolean {
  if (
    query.search !== '' &&
    !searchableText(species, accessionOf(species)).includes(fold(query.search))
  ) {
    return false;
  }

  if (query.orders.length > 0 && !query.orders.includes(species.taxonomy.order)) return false;
  if (query.families.length > 0 && !query.families.includes(species.taxonomy.family)) return false;
  if (query.markings.length > 0 && !query.markings.includes(species.morphology.markings)) {
    return false;
  }
  if (query.sizes.length > 0 && !query.sizes.includes(species.morphology.sizeClass)) return false;
  if (query.seasons.length > 0 && !seasonsOf(species).some((s) => query.seasons.includes(s))) {
    return false;
  }

  return true;
}

export function filterSpecies(
  all: readonly Species[],
  query: CatalogueQuery,
  options: QueryOptions = {},
): Species[] {
  const accessionOf = options.accessionOf ?? NO_ACCESSION;

  return all.filter((species) => matches(species, query, accessionOf));
}

export function sortSpecies(
  all: readonly Species[],
  sort: SortKey,
  options: QueryOptions = {},
): Species[] {
  const accessionOf = options.accessionOf ?? NO_ACCESSION;
  const sorted = [...all];

  switch (sort) {
    case 'name':
      return sorted.sort((a, b) => binomialOf(a).localeCompare(binomialOf(b), 'en-AU'));
    case 'size':
      // Largest first, which is the order a drawer of specimens is laid out in.
      // Ties broken by name so the list is stable rather than arbitrary.
      return sorted.sort(
        (a, b) =>
          b.sizeMm.max - a.sizeMm.max || binomialOf(a).localeCompare(binomialOf(b), 'en-AU'),
      );
    case 'catalogue':
      return sorted.sort((a, b) => accessionOf(a).localeCompare(accessionOf(b)) || 0);
  }
}

export function queryCatalogue(
  all: readonly Species[],
  query: CatalogueQuery,
  options: QueryOptions = {},
): Species[] {
  return sortSpecies(filterSpecies(all, query, options), query.sort, options);
}

/** Every taxonomic order in the collection, alphabetically. */
export function ordersOf(all: readonly Species[]): string[] {
  return [...new Set(all.map((species) => species.taxonomy.order))].sort((a, b) =>
    a.localeCompare(b, 'en-AU'),
  );
}

/**
 * Every family in the collection, alphabetically — optionally only those inside
 * the given orders, which is what makes the family select depend on the order
 * checkboxes. An empty `orders` means no narrowing rather than no families.
 */
export function familiesOf(all: readonly Species[], orders: readonly string[] = []): string[] {
  const inScope = orders.length === 0 ? all : all.filter((s) => orders.includes(s.taxonomy.order));

  return [...new Set(inScope.map((species) => species.taxonomy.family))].sort((a, b) =>
    a.localeCompare(b, 'en-AU'),
  );
}
