import { MARKING_FORMS, SEASONS, SIZE_CLASSES } from '@/types';
import type { MarkingForm, Season, SizeClass } from '@/types';

/**
 * The catalogue's state, as it lives in the URL.
 *
 * Every filter and the sort order are query parameters, not component state, so
 * a filtered view is a link: it survives a reload, a back button and being sent
 * to someone else. The parser is the only thing that decides what a parameter
 * means, and it is deliberately forgiving — an unknown family, a misspelled
 * sort key or a search string a kilobyte long produce a usable query rather
 * than an error, because a URL is user input and user input arrives broken.
 *
 * Order is not preserved. `keepKnown` filters the *allowed* list by what was
 * asked for rather than the other way round, so `?order=Odonata&order=Coleoptera`
 * and the reverse produce the same query and the same URL when it is written
 * back out. Two links to the same view are the same link.
 */

export const SORT_KEYS = ['catalogue', 'name', 'size'] as const;

export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  catalogue: 'Catalogue number',
  name: 'Scientific name',
  size: 'Size, largest first',
};

export interface CatalogueQuery {
  /** Free text, matched against the names, the taxonomy and the number. */
  readonly search: string;
  /** Taxonomic orders — `Coleoptera`, `Odonata`. Checkboxes. */
  readonly orders: readonly string[];
  /** Families. The panel only offers those inside the chosen orders. */
  readonly families: readonly string[];
  readonly markings: readonly MarkingForm[];
  readonly sizes: readonly SizeClass[];
  /**
   * The seasons a species is on the wing in, in Thornfield's southern calendar.
   * Derived from `activeMonths` — see `seasonsOfMonths`.
   */
  readonly seasons: readonly Season[];
  readonly sort: SortKey;
}

export const EMPTY_QUERY: CatalogueQuery = {
  search: '',
  orders: [],
  families: [],
  markings: [],
  sizes: [],
  seasons: [],
  sort: 'catalogue',
};

/** The parameter names, in one place, because two places is one too many. */
const PARAM = {
  search: 'q',
  order: 'order',
  family: 'family',
  markings: 'markings',
  size: 'size',
  season: 'season',
  sort: 'sort',
} as const;

/**
 * A search box is a text input on a public URL. Eighty characters is longer
 * than any binomial in the collection and short enough not to be a payload.
 */
const MAX_SEARCH_LENGTH = 80;

/** The asked-for values that the collection actually has, in canonical order. */
function keepKnown<T extends string>(values: readonly string[], allowed: readonly T[]): T[] {
  const wanted = new Set(values);

  return allowed.filter((candidate) => wanted.has(candidate));
}

/** What the collection currently contains, for validating a URL against it. */
export interface KnownFacets {
  readonly orders: readonly string[];
  readonly families: readonly string[];
}

export function parseCatalogueQuery(params: URLSearchParams, known: KnownFacets): CatalogueQuery {
  const rawSort = params.get(PARAM.sort);
  const sort = SORT_KEYS.find((key) => key === rawSort) ?? EMPTY_QUERY.sort;

  return {
    search: (params.get(PARAM.search) ?? '').trim().slice(0, MAX_SEARCH_LENGTH),
    orders: keepKnown(params.getAll(PARAM.order), [...known.orders].sort()),
    families: keepKnown(params.getAll(PARAM.family), [...known.families].sort()),
    markings: keepKnown(params.getAll(PARAM.markings), MARKING_FORMS),
    sizes: keepKnown(params.getAll(PARAM.size), SIZE_CLASSES),
    seasons: keepKnown(params.getAll(PARAM.season), SEASONS),
    sort,
  };
}

/** The inverse. Defaults are omitted, so an unfiltered catalogue has a clean URL. */
export function toSearchParams(query: CatalogueQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.search !== '') params.set(PARAM.search, query.search);
  for (const order of query.orders) params.append(PARAM.order, order);
  for (const family of query.families) params.append(PARAM.family, family);
  for (const marking of query.markings) params.append(PARAM.markings, marking);
  for (const size of query.sizes) params.append(PARAM.size, size);
  for (const season of query.seasons) params.append(PARAM.season, season);
  if (query.sort !== EMPTY_QUERY.sort) params.set(PARAM.sort, query.sort);

  return params;
}

/** Whether anything is narrowing the list. Sort order is not a filter. */
export function isFiltered(query: CatalogueQuery): boolean {
  return (
    query.search !== '' ||
    query.orders.length > 0 ||
    query.families.length > 0 ||
    query.markings.length > 0 ||
    query.sizes.length > 0 ||
    query.seasons.length > 0
  );
}

/** Everything cleared except the sort, which the clear button must not touch. */
export function clearFilters(query: CatalogueQuery): CatalogueQuery {
  return { ...EMPTY_QUERY, sort: query.sort };
}

/** Add or remove one value from a multi-select facet. */
export function toggleFacetValue<T extends string>(values: readonly T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];
}
