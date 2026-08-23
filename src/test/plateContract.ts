import { describe, expect, it } from 'vitest';

import { plateViewBox, validatePlate, type SpeciesPlate } from '@/lib/plate';
import type { Species } from '@/types';

import { allPoints, clippedStrokes, extent, flattenClosed, inside } from './plateGeometry';

/**
 * What every plate has to be true of, whatever it draws.
 *
 * Four species and counting, and the same six things go wrong on each: the
 * validator is not run, the reference is uncredited, a stroke sits off the
 * surface it claims to be on, the drawing leaves its frame, the line hierarchy
 * collapses to one weight, or the plate quietly stops matching the record it
 * says it draws. Asking each of those in four files is four chances to ask a
 * weaker version of it, so they are asked here and each species file adds only
 * what is true of *that animal*.
 *
 * Nothing here asserts on a coordinate. The numbers are traced by hand and will
 * be adjusted; pinning them would make every improvement a test failure.
 */
export function describePlateContract(plate: SpeciesPlate, species: Species): void {
  describe('the plate contract', () => {
    it('validates', () => {
      // Printed rather than counted, so a failure names what is wrong.
      expect(validatePlate(plate)).toEqual([]);
    });

    it('draws the species it says it draws', () => {
      expect(plate.species).toBe(species.id);
      expect(plate.order).toBe(species.taxonomy.order.toLowerCase());
    });

    it('credits a reference with an artist, a year and a licence', () => {
      expect(plate.reference.artist).not.toBe('');
      expect(plate.reference.title).not.toBe('');
      expect(plate.reference.year).toBeLessThan(1923);
      expect(plate.reference.licence).toMatch(/public domain/i);
      expect(plate.reference.source).toMatch(/^https:\/\//);
    });

    it('stays inside the path vocabulary the schema allows', () => {
      for (const part of plate.parts) {
        // Every author-facing spelling is legal input, but the committed file
        // should be canonical: absolute cubics and nothing exotic.
        expect(part.d, part.id).toMatch(/^M[-\d.\s]+(C[-\d.\s]+)+Z?$/);
      }
    });

    it('keeps to a plate-sized number of paths', () => {
      // An engraving, not a trace. Under forty and the animal is a pictogram;
      // over a hundred and it is a photograph nobody can maintain.
      expect(plate.parts.length).toBeGreaterThanOrEqual(40);
      expect(plate.parts.length).toBeLessThanOrEqual(100);
    });

    it('ranks its lines, and uses all three weights', () => {
      const ranks = new Set(plate.parts.map((part) => part.rank));

      // All three in use, or the drawing is flat and the thumbnail is a blob.
      expect(ranks).toEqual(new Set(['outline', 'structure', 'detail']));
    });

    it('fits inside the view box the renderer computes for it', () => {
      for (const scale of [1, 0.6, 0.25]) {
        const box = plateViewBox(plate, scale);

        for (const point of allPoints(plate)) {
          expect(point.x, `x at scale ${String(scale)}`).toBeGreaterThan(box.minX);
          expect(point.x, `x at scale ${String(scale)}`).toBeLessThan(box.minX + box.width);
          expect(point.y, `y at scale ${String(scale)}`).toBeGreaterThan(box.minY);
          expect(point.y, `y at scale ${String(scale)}`).toBeLessThan(box.minY + box.height);
        }
      }
    });

    it('is symmetric about the midline once the halves are reflected', () => {
      const { width } = extent(allPoints(plate));
      const half = allPoints(plate).reduce((most, p) => Math.max(most, Math.abs(p.x)), 0);

      expect(width).toBeCloseTo(half * 2, 1);
    });

    it('runs the body axis from the head end to about y = 1000', () => {
      // Plate space is what makes two species comparable, and a plate drawn to
      // its own scale silently breaks every side-by-side view.
      const ys = allPoints(plate).map((point) => point.y);

      expect(Math.min(...ys)).toBeLessThan(120);
      expect(Math.max(...ys)).toBeGreaterThan(880);
    });

    it('keeps every clipped stroke inside its surface before the clip touches it', () => {
      // The project's rule: containment is proved in the data, and the clip is
      // a second line of defence. A stroke that only stays on the wing because
      // the clip cut it is a stroke in the wrong place.
      const surfaces = clippedStrokes(plate);

      expect(surfaces.length).toBeGreaterThan(0);

      for (const { surface, outline, strokes } of surfaces) {
        expect(strokes.length, surface).toBeGreaterThan(0);

        for (const stroke of strokes) {
          // The curve itself, sampled — not its control points, which sit off
          // the curve by design and would report a stroke as straying when the
          // ink never leaves the surface.
          const points = flattenClosed(stroke.d);
          const off = points.filter((point) => !inside(outline, point));

          // A little tolerance: a stroke is allowed to touch the margin it is
          // drawn against, and a flattened outline is a polygon rather than the
          // curve. More than a tenth of a stroke outside is a stroke in the
          // wrong place.
          expect(
            off.length / points.length,
            `${stroke.id} strays off the ${surface}`,
          ).toBeLessThanOrEqual(0.1);
        }
      }
    });
  });
}
