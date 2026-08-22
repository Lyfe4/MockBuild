import { describe, expect, it } from 'vitest';

import {
  EMPTY_QUERY,
  isFiltered,
  parseCatalogueQuery,
  SORT_KEYS,
  toggleFacetValue,
  toSearchParams,
} from './query';
import type { CatalogueQuery } from './query';

const FAMILIES = ['Asteraceae', 'Myrtaceae', 'Proteaceae'];

const parse = (search: string): CatalogueQuery =>
  parseCatalogueQuery(new URLSearchParams(search), FAMILIES);

describe('parseCatalogueQuery', () => {
  it('returns the empty query for an empty URL', () => {
    expect(parse('')).toStrictEqual(EMPTY_QUERY);
  });

  it('reads every facet', () => {
    const query = parse(
      '?q=fern&family=Myrtaceae&habitat=alpine&season=spring&status=EN&sort=name',
    );

    expect(query).toStrictEqual({
      search: 'fern',
      families: ['Myrtaceae'],
      habitats: ['alpine'],
      seasons: ['spring'],
      statuses: ['EN'],
      sort: 'name',
    });
  });

  it('reads repeated parameters as a multi-select, in the enum order', () => {
    // Canonical order, not URL order — see the normalisation test below. HABITATS
    // lists wetland before alpine, so that is the order that comes back.
    expect(parse('?habitat=alpine&habitat=wetland').habitats).toStrictEqual(['wetland', 'alpine']);
  });

  describe('treats the URL as untrusted', () => {
    it('drops values that are not in the enum', () => {
      const query = parse('?habitat=moon&season=harvest&status=SUPER&sort=random');

      expect(query.habitats).toStrictEqual([]);
      expect(query.seasons).toStrictEqual([]);
      expect(query.statuses).toStrictEqual([]);
      expect(query.sort).toBe(EMPTY_QUERY.sort);
    });

    it('drops families that are not in the dataset', () => {
      expect(parse('?family=Myrtaceae&family=Triffidaceae').families).toStrictEqual(['Myrtaceae']);
    });

    it('keeps the good values from a mixed list', () => {
      expect(parse('?habitat=moon&habitat=alpine').habitats).toStrictEqual(['alpine']);
    });

    it('de-duplicates repeated values', () => {
      expect(parse('?season=spring&season=spring&season=spring').seasons).toStrictEqual(['spring']);
    });

    it('normalises facet order, so two equivalent URLs parse identically', () => {
      // Order in the URL is not meaningful; parsing to a canonical order stops
      // ?a=1&b=2 and ?b=2&a=1 producing different React state.
      expect(parse('?season=winter&season=spring')).toStrictEqual(
        parse('?season=spring&season=winter'),
      );
    });

    it('trims and caps the search term', () => {
      expect(parse('?q=%20%20fern%20%20').search).toBe('fern');
      expect(parse(`?q=${'x'.repeat(500)}`).search).toHaveLength(80);
    });

    it('survives a hostile-looking search term without altering it', () => {
      // Nothing downstream interpolates this into markup, but the parser should
      // neither crash on it nor silently mangle a legitimate search.
      expect(parse('?q=%3Cscript%3E').search).toBe('<script>');
    });

    it('is case-sensitive about enum values rather than guessing', () => {
      expect(parse('?status=en').statuses).toStrictEqual([]);
    });
  });

  it.each(SORT_KEYS)('accepts %s as a sort key', (sort) => {
    expect(parse(`?sort=${sort}`).sort).toBe(sort);
  });
});

describe('toSearchParams', () => {
  it('produces nothing for the empty query', () => {
    expect(toSearchParams(EMPTY_QUERY).toString()).toBe('');
  });

  it('omits the default sort so a clean view has a clean URL', () => {
    expect(toSearchParams({ ...EMPTY_QUERY, sort: 'catalogue' }).toString()).toBe('');
    expect(toSearchParams({ ...EMPTY_QUERY, sort: 'name' }).toString()).toBe('sort=name');
  });

  it('round-trips a full query', () => {
    const query: CatalogueQuery = {
      search: 'snow',
      families: ['Asteraceae', 'Myrtaceae'],
      habitats: ['alpine'],
      seasons: ['spring', 'summer'],
      statuses: ['VU', 'EN'],
      sort: 'name',
    };

    expect(parseCatalogueQuery(toSearchParams(query), FAMILIES)).toStrictEqual(query);
  });
});

describe('isFiltered', () => {
  it('is false for the empty query', () => {
    expect(isFiltered(EMPTY_QUERY)).toBe(false);
  });

  it('ignores the sort order, which is not a filter', () => {
    expect(isFiltered({ ...EMPTY_QUERY, sort: 'name' })).toBe(false);
  });

  it.each([
    ['search', { search: 'x' }],
    ['families', { families: ['Myrtaceae'] }],
    ['habitats', { habitats: ['alpine'] as const }],
    ['seasons', { seasons: ['spring'] as const }],
    ['statuses', { statuses: ['EN'] as const }],
  ])('is true when %s is set', (_name, patch) => {
    expect(isFiltered({ ...EMPTY_QUERY, ...patch })).toBe(true);
  });
});

describe('toggleFacetValue', () => {
  it('adds a value that is absent', () => {
    expect(toggleFacetValue(['a'], 'b')).toStrictEqual(['a', 'b']);
  });

  it('removes a value that is present', () => {
    expect(toggleFacetValue(['a', 'b'], 'a')).toStrictEqual(['b']);
  });

  it('does not mutate its input', () => {
    const original = ['a'];

    toggleFacetValue(original, 'b');

    expect(original).toStrictEqual(['a']);
  });
});
