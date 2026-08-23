import { describe, expect, it } from 'vitest';

import {
  activeFilterCount,
  clearFilters,
  EMPTY_QUERY,
  isFiltered,
  parseCatalogueQuery,
  SORT_KEYS,
  toggleFacetValue,
  toSearchParams,
} from './query';
import type { CatalogueQuery } from './query';

const KNOWN = {
  orders: ['Coleoptera', 'Lepidoptera', 'Odonata'],
  families: ['Aeshnidae', 'Coccinellidae', 'Lucanidae', 'Papilionidae'],
};

const parse = (search: string): CatalogueQuery =>
  parseCatalogueQuery(new URLSearchParams(search), KNOWN);

describe('parseCatalogueQuery', () => {
  it('returns the empty query for an empty URL', () => {
    expect(parse('')).toStrictEqual(EMPTY_QUERY);
  });

  it('reads every facet', () => {
    const query = parse(
      '?q=hawker&order=Odonata&family=Aeshnidae&markings=spots&size=large&season=winter&sort=name',
    );

    expect(query).toStrictEqual({
      search: 'hawker',
      orders: ['Odonata'],
      families: ['Aeshnidae'],
      markings: ['spots'],
      sizes: ['large'],
      seasons: ['winter'],
      sort: 'name',
    });
  });

  it('reads repeated parameters as a multi-select, in canonical order', () => {
    // Canonical order, not URL order — see the normalisation test below.
    // SIZE_CLASSES lists tiny before large, so that is the order that comes back.
    expect(parse('?order=Odonata&order=Coleoptera').orders).toStrictEqual([
      'Coleoptera',
      'Odonata',
    ]);
    expect(parse('?size=large&size=tiny').sizes).toStrictEqual(['tiny', 'large']);
  });

  describe('treats the URL as untrusted', () => {
    it('drops values that are not in the enum', () => {
      const query = parse('?markings=tartan&size=enormous&season=monsoon&sort=random');

      expect(query.markings).toStrictEqual([]);
      expect(query.sizes).toStrictEqual([]);
      expect(query.seasons).toStrictEqual([]);
      expect(query.sort).toBe(EMPTY_QUERY.sort);
    });

    it('drops orders and families the collection does not hold', () => {
      expect(parse('?order=Odonata&order=Diptera').orders).toStrictEqual(['Odonata']);
      expect(parse('?family=Lucanidae&family=Triffidaceae').families).toStrictEqual(['Lucanidae']);
    });

    it('keeps the good values from a mixed list', () => {
      expect(parse('?markings=tartan&markings=spots').markings).toStrictEqual(['spots']);
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
      expect(parse('?q=%20%20hawker%20%20').search).toBe('hawker');
      expect(parse(`?q=${'x'.repeat(500)}`).search).toHaveLength(80);
    });

    it('survives a hostile-looking search term without altering it', () => {
      // Nothing downstream interpolates this into markup, but the parser should
      // neither crash on it nor silently mangle a legitimate search.
      expect(parse('?q=%3Cscript%3E').search).toBe('<script>');
    });

    it('is case-sensitive about known values rather than guessing', () => {
      expect(parse('?order=odonata').orders).toStrictEqual([]);
      expect(parse('?size=LARGE').sizes).toStrictEqual([]);
    });

    it('accepts a family from outside the chosen order, and returns nothing for it', () => {
      // The panel does not offer the combination, but a hand-typed URL can ask
      // for it. Parsing it through and letting the filter return an empty list
      // is more honest than silently dropping half of what was asked for.
      const query = parse('?order=Odonata&family=Lucanidae');

      expect(query.orders).toStrictEqual(['Odonata']);
      expect(query.families).toStrictEqual(['Lucanidae']);
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
      search: 'stag',
      orders: ['Coleoptera', 'Odonata'],
      families: ['Coccinellidae', 'Lucanidae'],
      markings: ['none', 'spots'],
      sizes: ['small', 'large'],
      seasons: ['autumn', 'winter'],
      sort: 'size',
    };

    expect(parseCatalogueQuery(toSearchParams(query), KNOWN)).toStrictEqual(query);
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
    ['orders', { orders: ['Odonata'] }],
    ['families', { families: ['Lucanidae'] }],
    ['markings', { markings: ['spots'] as const }],
    ['sizes', { sizes: ['large'] as const }],
    ['seasons', { seasons: ['winter'] as const }],
  ])('is true when %s is set', (_name, patch) => {
    expect(isFiltered({ ...EMPTY_QUERY, ...patch })).toBe(true);
  });
});

describe('activeFilterCount', () => {
  it('is zero for an empty query', () => {
    expect(activeFilterCount(EMPTY_QUERY)).toBe(0);
  });

  it('counts each chosen value, not each facet', () => {
    const count = activeFilterCount({
      ...EMPTY_QUERY,
      orders: ['Coleoptera', 'Odonata'],
      seasons: ['winter'],
    });

    // Two orders and a season is three, because that is what a reader who
    // ticked three boxes will count.
    expect(count).toBe(3);
  });

  it('counts a search term once, however long it is', () => {
    expect(activeFilterCount({ ...EMPTY_QUERY, search: 'a' })).toBe(1);
    expect(activeFilterCount({ ...EMPTY_QUERY, search: 'stag beetle' })).toBe(1);
  });

  it('does not count the sort order, which is not a filter', () => {
    expect(activeFilterCount({ ...EMPTY_QUERY, sort: 'size' })).toBe(0);
  });

  it('agrees with isFiltered, which is the same question asked coarsely', () => {
    const queries = [
      EMPTY_QUERY,
      { ...EMPTY_QUERY, search: 'stag' },
      { ...EMPTY_QUERY, sizes: ['large'] as const },
      { ...EMPTY_QUERY, sort: 'name' as const },
    ];

    for (const query of queries) {
      expect(isFiltered(query), JSON.stringify(query)).toBe(activeFilterCount(query) > 0);
    }
  });
});

describe('clearFilters', () => {
  it('empties every facet and keeps the sort', () => {
    const cleared = clearFilters({
      search: 'stag',
      orders: ['Coleoptera'],
      families: ['Lucanidae'],
      markings: ['spots'],
      sizes: ['large'],
      seasons: ['winter'],
      sort: 'size',
    });

    expect(cleared).toStrictEqual({ ...EMPTY_QUERY, sort: 'size' });
    expect(isFiltered(cleared)).toBe(false);
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
