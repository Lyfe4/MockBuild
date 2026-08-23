import {
  boundsOf,
  parsePathData,
  pathPoints,
  type PlatePart,
  type SpeciesPlate,
} from '@/lib/plate';

/**
 * Geometry helpers shared by the plate tests.
 *
 * Every function here answers a question about a drawing that TypeScript
 * cannot — is this stroke on that surface, is this limb as slender as the
 * reference, is every point inside the frame. Shared, because four plates
 * asking them four different ways is four chances to ask a weaker question.
 */

export interface Point {
  x: number;
  y: number;
}

/** Every point of every part, with the mirrored copies included. */
export function allPoints(plate: SpeciesPlate): Point[] {
  return plate.parts.flatMap((part) => {
    const points = pathPoints(parsePathData(part.d));

    return part.mirror === false
      ? points
      : [...points, ...points.map((point) => ({ x: -point.x, y: point.y }))];
  });
}

/** The on-curve points of one path. Control points sit off the curve by design. */
export function anchorsOf(d: string): Point[] {
  return parsePathData(d).flatMap((segment) =>
    segment.c === 'Z' ? [] : [{ x: segment.x, y: segment.y }],
  );
}

/** A closed path flattened to a polygon, sampling each cubic. */
export function flattenClosed(d: string): Point[] {
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
export function inside(polygon: readonly Point[], point: Point): boolean {
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

/**
 * Every surface that something is clipped to, flattened, with the strokes that
 * sit on it. The project's rule is that containment is proved in the data and
 * the clip is a second line of defence, and this is what proves it.
 */
export function clippedStrokes(
  plate: SpeciesPlate,
): { surface: string; outline: Point[]; strokes: PlatePart[] }[] {
  const surfaces = [
    ...new Set(plate.parts.flatMap((p) => (p.clipTo === undefined ? [] : [p.clipTo]))),
  ];

  return surfaces.map((surface) => {
    const pieces = plate.parts.filter((part) => part.id === surface);

    return {
      surface,
      // A surface drawn in more than one piece clips as one region, so the
      // check has to accept a point inside any of them.
      outline: flattenClosed(pieces[0]?.d ?? 'M0 0'),
      strokes: plate.parts.filter((part) => part.clipTo === surface),
    };
  });
}

/**
 * The width of a capsule, measured across it.
 *
 * A limb or an abdomen is authored as a capsule: the outline runs up one side,
 * round the far end, back down the other and round again. Anchor `i` and anchor
 * `n - 2 - i` are therefore the two edges of one cross-section.
 *
 * Measured this way rather than from a bounding box, which reports the pose of
 * a limb drawn at an angle, or from a rotating caliper, which reports the bend
 * of a limb drawn with a curve in it.
 */
export function capsuleWidth(d: string): number {
  const anchors = anchorsOf(d);
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

/**
 * The axis of a capsule, base tip to far tip.
 *
 * A capsule's ring runs up one side, over the far tip, back down the other side
 * and over the near one — so a spine of `n` points leaves `2n + 2` anchors and
 * the two tips are anchor `n` and the last one. Recovered from the outline
 * rather than read out of the landmark file on purpose: it measures the
 * *drawing*, which is the thing that can be wrong.
 */
export function capsuleAxis(d: string): { from: Point; to: Point } | undefined {
  const anchors = anchorsOf(d);
  const first = anchors[0];
  const last = anchors.at(-1);
  // The closing anchor repeats the opening one, exactly as in `capsuleWidth`.
  const ring = first?.x === last?.x && first?.y === last?.y ? anchors.slice(0, -1) : anchors;

  if (ring.length < 6 || ring.length % 2 !== 0) return undefined;

  const from = ring.at(-1);
  const to = ring[(ring.length - 2) / 2];

  if (from === undefined || to === undefined) return undefined;

  return { from, to };
}

/**
 * The angle between two capsules where they meet, in degrees.
 *
 * For a joint: an antenna's elbow, a leg's knee. Zero is a straight line
 * through both, so a bend that has to be *visible* has a number it must clear.
 * Undefined if either path is not a capsule.
 */
export function jointAngle(a: string, b: string): number | undefined {
  const first = capsuleAxis(a);
  const second = capsuleAxis(b);

  if (first === undefined || second === undefined) return undefined;

  const heading = ({ from, to }: { from: Point; to: Point }): number =>
    Math.atan2(to.y - from.y, to.x - from.x);
  const turn = Math.abs(heading(first) - heading(second)) % (Math.PI * 2);

  return (Math.min(turn, Math.PI * 2 - turn) * 180) / Math.PI;
}

/** How wide and how tall a set of points reaches. */
export function extent(points: readonly Point[]): { width: number; height: number } {
  const bounds = boundsOf(points);

  return {
    width: (bounds?.maxX ?? 0) - (bounds?.minX ?? 0),
    height: (bounds?.maxY ?? 0) - (bounds?.minY ?? 0),
  };
}
