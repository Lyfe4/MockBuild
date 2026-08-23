import { describe, expect, it } from 'vitest';

import { LUCANUS_CERVUS } from '@/data/species';
import { boundsOf, parsePathData, pathPoints, validatePlate, type PlatePartId } from '@/lib/plate';

import { LUCANUS_CERVUS_PLATE as PLATE } from './lucanus-cervus.plate';

/**
 * The plate itself, checked.
 *
 * `validatePlate` is the point of this file — a plate that fails it must not
 * ship, and the failure has to surface here rather than as a beetle with five
 * legs on the contact sheet. The rest are the assertions that only make sense
 * for *this* animal: that it has two mandibles rather than one, that the
 * silhouette is the shape a stag beetle is, and that the plate and the species
 * record still agree with each other.
 *
 * Nothing here asserts on coordinates. The numbers are traced by hand and will
 * be adjusted; pinning them would make every improvement a test failure.
 */

/** How many paths carry a given part id. */
function count(id: PlatePartId): number {
  return PLATE.parts.filter((part) => part.id === id).length;
}

/** Every point of every part, with the mirrored copies included. */
function allPoints() {
  return PLATE.parts.flatMap((part) => {
    const points = pathPoints(parsePathData(part.d));

    return part.mirror === false
      ? points
      : [...points, ...points.map((point) => ({ x: -point.x, y: point.y }))];
  });
}

describe('the Lucanus cervus plate', () => {
  it('validates', () => {
    // Printed rather than counted, so a failure names what is wrong.
    expect(validatePlate(PLATE)).toEqual([]);
  });

  it('draws the species it says it draws', () => {
    expect(PLATE.species).toBe(LUCANUS_CERVUS.id);
  });

  it('credits a reference with an artist, a year and a licence', () => {
    expect(PLATE.reference.artist).not.toBe('');
    expect(PLATE.reference.year).toBeLessThan(1923);
    expect(PLATE.reference.licence).toMatch(/public domain/i);
    expect(PLATE.reference.source).toMatch(/^https:\/\//);
  });

  it('stays inside the path vocabulary the schema allows', () => {
    for (const part of PLATE.parts) {
      // Every author-facing spelling is legal input, but the committed file
      // should be canonical: absolute cubics and nothing exotic.
      expect(part.d).toMatch(/^M[-\d.\s]+(C[-\d.\s]+)+Z?$/);
    }
  });

  it('keeps to a plate-sized number of paths', () => {
    // An engraving, not a trace. Under forty and the animal is a pictogram;
    // over ninety and it is a photograph nobody can maintain.
    expect(PLATE.parts.length).toBeGreaterThanOrEqual(40);
    expect(PLATE.parts.length).toBeLessThanOrEqual(90);
  });

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
        // Tibia plus its spines.
        expect(count(`${pair}-tibia`), pair).toBeGreaterThanOrEqual(2);

        // Segments plus the paired claw: at least three real segments, and not
        // one long stroke pretending to be a foot.
        const tarsus = count(`${pair}-tarsus`);

        expect(tarsus, pair).toBeGreaterThanOrEqual(4);
        expect(tarsus, pair).toBeLessThanOrEqual(7);
      }
    });

    it('gives the antenna a shaft and a lamellate club', () => {
      // Lucanidae are lamellate, and the record says so; the drawing has to
      // agree, or the identification key and the plate contradict each other.
      expect(LUCANUS_CERVUS.morphology.antennae).toBe('lamellate');
      expect(count('antenna')).toBeGreaterThanOrEqual(4);
    });
  });

  describe('the silhouette', () => {
    it('runs from the mandible tips at the top to the elytral apex at 1000', () => {
      const bounds = boundsOf(allPoints());

      expect(bounds).toBeDefined();
      // The mandibles are the topmost ink and they start near y = 0.
      expect(bounds?.minY).toBeGreaterThan(-20);
      expect(bounds?.minY).toBeLessThan(30);
      // The tarsi reach well past the abdomen, as a pinned specimen's do.
      expect(bounds?.maxY).toBeGreaterThan(1100);
    });

    it('is wider than it is long in the body, because of the legs', () => {
      const bounds = boundsOf(allPoints());
      const halfWidth = Math.max(Math.abs(bounds?.minX ?? 0), bounds?.maxX ?? 0);

      // The fore legs are thrown forward past the head; a frame sized to the
      // body alone would cut them off.
      expect(halfWidth).toBeGreaterThan(300);
    });

    it('is symmetric about the midline once the halves are reflected', () => {
      const bounds = boundsOf(allPoints());

      expect(Math.abs((bounds?.maxX ?? 0) + (bounds?.minX ?? 0))).toBeLessThan(1);
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

    it('keeps every clipped stroke inside its surface before the clip touches it', () => {
      // The project's rule: containment is proved in the data, and the clip is
      // a second line of defence. A stroke that only stays on the elytron
      // because the clip cut it is a stroke in the wrong place.
      for (const surfaceId of ['elytron', 'pronotum'] as const) {
        const surface = PLATE.parts.find((part) => part.id === surfaceId);
        const outline = flattenClosed(surface?.d ?? '');
        const confined = PLATE.parts.filter((part) => part.clipTo === surfaceId);

        expect(confined.length, surfaceId).toBeGreaterThan(0);

        for (const stroke of confined) {
          for (const point of pathPoints(parsePathData(stroke.d))) {
            expect(
              inside(outline, point),
              `${stroke.id} strays off the ${surfaceId} at ${String(point.x)},${String(point.y)}`,
            ).toBe(true);
          }
        }
      }
    });

    it('ranks its lines, heaviest for the silhouette and lightest for texture', () => {
      const ranks = new Set(PLATE.parts.map((part) => part.rank));

      // All three weights in use, or the drawing is flat.
      expect(ranks).toEqual(new Set(['outline', 'structure', 'detail']));

      // And the silhouette parts are the ones carrying the heaviest.
      const outlines = new Set(
        PLATE.parts.filter((part) => part.rank === 'outline').map((part) => part.id),
      );

      expect(outlines).toEqual(new Set(['head', 'pronotum', 'elytron', 'mandible']));
    });
  });
});

/* -- helpers for the containment check -------------------------------------- */

interface Point {
  x: number;
  y: number;
}

/** A closed path flattened to a polygon, sampling each cubic. */
function flattenClosed(d: string): Point[] {
  const segments = parsePathData(d);
  const points: Point[] = [];
  let cursor: Point = { x: 0, y: 0 };
  let start: Point = cursor;

  for (const segment of segments) {
    if (segment.c === 'M') {
      cursor = { x: segment.x, y: segment.y };
      start = cursor;
      points.push(cursor);
    } else if (segment.c === 'L') {
      cursor = { x: segment.x, y: segment.y };
      points.push(cursor);
    } else if (segment.c === 'C') {
      const from = cursor;

      for (let step = 1; step <= 16; step += 1) {
        const t = step / 16;
        const u = 1 - t;

        points.push({
          x:
            u ** 3 * from.x +
            3 * u ** 2 * t * segment.x1 +
            3 * u * t ** 2 * segment.x2 +
            t ** 3 * segment.x,
          y:
            u ** 3 * from.y +
            3 * u ** 2 * t * segment.y1 +
            3 * u * t ** 2 * segment.y2 +
            t ** 3 * segment.y,
        });
      }

      cursor = { x: segment.x, y: segment.y };
    } else {
      points.push(start);
      cursor = start;
    }
  }

  return points;
}

/** Ray casting. Points exactly on the boundary may go either way, which is fine. */
function inside(polygon: readonly Point[], point: Point): boolean {
  let hit = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];

    if (a === undefined || b === undefined) continue;

    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    ) {
      hit = !hit;
    }
  }

  return hit;
}
