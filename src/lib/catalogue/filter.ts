import type { Specimen } from '@/types';

import type { CatalogueQuery } from './query';

/**
 * Catalogue filtering and sorting.
 *
 * Pure functions over a list of specimens: no React, no URL, no DOM. The
 * component's whole job is to hand these a query and render what comes back,
 * which is what makes the interesting behaviour testable without a browser.
 */

/**
 * Normalises text for comparison.
 *
 * `toLowerCase` alone would fail to match "Fuscaphylla" against a search for
 * "fuscaphÿlla", and specimen names carry diacritics. Decomposing to NFD and
 * dropping the combining marks makes the search accent-insensitive in both
 * directions, which is what someone typing on a plain keyboard expects.
 */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * The fields free-text search looks at.
 *
 * Deliberately not the curator's note: a note mentioning "roadside" would pull
 * up a specimen when someone searched for a roadside plant, which is a
 * different question from the one the search box appears to be asking.
 */
function searchableText(specimen: Specimen): string {
  return fold(
    `${specimen.scientificName} ${specimen.commonName} ${specimen.family} ${specimen.id}`,
  );
}

function matches(specimen: Specimen, query: CatalogueQuery): boolean {
  if (query.search !== '' && !searchableText(specimen).includes(fold(query.search))) {
    return false;
  }

  // An empty facet means "no constraint", not "match nothing".
  if (query.families.length > 0 && !query.families.includes(specimen.family)) return false;
  if (query.habitats.length > 0 && !query.habitats.includes(specimen.habitat)) return false;
  if (query.statuses.length > 0 && !query.statuses.includes(specimen.conservationStatus)) {
    return false;
  }

  /**
   * Seasons are the one facet where the record holds a list too, so this is a
   * set intersection rather than a membership test: a specimen flowering in
   * both spring and summer should appear under either.
   */
  if (query.seasons.length > 0 && !specimen.seasons.some((s) => query.seasons.includes(s))) {
    return false;
  }

  return true;
}

/** Every specimen matching the query, in the order it was given. */
export function filterSpecimens(specimens: readonly Specimen[], query: CatalogueQuery): Specimen[] {
  return specimens.filter((specimen) => matches(specimen, query));
}

/**
 * Orders specimens.
 *
 * Returns a new array; the input is treated as immutable because it is the
 * shared `SPECIMENS` constant and sorting in place would corrupt it for every
 * other caller.
 */
export function sortSpecimens(
  specimens: readonly Specimen[],
  sort: CatalogueQuery['sort'],
): Specimen[] {
  const sorted = [...specimens];

  switch (sort) {
    case 'name':
      // localeCompare so "Ångström" files where a reader expects, not after "Z".
      return sorted.sort((a, b) => a.scientificName.localeCompare(b.scientificName, 'en-AU'));

    case 'collected':
      // Most recent first: the interesting end of an accession list is the new
      // material. ISO dates sort correctly as plain strings.
      return sorted.sort((a, b) => b.collectedOn.localeCompare(a.collectedOn));

    case 'catalogue':
      return sorted.sort((a, b) => a.id.localeCompare(b.id));
  }
}

/** Filter, then sort. The order the catalogue page needs. */
export function queryCatalogue(specimens: readonly Specimen[], query: CatalogueQuery): Specimen[] {
  return sortSpecimens(filterSpecimens(specimens, query), query.sort);
}

/** Every family in the dataset, sorted, without duplicates. For the filter UI. */
export function familiesOf(specimens: readonly Specimen[]): string[] {
  return [...new Set(specimens.map((specimen) => specimen.family))].sort((a, b) =>
    a.localeCompare(b, 'en-AU'),
  );
}
