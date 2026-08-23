import { describe, expect, it } from 'vitest';

import type { Species } from '@/types';

import {
  binomialOf,
  familiesOf,
  filterSpecies,
  ordersOf,
  queryCatalogue,
  seasonsOf,
  sortSpecies,
} from './filter';
import { EMPTY_QUERY, type CatalogueQuery } from './query';

/**
 * Fixtures rather than the real collection.
 *
 * The collection is small and will grow, and a test that asserts "searching
 * `Lucanus` returns exactly one record" becomes a test that fails the day a
 * second Lucanidae is added. These are made-up records carrying exactly the
 * properties each case needs — including an accented authority and two families
 * inside one order, which the real collection may or may not have on any given
 * day.
 */
function species(overrides: Partial<Species> & Pick<Species, 'id'>): Species {
  return {
    taxonomy: {
      order: 'Coleoptera',
      family: 'Lucanidae',
      genus: 'Lucanus',
      species: 'cervus',
      authority: '(Linnaeus, 1758)',
    },
    commonName: 'Stag beetle',
    sizeMm: { min: 25, max: 75 },
    sizeBasis: 'body length',
    distribution: 'Europe',
    activeMonths: [5, 6, 7, 8],
    morphology: {
      wingCover: 'elytra',
      antennae: 'lamellate',
      markings: 'none',
      bodyShape: 'elongate',
      sizeClass: 'large',
      colourFamily: 'dark brown',
    },
    notes: '',
    sources: [],
    pigment: 2,
    scale: 1,
    ...overrides,
  };
}

const STAG = species({ id: 'tea-a' });

const LADYBIRD = species({
  id: 'tea-b',
  taxonomy: {
    order: 'Coleoptera',
    family: 'Coccinellidae',
    genus: 'Coccinella',
    species: 'septempunctata',
    authority: 'Linnaeus, 1758',
  },
  commonName: 'Seven-spot ladybird',
  sizeMm: { min: 6.5, max: 7.8 },
  // Spring through autumn in the north, which is spring, summer and autumn in
  // Thornfield's calendar too — this one touches every season but winter.
  activeMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  morphology: {
    wingCover: 'elytra',
    antennae: 'clavate',
    markings: 'spots',
    bodyShape: 'round',
    sizeClass: 'small',
    colourFamily: 'red',
  },
});

const HAWKER = species({
  id: 'tea-c',
  taxonomy: {
    order: 'Odonata',
    family: 'Aeshnidae',
    genus: 'Aeshna',
    species: 'cyanea',
    authority: '(Müller, 1764)',
  },
  commonName: 'Southern hawker',
  sizeMm: { min: 95, max: 110 },
  sizeBasis: 'wingspan',
  activeMonths: [6, 7, 8],
  morphology: {
    wingCover: 'membranous',
    antennae: 'setaceous',
    markings: 'spots',
    bodyShape: 'elongate',
    sizeClass: 'large',
    colourFamily: 'dark brown',
  },
});

const ALL: readonly Species[] = [STAG, LADYBIRD, HAWKER];

/** Accession numbers, which the collection's index owns rather than the record. */
const NUMBERS: Record<string, string> = {
  'tea-a': 'TEA-0003',
  'tea-b': 'TEA-0001',
  'tea-c': 'TEA-0002',
};
const OPTIONS = { accessionOf: (s: Species) => NUMBERS[s.id] ?? '' };

const query = (overrides: Partial<CatalogueQuery> = {}): CatalogueQuery => ({
  ...EMPTY_QUERY,
  ...overrides,
});

const ids = (found: readonly Species[]): string[] => found.map((s) => s.id);

describe('binomialOf', () => {
  it('joins the genus and the species, and nothing else', () => {
    expect(binomialOf(STAG)).toBe('Lucanus cervus');
  });
});

describe('seasonsOf', () => {
  it('reads the months against Thornfield’s southern calendar', () => {
    // May to August in the north is autumn and winter here, which is exactly
    // the mismatch the catalogue's filter is labelled to explain.
    expect(seasonsOf(STAG)).toStrictEqual(['autumn', 'winter']);
    expect(seasonsOf(HAWKER)).toStrictEqual(['winter']);
    expect(seasonsOf(LADYBIRD)).toStrictEqual(['spring', 'autumn', 'winter']);
  });
});

describe('filterSpecies', () => {
  it('returns everything for an empty query', () => {
    expect(filterSpecies(ALL, query())).toHaveLength(ALL.length);
  });

  it('never mutates the source list', () => {
    const before = ids(ALL);

    filterSpecies(ALL, query({ search: 'x' }));
    sortSpecies(ALL, 'name');

    expect(ids(ALL)).toStrictEqual(before);
  });

  describe('search', () => {
    it('matches the scientific name', () => {
      expect(ids(filterSpecies(ALL, query({ search: 'cyanea' })))).toStrictEqual(['tea-c']);
    });

    it('matches the common name', () => {
      expect(ids(filterSpecies(ALL, query({ search: 'seven-spot' })))).toStrictEqual(['tea-b']);
    });

    it('matches the family and the order', () => {
      expect(ids(filterSpecies(ALL, query({ search: 'Coleoptera' })))).toStrictEqual([
        'tea-a',
        'tea-b',
      ]);
      expect(ids(filterSpecies(ALL, query({ search: 'Aeshnidae' })))).toStrictEqual(['tea-c']);
    });

    it('matches the accession number, when it is given one to match', () => {
      expect(ids(filterSpecies(ALL, query({ search: 'TEA-0002' }), OPTIONS))).toStrictEqual([
        'tea-c',
      ]);
      // And without the lookup it simply finds nothing, rather than throwing.
      expect(filterSpecies(ALL, query({ search: 'TEA-0002' }))).toStrictEqual([]);
    });

    it('ignores case', () => {
      expect(ids(filterSpecies(ALL, query({ search: 'cYaNeA' })))).toStrictEqual(['tea-c']);
    });

    it('ignores diacritics, so a name typed from memory still finds the record', () => {
      expect(ids(filterSpecies(ALL, query({ search: 'Muller' })))).toStrictEqual(['tea-c']);
      expect(ids(filterSpecies(ALL, query({ search: 'Müller' })))).toStrictEqual(['tea-c']);
    });

    it('returns nothing rather than everything when there is no match', () => {
      expect(filterSpecies(ALL, query({ search: 'zzzz' }))).toStrictEqual([]);
    });
  });

  describe('facets', () => {
    it('filters by order', () => {
      expect(ids(filterSpecies(ALL, query({ orders: ['Odonata'] })))).toStrictEqual(['tea-c']);
    });

    it('filters by family', () => {
      expect(ids(filterSpecies(ALL, query({ families: ['Coccinellidae'] })))).toStrictEqual([
        'tea-b',
      ]);
    });

    it('filters by markings', () => {
      expect(ids(filterSpecies(ALL, query({ markings: ['spots'] })))).toStrictEqual([
        'tea-b',
        'tea-c',
      ]);
    });

    it('filters by size class', () => {
      expect(ids(filterSpecies(ALL, query({ sizes: ['small'] })))).toStrictEqual(['tea-b']);
    });

    it('filters by the season the adult is on the wing in', () => {
      expect(ids(filterSpecies(ALL, query({ seasons: ['spring'] })))).toStrictEqual(['tea-b']);
      expect(ids(filterSpecies(ALL, query({ seasons: ['winter'] })))).toStrictEqual([
        'tea-a',
        'tea-b',
        'tea-c',
      ]);
    });

    it('treats several values in one facet as an or', () => {
      expect(ids(filterSpecies(ALL, query({ sizes: ['small', 'large'] })))).toStrictEqual([
        'tea-a',
        'tea-b',
        'tea-c',
      ]);
    });

    it('treats different facets as an and', () => {
      expect(
        ids(filterSpecies(ALL, query({ orders: ['Coleoptera'], markings: ['spots'] }))),
      ).toStrictEqual(['tea-b']);
    });

    it('returns nothing for a family outside the chosen order', () => {
      // Not reachable from the panel, but reachable by typing a URL. Empty is
      // the truthful answer.
      expect(
        filterSpecies(ALL, query({ orders: ['Odonata'], families: ['Lucanidae'] })),
      ).toStrictEqual([]);
    });
  });
});

describe('sortSpecies', () => {
  it('orders by binomial, not by common name', () => {
    // Aeshna, Coccinella, Lucanus — where the common names would give
    // "Seven-spot", "Southern hawker", "Stag beetle", a different order.
    expect(ids(sortSpecies(ALL, 'name'))).toStrictEqual(['tea-c', 'tea-b', 'tea-a']);
  });

  it('orders by size, largest first', () => {
    expect(ids(sortSpecies(ALL, 'size'))).toStrictEqual(['tea-c', 'tea-a', 'tea-b']);
  });

  it('orders by accession number, which the caller supplies', () => {
    expect(ids(sortSpecies(ALL, 'catalogue', OPTIONS))).toStrictEqual(['tea-b', 'tea-c', 'tea-a']);
  });

  it('leaves the order alone when it has no numbers to sort by', () => {
    expect(ids(sortSpecies(ALL, 'catalogue'))).toStrictEqual(ids(ALL));
  });
});

describe('queryCatalogue', () => {
  it('filters and then sorts', () => {
    expect(ids(queryCatalogue(ALL, query({ orders: ['Coleoptera'], sort: 'name' })))).toStrictEqual(
      ['tea-b', 'tea-a'],
    );
  });
});

describe('ordersOf', () => {
  it('lists each order once, alphabetically', () => {
    expect(ordersOf(ALL)).toStrictEqual(['Coleoptera', 'Odonata']);
  });
});

describe('familiesOf', () => {
  it('lists each family once, alphabetically', () => {
    expect(familiesOf(ALL)).toStrictEqual(['Aeshnidae', 'Coccinellidae', 'Lucanidae']);
  });

  it('narrows to the chosen orders, which is what the family select depends on', () => {
    expect(familiesOf(ALL, ['Coleoptera'])).toStrictEqual(['Coccinellidae', 'Lucanidae']);
    expect(familiesOf(ALL, ['Odonata'])).toStrictEqual(['Aeshnidae']);
  });

  it('treats no chosen order as no narrowing, rather than as no families', () => {
    expect(familiesOf(ALL, [])).toStrictEqual(familiesOf(ALL));
  });
});
