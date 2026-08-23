import { describe, expect, it } from 'vitest';

import { LUCANUS_CERVUS } from '@/data/species';
import {
  boundsOf,
  parsePathData,
  pathPoints,
  plateViewBox,
  validatePlate,
  type PlatePartId,
} from '@/lib/plate';

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
      // animal look moulded rather than engraved. Measured off the lithograph,
      // a femur is about six per cent of the width across the wing cases and a
      // tibia about four; the elytra pair 300 units, so the ceilings below.
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

        const outline = flattenClosed(shaft?.d ?? '');

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

    it('fits inside the view box the renderer computes for it', () => {
      // The plate used to be framed by a box measured per axis, and the legs
      // came out over the edge of the frame. Every point, both halves, at each
      // scale a record might carry.
      for (const scale of [1, 0.6, 0.25]) {
        const box = plateViewBox(PLATE, scale);

        for (const point of allPoints()) {
          expect(point.x, `x at scale ${String(scale)}`).toBeGreaterThan(box.minX);
          expect(point.x, `x at scale ${String(scale)}`).toBeLessThan(box.minX + box.width);
          expect(point.y, `y at scale ${String(scale)}`).toBeGreaterThan(box.minY);
          expect(point.y, `y at scale ${String(scale)}`).toBeLessThan(box.minY + box.height);
        }
      }
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

/**
 * The width of a leg segment, measured across it.
 *
 * A femur or a tibia is authored as a capsule: the outline runs up one side,
 * round the far end, back down the other and round again. Anchor `i` and anchor
 * `n - 2 - i` are therefore the two edges of one cross-section, and the
 * distance between them is the width there.
 *
 * Measured this way rather than from a bounding box, which reports the pose of
 * a limb drawn at an angle, or from a rotating caliper, which reports the bend
 * of a limb drawn with a curve in it. Control points are ignored: they sit off
 * the curve by design.
 */
function capsuleWidth(d: string): number {
  const anchors = parsePathData(d).flatMap((segment) =>
    segment.c === 'Z' ? [] : [{ x: segment.x, y: segment.y }],
  );
  const first = anchors[0];
  const last = anchors.at(-1);
  // The closing anchor repeats the opening one; counting it twice offsets every
  // pairing by one.
  const ring = first?.x === last?.x && first?.y === last?.y ? anchors.slice(0, -1) : anchors;

  let widest = 0;

  for (let i = 0; i <= ring.length / 2 - 2; i += 1) {
    const near = ring[i];
    const far = ring[ring.length - 2 - i];

    if (near === undefined || far === undefined) continue;

    widest = Math.max(widest, Math.hypot(far.x - near.x, far.y - near.y));
  }

  return widest;
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
