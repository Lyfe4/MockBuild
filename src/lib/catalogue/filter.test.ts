import { describe, expect, it } from 'vitest';

import type { Species } from '@/types';

import { binomialOf, familiesOf, filterSpecies, queryCatalogue, sortSpecies } from './filter';
import { EMPTY_QUERY, type CatalogueQuery } from './query';

/**
 * Fixtures rather than the real collection.
 *
 * The collection is small and will grow, and a test that asserts "searching
 * `Lucanus` returns exactly one record" becomes a test that fails the day a
 * second Lucanidae is added. These are made-up records with the properties each
 * case needs — including an accented name and a shared family, which the real
 * collection may or may not have on any given day.
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

const STAG = species({ id: 'tea-0001' });
const LESSER = species({
  id: 'tea-0002',
  taxonomy: {
    order: 'Coleoptera',
    family: 'Lucanidae',
    genus: 'Dorcus',
    species: 'parallelipipedus',
    authority: '(Linnaeus, 1758)',
  },
  commonName: 'Lesser stag beetle',
});
const KAFER = species({
  id: 'tea-0003',
  taxonomy: {
    order: 'Lepidoptera',
    family: 'Papilionidae',
    genus: 'Papilio',
    species: 'machaon',
    authority: 'Linnaeus, 1758',
  },
  commonName: 'Schwalbenschwanz-Käfer',
});

const ALL: readonly Species[] = [STAG, LESSER, KAFER];

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
      expect(ids(filterSpecies(ALL, query({ search: 'machaon' })))).toStrictEqual(['tea-0003']);
    });

    it('matches the common name', () => {
      expect(ids(filterSpecies(ALL, query({ search: 'Lesser stag' })))).toStrictEqual(['tea-0002']);
    });

    it('matches the catalogue slug', () => {
      expect(ids(filterSpecies(ALL, query({ search: 'tea-0001' })))).toStrictEqual(['tea-0001']);
    });

    it('matches the family and the order', () => {
      expect(ids(filterSpecies(ALL, query({ search: 'Lucanidae' })))).toStrictEqual([
        'tea-0001',
        'tea-0002',
      ]);
      expect(ids(filterSpecies(ALL, query({ search: 'Lepidoptera' })))).toStrictEqual(['tea-0003']);
    });

    it('ignores case', () => {
      expect(ids(filterSpecies(ALL, query({ search: 'mAcHaOn' })))).toStrictEqual(['tea-0003']);
    });

    it('ignores diacritics, so a name typed from memory still finds the record', () => {
      expect(ids(filterSpecies(ALL, query({ search: 'Kafer' })))).toStrictEqual(['tea-0003']);
      expect(ids(filterSpecies(ALL, query({ search: 'Käfer' })))).toStrictEqual(['tea-0003']);
    });

    it('returns nothing rather than everything when there is no match', () => {
      expect(filterSpecies(ALL, query({ search: 'zzzz' }))).toStrictEqual([]);
    });
  });

  describe('family', () => {
    it('keeps only the chosen family', () => {
      expect(ids(filterSpecies(ALL, query({ families: ['Papilionidae'] })))).toStrictEqual([
        'tea-0003',
      ]);
    });

    it('treats several families as an or', () => {
      expect(
        ids(filterSpecies(ALL, query({ families: ['Papilionidae', 'Lucanidae'] }))),
      ).toStrictEqual(['tea-0001', 'tea-0002', 'tea-0003']);
    });
  });

  it('applies every facet at once, as an and', () => {
    expect(
      ids(filterSpecies(ALL, query({ search: 'stag', families: ['Lucanidae'] }))),
    ).toStrictEqual(['tea-0001', 'tea-0002']);
    expect(filterSpecies(ALL, query({ search: 'stag', families: ['Papilionidae'] }))).toStrictEqual(
      [],
    );
  });
});

describe('sortSpecies', () => {
  it('orders by binomial, not by common name', () => {
    // `Dorcus` before `Lucanus` before `Papilio` — the common names would give
    // "Lesser stag", "Schwalbenschwanz", "Stag", which is a different order.
    expect(ids(sortSpecies(ALL, 'name'))).toStrictEqual(['tea-0002', 'tea-0001', 'tea-0003']);
  });

  it('orders by catalogue number', () => {
    expect(ids(sortSpecies([KAFER, STAG, LESSER], 'catalogue'))).toStrictEqual([
      'tea-0001',
      'tea-0002',
      'tea-0003',
    ]);
  });
});

describe('queryCatalogue', () => {
  it('filters and then sorts', () => {
    expect(
      ids(queryCatalogue(ALL, query({ families: ['Lucanidae'], sort: 'name' }))),
    ).toStrictEqual(['tea-0002', 'tea-0001']);
  });
});

describe('familiesOf', () => {
  it('lists each family once, alphabetically', () => {
    expect(familiesOf(ALL)).toStrictEqual(['Lucanidae', 'Papilionidae']);
  });
});
