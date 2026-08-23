import { describe, expect, it } from 'vitest';

import { findSpecies, SPECIES } from '@/data/species';
import {
  ANTENNA_FORMS,
  BODY_SHAPES,
  COLOUR_FAMILIES,
  MARKING_FORMS,
  MONTHS,
  SIZE_CLASSES,
  SPECIES_PIGMENTS,
  WING_COVERS,
} from '@/types';

/**
 * Record integrity for the entomological collection.
 *
 * These animals are real, which changes what a dataset test is for. With
 * invented plants the only risks were structural; here a record can be
 * well-formed and still wrong, so the checks that matter are the ones a reader
 * could catch us on — a citation missing, a size range inverted, a month
 * outside the year — plus the internal consistency the type system cannot see,
 * such as `sizeClass` agreeing with `sizeMm`.
 */
describe('SPECIES', () => {
  it('gives every species a unique slug', () => {
    const ids = SPECIES.map((species) => species.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('formats every slug as lower-case genus-species', () => {
    for (const species of SPECIES) {
      expect(species.id).toMatch(/^[a-z]+-[a-z]+$/);
    }
  });

  it('builds the slug from the taxonomy it carries', () => {
    for (const species of SPECIES) {
      const { genus, species: epithet } = species.taxonomy;

      expect(species.id).toBe(`${genus.toLowerCase()}-${epithet.toLowerCase()}`);
    }
  });

  it('capitalises the genus and lower-cases the epithet, as the code requires', () => {
    for (const { taxonomy } of SPECIES) {
      expect(taxonomy.genus).toMatch(/^[A-Z][a-z]+$/);
      expect(taxonomy.species).toMatch(/^[a-z]+$/);
    }
  });

  it('cites an authority with a year', () => {
    for (const { taxonomy } of SPECIES) {
      expect(taxonomy.authority).toMatch(/\d{4}\)?$/);
    }
  });

  it('orders every size range smallest to largest, in plausible millimetres', () => {
    for (const { sizeMm } of SPECIES) {
      expect(sizeMm.min).toBeGreaterThan(0);
      expect(sizeMm.max).toBeGreaterThanOrEqual(sizeMm.min);
      // No insect is a metre long, and none of interest is under a tenth of a
      // millimetre; a range outside this is a units mistake.
      expect(sizeMm.max).toBeLessThan(300);
    }
  });

  it('agrees with itself about size, comparing the class to the millimetres', () => {
    for (const species of SPECIES) {
      const { sizeClass } = species.morphology;
      const largest = species.sizeMm.max;

      const expected =
        largest < 5 ? 'tiny' : largest < 15 ? 'small' : largest < 30 ? 'medium' : 'large';

      expect(sizeClass, species.id).toBe(expected);
    }
  });

  it('names at least one month of adult activity, all real, in order, without repeats', () => {
    for (const species of SPECIES) {
      const months = species.activeMonths;

      expect(months.length).toBeGreaterThan(0);
      expect(new Set(months).size).toBe(months.length);

      for (const month of months) expect(MONTHS).toContain(month);

      expect([...months].sort((a, b) => a - b)).toEqual([...months]);
    }
  });

  it('draws every species in one of the six plate pigments, at a usable scale', () => {
    for (const species of SPECIES) {
      expect(SPECIES_PIGMENTS).toContain(species.pigment);
      expect(species.scale).toBeGreaterThanOrEqual(0.3);
      expect(species.scale).toBeLessThanOrEqual(1);
    }
  });

  it('keeps every morphological character inside its enumeration', () => {
    for (const { morphology } of SPECIES) {
      expect(WING_COVERS).toContain(morphology.wingCover);
      expect(ANTENNA_FORMS).toContain(morphology.antennae);
      expect(MARKING_FORMS).toContain(morphology.markings);
      expect(BODY_SHAPES).toContain(morphology.bodyShape);
      expect(SIZE_CLASSES).toContain(morphology.sizeClass);
      expect(COLOUR_FAMILIES).toContain(morphology.colourFamily);
    }
  });

  it('writes real prose in every text field', () => {
    for (const species of SPECIES) {
      expect(species.commonName.trim().length).toBeGreaterThan(0);
      // A sentence, not a placeholder.
      expect(species.distribution.trim().length).toBeGreaterThan(30);
      expect(species.notes.trim().length).toBeGreaterThan(80);
    }
  });

  it('cites at least two sources, each an https URL with a title', () => {
    for (const species of SPECIES) {
      expect(species.sources.length, species.id).toBeGreaterThanOrEqual(2);

      for (const source of species.sources) {
        expect(source.title.trim().length).toBeGreaterThan(0);
        expect(source.url).toMatch(/^https:\/\//);
      }
    }
  });
});

describe('findSpecies', () => {
  it('finds a species by its slug', () => {
    expect(findSpecies('lucanus-cervus')?.commonName).toBe('European stag beetle');
  });

  it('returns undefined for a slug the collection does not hold', () => {
    expect(findSpecies('lucanus-nonexistent')).toBeUndefined();
  });
});
