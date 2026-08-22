import { CONSERVATION_STATUSES, HABITATS, SEASONS } from '@/types';
import type { ConservationStatus, Habitat, Season } from '@/types';

/**
 * The catalogue's URL contract.
 *
 * Every filter lives in the query string rather than in component state, so a
 * filtered view can be linked, bookmarked, reloaded and stepped through with the
 * back button. That makes the query string **untrusted input**: anyone can type
 * anything into it. Nothing here trusts a value it has not checked against a
 * known list, and anything unrecognised is dropped rather than corrected or
 * rejected — a bad link should show a slightly wider catalogue, never an error.
 */

/** How results are ordered. The first entry is the default. */
export const SORT_KEYS = ['catalogue', 'name', 'collected'] as const;

export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  catalogue: 'Catalogue number',
  name: 'Scientific name',
  collected: 'Date collected',
};

export interface CatalogueQuery {
  /** Free text, matched against name, family and catalogue number. */
  readonly search: string;
  /** Empty means "no filter", not "match nothing". */
  readonly families: readonly string[];
  readonly habitats: readonly Habitat[];
  readonly seasons: readonly Season[];
  readonly statuses: readonly ConservationStatus[];
  readonly sort: SortKey;
}

export const EMPTY_QUERY: CatalogueQuery = {
  search: '',
  families: [],
  habitats: [],
  seasons: [],
  statuses: [],
  sort: 'catalogue',
};

/** Parameter names, in one place so the parser and serialiser cannot disagree. */
const PARAM = {
  search: 'q',
  family: 'family',
  habitat: 'habitat',
  season: 'season',
  status: 'status',
  sort: 'sort',
} as const;

/**
 * An upper bound on the search term.
 *
 * Nothing downstream is injected with it — the filter is a plain
 * `String.includes` — but an unbounded value from the URL ends up in the DOM as
 * the input's value and in the result-count announcement, and there is no
 * legitimate 500-character search of a 24-record catalogue.
 */
const MAX_SEARCH_LENGTH = 80;

/** Keeps the members of `allowed`, in the order `allowed` defines, without duplicates. */
function keepKnown<T extends string>(values: readonly string[], allowed: readonly T[]): T[] {
  const wanted = new Set(values);

  return allowed.filter((candidate) => wanted.has(candidate));
}

/**
 * Reads a `CatalogueQuery` out of the URL.
 *
 * @param params The current search params.
 * @param knownFamilies Families present in the dataset. Passed in rather than
 *   imported so the parser stays pure and testable against a fixed list — and
 *   so `lib` does not reach into `data`.
 */
export function parseCatalogueQuery(
  params: URLSearchParams,
  knownFamilies: readonly string[],
): CatalogueQuery {
  const rawSort = params.get(PARAM.sort);
  const sort = SORT_KEYS.find((key) => key === rawSort) ?? EMPTY_QUERY.sort;

  return {
    search: (params.get(PARAM.search) ?? '').trim().slice(0, MAX_SEARCH_LENGTH),
    // Families are data, not an enum, so the caller supplies the allowlist.
    families: keepKnown(params.getAll(PARAM.family), [...knownFamilies].sort()),
    habitats: keepKnown(params.getAll(PARAM.habitat), HABITATS),
    seasons: keepKnown(params.getAll(PARAM.season), SEASONS),
    statuses: keepKnown(params.getAll(PARAM.status), CONSERVATION_STATUSES),
    sort,
  };
}

/**
 * Writes a `CatalogueQuery` back to the URL.
 *
 * Defaults are omitted, so an unfiltered catalogue has a clean address and
 * "clear all" genuinely returns to `/catalogue` rather than to a URL full of
 * empty parameters.
 */
export function toSearchParams(query: CatalogueQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.search !== '') params.set(PARAM.search, query.search);
  for (const family of query.families) params.append(PARAM.family, family);
  for (const habitat of query.habitats) params.append(PARAM.habitat, habitat);
  for (const season of query.seasons) params.append(PARAM.season, season);
  for (const status of query.statuses) params.append(PARAM.status, status);
  if (query.sort !== EMPTY_QUERY.sort) params.set(PARAM.sort, query.sort);

  return params;
}

/** Whether anything is actually filtering, ignoring the sort order. */
export function isFiltered(query: CatalogueQuery): boolean {
  return (
    query.search !== '' ||
    query.families.length > 0 ||
    query.habitats.length > 0 ||
    query.seasons.length > 0 ||
    query.statuses.length > 0
  );
}

/**
 * Adds or removes one value from a multi-select facet.
 *
 * Lives here rather than in the component so the "toggle a checkbox" rule is
 * covered by the same tests as the rest of the query handling.
 */
export function toggleFacetValue<T extends string>(values: readonly T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];
}
