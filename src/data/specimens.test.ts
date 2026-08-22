import { describe, expect, it } from 'vitest';

import { SPECIMENS } from '@/data/specimens';
import { FLOWER_TYPES, LEAF_SHAPES } from '@/lib/plant';
import { CONSERVATION_STATUSES, HABITATS, SEASONS } from '@/types';

/**
 * Dataset integrity.
 *
 * The type system guarantees each record has the right *shape*; these cover the
 * constraints it cannot express — uniqueness, real dates, and enumeration
 * coverage. The coverage tests exist so the catalogue filters have something to
 * filter: a status or habitat with no specimens behind it renders an empty
 * facet, which reads as a bug to anyone using the site.
 */
describe('SPECIMENS', () => {
  it('holds the full accession list', () => {
    expect(SPECIMENS).toHaveLength(24);
  });

  it('gives every specimen a unique catalogue number', () => {
    const ids = SPECIMENS.map((specimen) => specimen.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('formats every catalogue number as TBA- plus four digits', () => {
    for (const specimen of SPECIMENS) {
      expect(specimen.id).toMatch(/^TBA-\d{4}$/);
    }
  });

  it('records a real, correctly formatted collection date', () => {
    for (const specimen of SPECIMENS) {
      expect(specimen.collectedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // `new Date('2019-02-31')` does not throw — it rolls over to 3 March. Round
      // -tripping catches that, where a parse check alone would not.
      const parsed = new Date(`${specimen.collectedOn}T00:00:00Z`);

      expect(Number.isNaN(parsed.getTime())).toBe(false);
      expect(parsed.toISOString().slice(0, 10)).toBe(specimen.collectedOn);
    }
  });

  it('does not record a collection from the future', () => {
    for (const specimen of SPECIMENS) {
      expect(specimen.collectedOn <= '2026-01-01').toBe(true);
    }
  });

  it('gives every specimen at least one season, with no duplicates', () => {
    for (const specimen of SPECIMENS) {
      expect(specimen.seasons.length).toBeGreaterThan(0);
      expect(new Set(specimen.seasons).size).toBe(specimen.seasons.length);
    }
  });

  it('fills in every text field', () => {
    for (const specimen of SPECIMENS) {
      for (const field of [
        'scientificName',
        'commonName',
        'family',
        'collectedBy',
        'region',
        'notes',
      ] as const) {
        expect(specimen[field].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('writes a curator note of label length, not marketing length', () => {
    for (const specimen of SPECIMENS) {
      expect(specimen.notes.length).toBeGreaterThan(40);
      expect(specimen.notes.length).toBeLessThan(220);
      expect(specimen.notes.endsWith('.')).toBe(true);
    }
  });

  it('uses every habitat at least once', () => {
    const used = new Set(SPECIMENS.map((specimen) => specimen.habitat));

    expect([...used].sort()).toEqual([...HABITATS].sort());
  });

  it('uses every conservation status at least once', () => {
    const used = new Set(SPECIMENS.map((specimen) => specimen.conservationStatus));

    expect([...used].sort()).toEqual([...CONSERVATION_STATUSES].sort());
  });

  it('represents every season at least once', () => {
    const used = new Set(SPECIMENS.flatMap((specimen) => [...specimen.seasons]));

    expect([...used].sort()).toEqual([...SEASONS].sort());
  });

  it('draws on more than a handful of families', () => {
    const families = new Set(SPECIMENS.map((specimen) => specimen.family));

    expect(families.size).toBeGreaterThanOrEqual(10);
  });

  it('exercises every leaf shape and flower arrangement the generator supports', () => {
    const shapes = new Set(SPECIMENS.map((specimen) => specimen.form.leafShape));
    const flowers = new Set(SPECIMENS.map((specimen) => specimen.form.flowerType));

    expect([...shapes].sort()).toEqual([...LEAF_SHAPES].sort());
    expect([...flowers].sort()).toEqual([...FLOWER_TYPES].sort());
  });

  it('keeps every form parameter inside its documented range', () => {
    for (const specimen of SPECIMENS) {
      const { form } = specimen;

      expect(form.branchCount).toBeGreaterThanOrEqual(1);
      expect(form.branchCount).toBeLessThanOrEqual(5);
      expect(form.branchDepth).toBeGreaterThanOrEqual(0);
      expect(form.branchDepth).toBeLessThanOrEqual(5);
      expect(form.branchAngle).toBeGreaterThanOrEqual(5);
      expect(form.branchAngle).toBeLessThanOrEqual(60);
      expect(Math.abs(form.stemCurve)).toBeLessThanOrEqual(0.6);
      expect(form.leafDensity).toBeGreaterThanOrEqual(0);
      expect(form.leafDensity).toBeLessThanOrEqual(1);
      expect(form.flowerSize).toBeGreaterThanOrEqual(0.4);
      expect(form.flowerSize).toBeLessThanOrEqual(2);
      expect(form.height).toBeGreaterThanOrEqual(0.3);
      expect(form.height).toBeLessThanOrEqual(1);
      expect(form.scale).toBeGreaterThanOrEqual(0.5);
      expect(form.scale).toBeLessThanOrEqual(1);
    }
  });

  it('is ordered by catalogue number', () => {
    const ids = SPECIMENS.map((specimen) => specimen.id);

    expect(ids).toEqual([...ids].sort());
  });
});
