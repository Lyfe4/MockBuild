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

const FAMILIES = ['Coccinellidae', 'Lucanidae', 'Papilionidae'];

const parse = (search: string): CatalogueQuery =>
  parseCatalogueQuery(new URLSearchParams(search), FAMILIES);

describe('parseCatalogueQuery', () => {
  it('returns the empty query for an empty URL', () => {
    expect(parse('')).toStrictEqual(EMPTY_QUERY);
  });

  it('reads every facet', () => {
    const query = parse('?q=beetle&family=Lucanidae&sort=name');

    expect(query).toStrictEqual({
      search: 'beetle',
      families: ['Lucanidae'],
      sort: 'name',
    });
  });

  it('reads repeated parameters as a multi-select, in canonical order', () => {
    expect(parse('?family=Papilionidae&family=Lucanidae').families).toStrictEqual([
      'Lucanidae',
      'Papilionidae',
    ]);
  });

  describe('treats the URL as untrusted', () => {
    it('drops a sort key that is not one of ours', () => {
      expect(parse('?sort=random').sort).toBe(EMPTY_QUERY.sort);
    });

    it('drops families that are not in the collection', () => {
      expect(parse('?family=Lucanidae&family=Triffidaceae').families).toStrictEqual(['Lucanidae']);
    });

    it('de-duplicates repeated values', () => {
      expect(parse('?family=Lucanidae&family=Lucanidae').families).toStrictEqual(['Lucanidae']);
    });

    it('normalises facet order, so two equivalent URLs parse identically', () => {
      // Order in the URL is not meaningful; parsing to a canonical order stops
      // ?a=1&b=2 and ?b=2&a=1 producing different React state.
      expect(parse('?family=Papilionidae&family=Lucanidae')).toStrictEqual(
        parse('?family=Lucanidae&family=Papilionidae'),
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

    it('is case-sensitive about known values rather than guessing', () => {
      expect(parse('?family=lucanidae').families).toStrictEqual([]);
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
      families: ['Coccinellidae', 'Lucanidae'],
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
    ['families', { families: ['Lucanidae'] }],
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
