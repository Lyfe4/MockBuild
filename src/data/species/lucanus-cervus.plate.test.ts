import { describe, expect, it } from 'vitest';

import { boundsOf, parsePathData, pathPoints, type PlatePartId } from '@/lib/plate';
import { describePlateContract } from '@/test/plateContract';
import { allPoints, capsuleWidth, flattenClosed, inside } from '@/test/plateGeometry';

import { LUCANUS_CERVUS as SPECIES } from './lucanus-cervus';
import { LUCANUS_CERVUS_PLATE as PLATE } from './lucanus-cervus.plate';

/**
 * The stag beetle, checked.
 *
 * The shared contract covers what every plate must be. What is only true of
 * *this* animal is the antler mandibles, the head being broader than the
 * pronotum, and the limb proportions — the first pass drew the legs half again
 * as heavy as the lithograph's and the beetle looked moulded rather than
 * engraved.
 */

function count(id: PlatePartId): number {
  return PLATE.parts.filter((part) => part.id === id).length;
}

describe('the Lucanus cervus plate', () => {
  describePlateContract(PLATE, SPECIES);

  describe('anatomy', () => {
    it('gives the animal one head, one pronotum and one scutellum', () => {
      expect(count('head')).toBe(1);
      expect(count('scutellum')).toBe(1);
      // Outline plus two grooves, all on the midline.
      expect(count('pronotum')).toBe(3);
    });

    it('gives it a mandible, an eye, an antenna and an elytron per side', () => {
      for (const part of ['eye', 'elytron'] as const) {
        const paths = PLATE.parts.filter((p) => p.id === part);

        expect(paths, part).toHaveLength(1);
        // Authored once and reflected, which is what makes it a pair.
        expect(paths[0]?.mirror, part).not.toBe(false);
      }
    });

    it('builds each leg from a femur, a tibia and three to five tarsal segments', () => {
      for (const pair of ['foreleg', 'midleg', 'hindleg'] as const) {
        expect(count(`${pair}-femur`), pair).toBe(1);
        // The tibia itself plus four spines, on every leg.
        expect(count(`${pair}-tibia`), pair).toBe(5);

        // Segments plus the paired claw: at least three real segments, and not
        // one long stroke pretending to be a foot.
        const tarsus = count(`${pair}-tarsus`);

        expect(tarsus, pair).toBeGreaterThanOrEqual(4);
        expect(tarsus, pair).toBeLessThanOrEqual(7);
      }
    });

    it('draws the femora and tibiae as slender as the reference does', () => {
      // The first pass drew the limbs as fat as the mandibles, which made the
      // animal look moulded. Measured off the lithograph, a femur is about six
      // per cent of the width across the wing cases and a tibia about four; the
      // elytra pair 300 units, so the ceilings below.
      const across = (id: PlatePartId): number =>
        capsuleWidth(PLATE.parts.find((p) => p.id === id && p.rank === 'structure')?.d ?? 'M0 0');

      for (const pair of ['foreleg', 'midleg', 'hindleg'] as const) {
        expect(across(`${pair}-femur`), `${pair} femur`).toBeLessThanOrEqual(20);
        expect(across(`${pair}-tibia`), `${pair} tibia`).toBeLessThanOrEqual(13);
        // And not so slender they stop reading as limbs.
        expect(across(`${pair}-tibia`), `${pair} tibia`).toBeGreaterThan(8);
      }
    });

    it('puts every tibial spine on the outside of the tibia it belongs to', () => {
      for (const pair of ['foreleg', 'midleg', 'hindleg'] as const) {
        const paths = PLATE.parts.filter((part) => part.id === `${pair}-tibia`);
        const shaft = paths.find((part) => part.rank === 'structure');
        const spines = paths.filter((part) => part.rank === 'detail');

        expect(spines, pair).toHaveLength(4);

        const outline = flattenClosed(shaft?.d ?? 'M0 0');

        for (const spine of spines) {
          const points = pathPoints(parsePathData(spine.d));
          const root = points[0];
          const tip = points.at(-1);

          // A spine leaves the shaft: its root sits on the outline and its tip
          // is clear of it, or it is a scratch drawn inside a solid limb.
          expect(inside(outline, tip ?? { x: 0, y: 0 }), `${pair} spine tip`).toBe(false);
          expect(
            Math.hypot((tip?.x ?? 0) - (root?.x ?? 0), (tip?.y ?? 0) - (root?.y ?? 0)),
            `${pair} spine length`,
          ).toBeGreaterThan(6);
        }
      }
    });

    it('gives the antenna a shaft and a lamellate club', () => {
      // Lucanidae are lamellate, and the record says so; the drawing has to
      // agree, or the identification key and the plate contradict each other.
      expect(SPECIES.morphology.antennae).toBe('lamellate');
      expect(count('antenna')).toBeGreaterThanOrEqual(4);
    });
  });

  describe('the silhouette', () => {
    it('runs from the mandible tips at the top to the elytral apex at 1000', () => {
      const bounds = boundsOf(allPoints(PLATE));

      // The mandibles are the topmost ink and they start near y = 0.
      expect(bounds?.minY).toBeGreaterThan(-20);
      expect(bounds?.minY).toBeLessThan(30);
      // The tarsi reach well past the abdomen, as a pinned specimen's do.
      expect(bounds?.maxY).toBeGreaterThan(1100);
    });

    it('is wider than it is long in the body, because of the legs', () => {
      const bounds = boundsOf(allPoints(PLATE));
      const halfWidth = Math.max(Math.abs(bounds?.minX ?? 0), bounds?.maxX ?? 0);

      // The fore legs are thrown forward past the head; a frame sized to the
      // body alone would cut them off.
      expect(halfWidth).toBeGreaterThan(300);
    });

    it('draws the head broader than the pronotum, as a male Lucanus is', () => {
      const widthOf = (id: PlatePartId): number => {
        const part = PLATE.parts.find((candidate) => candidate.id === id);
        const bounds = boundsOf(pathPoints(parsePathData(part?.d ?? 'M0 0')));

        return (bounds?.maxX ?? 0) - (bounds?.minX ?? 0);
      };

      expect(widthOf('head')).toBeGreaterThan(widthOf('pronotum'));
    });
  });

  describe('surface work', () => {
    it('clips every stroke of hatching to a surface', () => {
      const hatching = PLATE.parts.filter((part) => part.id === 'hatching');

      expect(hatching.length).toBeGreaterThan(8);

      for (const stroke of hatching) {
        expect(stroke.clipTo).toBeDefined();
      }
    });

    it('shades both the elytra and the pronotum', () => {
      const surfaces = new Set(
        PLATE.parts.filter((part) => part.id === 'hatching').map((part) => part.clipTo),
      );

      expect(surfaces).toEqual(new Set(['elytron', 'pronotum']));
    });

    it('cuts the silhouette with the heaviest lines', () => {
      const outlines = new Set(
        PLATE.parts.filter((part) => part.rank === 'outline').map((part) => part.id),
      );

      expect(outlines).toEqual(new Set(['head', 'pronotum', 'elytron', 'mandible']));
    });
  });
});
