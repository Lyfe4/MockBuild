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
 * asked for rather than the other way round, so `?family=Lucanidae&family=
 * Papilionidae` and the reverse produce the same query and the same URL when it
 * is written back out.
 */

export const SORT_KEYS = ['catalogue', 'name'] as const;

export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  catalogue: 'Catalogue number',
  name: 'Scientific name',
};

export interface CatalogueQuery {
  readonly search: string;
  readonly families: readonly string[];
  readonly sort: SortKey;
}

export const EMPTY_QUERY: CatalogueQuery = {
  search: '',
  families: [],
  sort: 'catalogue',
};

/** The parameter names, in one place, because two places is one too many. */
const PARAM = {
  search: 'q',
  family: 'family',
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

export function parseCatalogueQuery(
  params: URLSearchParams,
  knownFamilies: readonly string[],
): CatalogueQuery {
  const rawSort = params.get(PARAM.sort);
  const sort = SORT_KEYS.find((key) => key === rawSort) ?? EMPTY_QUERY.sort;

  return {
    search: (params.get(PARAM.search) ?? '').trim().slice(0, MAX_SEARCH_LENGTH),
    families: keepKnown(params.getAll(PARAM.family), [...knownFamilies].sort()),
    sort,
  };
}

/** The inverse. Defaults are omitted, so an unfiltered catalogue has a clean URL. */
export function toSearchParams(query: CatalogueQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.search !== '') params.set(PARAM.search, query.search);
  for (const family of query.families) params.append(PARAM.family, family);
  if (query.sort !== EMPTY_QUERY.sort) params.set(PARAM.sort, query.sort);

  return params;
}

/** Whether anything is narrowing the list. Sort order is not a filter. */
export function isFiltered(query: CatalogueQuery): boolean {
  return query.search !== '' || query.families.length > 0;
}

/** Add or remove one value from a multi-select facet. */
export function toggleFacetValue<T extends string>(values: readonly T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];
}
