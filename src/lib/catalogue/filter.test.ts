import { describe, expect, it } from 'vitest';

import { SPECIMENS } from '@/data';
import type { Specimen } from '@/types';

import { familiesOf, filterSpecimens, queryCatalogue, sortSpecimens } from './filter';
import { EMPTY_QUERY, type CatalogueQuery } from './query';

const query = (overrides: Partial<CatalogueQuery> = {}): CatalogueQuery => ({
  ...EMPTY_QUERY,
  ...overrides,
});

const ids = (specimens: readonly Specimen[]): string[] => specimens.map((s) => s.id);

describe('filterSpecimens', () => {
  it('returns everything for an empty query', () => {
    expect(filterSpecimens(SPECIMENS, query())).toHaveLength(SPECIMENS.length);
  });

  it('never mutates the source list', () => {
    const before = ids(SPECIMENS);

    filterSpecimens(SPECIMENS, query({ search: 'x' }));
    sortSpecimens(SPECIMENS, 'name');

    expect(ids(SPECIMENS)).toStrictEqual(before);
  });

  describe('search', () => {
    it('matches the scientific name', () => {
      expect(ids(filterSpecimens(SPECIMENS, query({ search: 'Cinerastrum' })))).toStrictEqual([
        'TBA-0007',
      ]);
    });

    it('matches the common name', () => {
      expect(ids(filterSpecimens(SPECIMENS, query({ search: 'Ash saltbush' })))).toStrictEqual([
        'TBA-0007',
      ]);
    });

    it('matches the catalogue number', () => {
      expect(ids(filterSpecimens(SPECIMENS, query({ search: 'TBA-0042' })))).toStrictEqual([
        'TBA-0042',
      ]);
    });

    it('matches the family', () => {
      const found = filterSpecimens(SPECIMENS, query({ search: 'Ericaceae' }));

      expect(found.length).toBeGreaterThan(1);
      expect(found.every((s) => s.family === 'Ericaceae')).toBe(true);
    });

    it('ignores case', () => {
      expect(ids(filterSpecimens(SPECIMENS, query({ search: 'cInErAsTrUm' })))).toStrictEqual([
        'TBA-0007',
      ]);
    });

    it('ignores diacritics in either direction', () => {
      // Someone on a plain keyboard should still find an accented name, and a
      // pasted accented term should still find the unaccented record.
      expect(ids(filterSpecimens(SPECIMENS, query({ search: 'Cinerástrum' })))).toStrictEqual([
        'TBA-0007',
      ]);
    });

    it('does not search the curator note', () => {
      // The note is prose about the sheet, not about the plant. Searching it
      // answers a different question from the one the box appears to ask.
      const withNoteWord = SPECIMENS.filter((s) => /roadside/i.test(s.notes));

      expect(withNoteWord.length).toBeGreaterThan(0);
      expect(filterSpecimens(SPECIMENS, query({ search: 'roadside' }))).toHaveLength(0);
    });

    it('returns nothing for a term that matches nothing', () => {
      expect(filterSpecimens(SPECIMENS, query({ search: 'zzzzz' }))).toHaveLength(0);
    });
  });

  describe('facets', () => {
    it('treats an empty facet as no constraint', () => {
      expect(filterSpecimens(SPECIMENS, query({ habitats: [] }))).toHaveLength(SPECIMENS.length);
    });

    it('filters by habitat', () => {
      const found = filterSpecimens(SPECIMENS, query({ habitats: ['alpine'] }));

      expect(found.length).toBeGreaterThan(0);
      expect(found.every((s) => s.habitat === 'alpine')).toBe(true);
    });

    it('treats multiple values in one facet as OR', () => {
      const alpine = filterSpecimens(SPECIMENS, query({ habitats: ['alpine'] }));
      const wetland = filterSpecimens(SPECIMENS, query({ habitats: ['wetland'] }));
      const both = filterSpecimens(SPECIMENS, query({ habitats: ['alpine', 'wetland'] }));

      expect(both).toHaveLength(alpine.length + wetland.length);
    });

    it('treats different facets as AND', () => {
      const found = filterSpecimens(SPECIMENS, query({ habitats: ['alpine'], statuses: ['EN'] }));

      expect(found.every((s) => s.habitat === 'alpine' && s.conservationStatus === 'EN')).toBe(
        true,
      );
    });

    it('matches a specimen if any of its seasons is selected', () => {
      const multiSeason = SPECIMENS.find((s) => s.seasons.length > 1);

      expect(multiSeason).toBeDefined();

      for (const season of multiSeason!.seasons) {
        expect(ids(filterSpecimens(SPECIMENS, query({ seasons: [season] })))).toContain(
          multiSeason!.id,
        );
      }
    });

    it('filters by family and by status', () => {
      expect(
        filterSpecimens(SPECIMENS, query({ families: ['Ericaceae'] })).every(
          (s) => s.family === 'Ericaceae',
        ),
      ).toBe(true);
      expect(
        filterSpecimens(SPECIMENS, query({ statuses: ['EX'] })).every(
          (s) => s.conservationStatus === 'EX',
        ),
      ).toBe(true);
    });

    it('can narrow to nothing', () => {
      // A real combination with no members: the UI must handle an empty result.
      expect(
        filterSpecimens(SPECIMENS, query({ habitats: ['alpine'], seasons: ['autumn'] })),
      ).toHaveLength(0);
    });
  });
});

describe('sortSpecimens', () => {
  it('orders by catalogue number', () => {
    const sorted = ids(sortSpecimens(SPECIMENS, 'catalogue'));

    expect(sorted).toStrictEqual([...sorted].sort());
  });

  it('orders by scientific name', () => {
    const names = sortSpecimens(SPECIMENS, 'name').map((s) => s.scientificName);

    expect(names).toStrictEqual([...names].sort((a, b) => a.localeCompare(b, 'en-AU')));
  });

  it('orders by collection date, most recent first', () => {
    const dates = sortSpecimens(SPECIMENS, 'collected').map((s) => s.collectedOn);

    expect(dates).toStrictEqual([...dates].sort().reverse());
  });

  it('returns a new array rather than sorting in place', () => {
    const sorted = sortSpecimens(SPECIMENS, 'name');

    expect(sorted).not.toBe(SPECIMENS);
  });

  it('keeps every specimen, whatever the order', () => {
    for (const key of ['catalogue', 'name', 'collected'] as const) {
      expect(sortSpecimens(SPECIMENS, key)).toHaveLength(SPECIMENS.length);
    }
  });
});

describe('queryCatalogue', () => {
  it('filters and then sorts', () => {
    const result = queryCatalogue(SPECIMENS, query({ habitats: ['alpine'], sort: 'name' }));
    const names = result.map((s) => s.scientificName);

    expect(result.every((s) => s.habitat === 'alpine')).toBe(true);
    expect(names).toStrictEqual([...names].sort((a, b) => a.localeCompare(b, 'en-AU')));
  });
});

describe('familiesOf', () => {
  it('lists each family once, alphabetically', () => {
    const families = familiesOf(SPECIMENS);

    expect(new Set(families).size).toBe(families.length);
    expect(families).toStrictEqual([...families].sort((a, b) => a.localeCompare(b, 'en-AU')));
  });

  it('covers every family in the dataset', () => {
    expect(new Set(familiesOf(SPECIMENS))).toStrictEqual(new Set(SPECIMENS.map((s) => s.family)));
  });
});
