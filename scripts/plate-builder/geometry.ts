/**
 * Landmarks in, path data out.
 *
 * The one piece of arithmetic in the pipeline, and the reason the pipeline
 * exists. An author measures points off a reference photograph; this turns
 * those points into the cubic Béziers `SpeciesPlate` wants, in plate space,
 * rounded the same way every time so that building twice produces the same
 * bytes twice.
 *
 * Everything here is pure: numbers in, a `d` string out. No file system, no
 * plate schema, no opinions about what a mandible is.
 *
 * ## Why cubics only
 *
 * `PlatePart.d` allows `M`, `L`, `C` and `Z`, and the plate contract asks the
 * committed files to be canonical — absolute cubics and nothing else. So even a
 * straight run is emitted as a cubic with its control points on the line. One
 * curve type means one way to mirror it, one way to flatten it and one way to
 * measure it.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Two decimal places, and never `-0`.
 *
 * Plate space is about 1300 units tall, so a hundredth of a unit is far finer
 * than any measurement an author can take off a photograph — it is here to make
 * the output stable rather than precise. `-0` is the interesting case: it
 * prints as `-0`, compares equal to `0`, and would make a mirrored coordinate
 * differ from its own reflection in the committed file but not in the renderer.
 */
export function round(value: number): number {
  const scaled = Math.round(value * 100) / 100;

  return scaled === 0 ? 0 : scaled;
}

const pair = (point: Point): string => `${String(round(point.x))} ${String(round(point.y))}`;

/** A path from a first point and a run of cubic segments. */
export function pathFrom(
  start: Point,
  segments: readonly { c1: Point; c2: Point; to: Point }[],
  closed: boolean,
): string {
  const body = segments.map((s) => `C${pair(s.c1)} ${pair(s.c2)} ${pair(s.to)}`).join(' ');

  return `M${pair(start)}${body === '' ? '' : ` ${body}`}${closed ? ' Z' : ''}`;
}

/**
 * How much of the computed tangent a control point keeps. 1 is the curve that
 * passes through the landmarks with the least fuss; lower it to tighten a curve
 * towards its chords.
 */
export const DEFAULT_TENSION = 1;

/**
 * Centripetal Catmull-Rom, and why it is not the uniform kind.
 *
 * Uniform Catmull-Rom sets each tangent from the chord between a landmark's
 * neighbours, which is fine while the landmarks are evenly spaced and badly
 * behaved when they are not: at the blunt end of a ladybird's wing case, where
 * one landmark sits close and the next a long way off, the control points fly
 * out well past the curve. That is not merely untidy here. `plateBounds`
 * measures control points on purpose — a Bézier stays inside the hull of its
 * control points, so bounding them bounds the ink — and control points 130
 * units outside the drawing make the frame that much too loose and the animal
 * that much too small in it. The first build of the ladybird came out 0.64 as
 * wide as it was long against the 0.85 measured off the lithograph, and the
 * curve itself had not moved at all.
 *
 * Centripetal parameterisation — chord length to the power of a half — is the
 * standard cure. It cannot cusp or loop between landmarks, and its control
 * points stay near the curve whatever the spacing.
 */
const ALPHA = 0.5;

export interface CurveOptions {
  readonly closed?: boolean;
  readonly tension?: number;
  /**
   * Whether this curve is half of a bilaterally symmetric part.
   *
   * A mirrored part that touches the midline is joined to its own reflection
   * there, and the join is smooth only if the tangent is vertical: any sideways
   * component becomes a corner in the finished animal, and a control point a
   * fraction left of x = 0 is a `negative-x` from `validatePlate`, which is
   * right to complain — the author drew the right half and the builder put ink
   * on the left. So a landmark on the axis gets a vertical tangent, which is
   * what the anatomy says it should have had anyway.
   */
  readonly symmetric?: boolean;
}

/** Close enough to the midline to be on it. Landmarks are measured to 0.01. */
const ON_MIDLINE = 0.005;

/**
 * A smooth curve through every landmark.
 *
 * The curve passes *through* the points rather than being pulled towards them,
 * which is what an author measuring a margin off a photograph expects: the
 * points are on the animal.
 *
 * Open curves clamp at the ends — the first and last landmarks are the ends of
 * the stroke, not the start of a loop.
 */
export function curve(points: readonly Point[], options: CurveOptions = {}): string {
  const closed = options.closed ?? false;
  const tension = options.tension ?? DEFAULT_TENSION;
  const symmetric = options.symmetric ?? false;
  const ring = [...points];

  if (ring.length < 2) throw new Error('a curve needs at least two landmarks');

  const first = ring[0];
  const last = ring.at(-1);

  if (first === undefined || last === undefined) throw new Error('unreachable');

  // A closed curve repeats its first point as its last so the seam is a segment
  // like any other; an open one does not.
  if (closed && (first.x !== last.x || first.y !== last.y)) ring.push(first);

  const n = ring.length;
  const at = (i: number): Point => {
    const index = closed ? ((i % (n - 1)) + (n - 1)) % (n - 1) : Math.max(0, Math.min(n - 1, i));
    const point = ring[index];

    if (point === undefined) throw new Error('unreachable');

    return point;
  };

  const step = (a: Point, b: Point): number => Math.hypot(b.x - a.x, b.y - a.y) ** ALPHA || 1e-6;
  const segments = [];

  for (let i = 0; i < n - 1; i += 1) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);

    const t0 = 0;
    const t1 = t0 + step(p0, p1);
    const t2 = t1 + step(p1, p2);
    const t3 = t2 + step(p2, p3);

    const slope = (a: Point, b: Point, ta: number, tb: number, axis: 'x' | 'y'): number =>
      (b[axis] - a[axis]) / (tb - ta);

    const tangent = (axis: 'x' | 'y'): { out: number; in: number } => ({
      out:
        (t2 - t1) *
        (slope(p0, p1, t0, t1, axis) - slope(p0, p2, t0, t2, axis) + slope(p1, p2, t1, t2, axis)),
      in:
        (t2 - t1) *
        (slope(p1, p2, t1, t2, axis) - slope(p1, p3, t1, t3, axis) + slope(p2, p3, t2, t3, axis)),
    });

    const x = tangent('x');
    const y = tangent('y');

    const c1 = { x: p1.x + (x.out * tension) / 3, y: p1.y + (y.out * tension) / 3 };
    const c2 = { x: p2.x - (x.in * tension) / 3, y: p2.y - (y.in * tension) / 3 };

    segments.push({
      c1: symmetric && Math.abs(p1.x) <= ON_MIDLINE ? { x: p1.x, y: c1.y } : c1,
      c2: symmetric && Math.abs(p2.x) <= ON_MIDLINE ? { x: p2.x, y: c2.y } : c2,
      to: p2,
    });
  }

  return pathFrom(ring[0] ?? first, segments, closed);
}

/** Unit normal to the left of the direction from `a` to `b`. */
function normal(a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;

  return { x: -dy / length, y: dx / length };
}

/** The outward normal at each point of a polyline, averaged at the joints. */
function normals(spine: readonly Point[]): Point[] {
  return spine.map((point, i) => {
    const before = spine[i - 1];
    const after = spine[i + 1];

    if (before === undefined) return normal(point, after ?? point);
    if (after === undefined) return normal(before, point);

    const a = normal(before, point);
    const b = normal(point, after);
    const x = a.x + b.x;
    const y = a.y + b.y;
    const length = Math.hypot(x, y) || 1;

    return { x: x / length, y: y / length };
  });
}

export interface CapsuleOptions {
  /** One width for the whole limb, or one per spine point to taper it. */
  readonly width: number | readonly number[];
  readonly tension?: number;
  readonly symmetric?: boolean;
}

/**
 * A limb: a spine, a thickness, and rounded ends.
 *
 * A femur or a tibia is a capsule — CLAUDE.md records the proportions, roughly
 * six and four per cent of the width across the wing cases — and authoring one
 * as a closed outline means an author hand-placing eight points that have to
 * stay parallel while the limb bends. Here the author places the *spine*, which
 * is the thing that can actually be measured off a photograph, and says how
 * thick it is.
 *
 * The ends are rounded by carrying the offset round the tip, which is why the
 * result is one closed curve rather than two strokes and two arcs.
 */
export function capsule(spine: readonly Point[], options: CapsuleOptions): string {
  if (spine.length < 2) throw new Error('a capsule needs at least two spine points');

  const norms = normals(spine);
  const widthAt = (i: number): number => {
    const { width } = options;

    if (typeof width === 'number') return width;

    const value = width[i] ?? width.at(-1);

    if (value === undefined) throw new Error('a tapered capsule needs at least one width');

    return value;
  };

  const side = (sign: number): Point[] =>
    spine.map((point, i) => {
      const n = norms[i];

      if (n === undefined) throw new Error('unreachable');

      const half = (widthAt(i) / 2) * sign;

      return { x: point.x + n.x * half, y: point.y + n.y * half };
    });

  const head = spine[0];
  const tail = spine.at(-1);

  if (head === undefined || tail === undefined) throw new Error('unreachable');

  const headNormal = norms[0];
  const tailNormal = norms.at(-1);

  if (headNormal === undefined || tailNormal === undefined) throw new Error('unreachable');

  // The tip: one point past the end, on the axis, so the closing curve rounds
  // over rather than cutting the limb off square.
  const headAxis = { x: head.x - (spine[1]?.x ?? head.x), y: head.y - (spine[1]?.y ?? head.y) };
  const tailAxis = {
    x: tail.x - (spine.at(-2)?.x ?? tail.x),
    y: tail.y - (spine.at(-2)?.y ?? tail.y),
  };
  const unit = (p: Point): Point => {
    const length = Math.hypot(p.x, p.y) || 1;

    return { x: p.x / length, y: p.y / length };
  };
  const headTip = unit(headAxis);
  const tailTip = unit(tailAxis);
  const headRadius = widthAt(0) / 2;
  const tailRadius = widthAt(spine.length - 1) / 2;

  const ring = [
    ...side(1),
    { x: tail.x + tailTip.x * tailRadius, y: tail.y + tailTip.y * tailRadius },
    ...side(-1).reverse(),
    { x: head.x + headTip.x * headRadius, y: head.y + headTip.y * headRadius },
  ];

  return curve(ring, {
    closed: true,
    symmetric: options.symmetric ?? false,
    ...(options.tension === undefined ? {} : { tension: options.tension }),
  });
}

/**
 * An eye, a spot, a fleck.
 *
 * Four cubics with the standard magic constant, rotated if asked. Authoring one
 * as a hand-drawn ring is how a spot ends up very slightly egg-shaped, which
 * shows the moment two of them sit side by side.
 */
export function ellipse(centre: Point, rx: number, ry: number, rotateDegrees = 0): string {
  const kappa = 0.5522847498307936;
  const angle = (rotateDegrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const map = (x: number, y: number): Point => ({
    x: centre.x + x * cos - y * sin,
    y: centre.y + x * sin + y * cos,
  });

  const ox = rx * kappa;
  const oy = ry * kappa;

  return pathFrom(
    map(rx, 0),
    [
      { c1: map(rx, oy), c2: map(ox, ry), to: map(0, ry) },
      { c1: map(-ox, ry), c2: map(-rx, oy), to: map(-rx, 0) },
      { c1: map(-rx, -oy), c2: map(-ox, -ry), to: map(0, -ry) },
      { c1: map(ox, -ry), c2: map(rx, -oy), to: map(rx, 0) },
    ],
    true,
  );
}

export interface StripOptions {
  /** How deep the band is, from the edge inwards. One number, or one per point. */
  readonly depth: number | readonly number[];
  readonly tension?: number;
  readonly symmetric?: boolean;
}

/**
 * A band that follows an edge: a marginal border, a costal wash, a segment ring.
 *
 * The author traces the edge — which is a thing on the animal — and says how
 * far in the colour reaches. Offsetting by the normal rather than straight down
 * means the band keeps its width round a curve, which is the difference between
 * a border and a wedge.
 *
 * The depth runs to the right of the direction of travel — which, with y
 * increasing downwards as it does in plate space, is the *inside* of an outline
 * traced clockwise. Trace the edge the way the outline runs and the band lands
 * on the animal; trace it backwards and it lands off the animal, which the
 * plate test catches as a stroke straying off its surface.
 */
export function strip(edge: readonly Point[], options: StripOptions): string {
  if (edge.length < 2) throw new Error('a strip needs at least two edge points');

  const norms = normals(edge);
  const depthAt = (i: number): number => {
    const { depth } = options;

    if (typeof depth === 'number') return depth;

    const value = depth[i] ?? depth.at(-1);

    if (value === undefined) throw new Error('a tapered strip needs at least one depth');

    return value;
  };

  const inner = edge
    .map((point, i) => {
      const n = norms[i];

      if (n === undefined) throw new Error('unreachable');

      return { x: point.x + n.x * depthAt(i), y: point.y + n.y * depthAt(i) };
    })
    .reverse();

  return curve([...edge, ...inner], {
    closed: true,
    symmetric: options.symmetric ?? false,
    ...(options.tension === undefined ? {} : { tension: options.tension }),
  });
}

export interface FanOptions {
  /** How many strokes, including both guides. */
  readonly count: number;
  readonly tension?: number;
  readonly symmetric?: boolean;
}

/**
 * A run of strokes between two guides: hatching, striae, wing veins.
 *
 * The two guides are the first and the last stroke, and the rest are
 * interpolated between them point for point — so both guides need the same
 * number of landmarks. Sixteen hatching strokes measured by hand is sixteen
 * chances to put one a hair out of step; two guides and a count is not.
 */
export function fan(from: readonly Point[], to: readonly Point[], options: FanOptions): string[] {
  if (from.length !== to.length) {
    throw new Error(
      `a fan needs matching guides: ${String(from.length)} against ${String(to.length)}`,
    );
  }

  if (options.count < 2) throw new Error('a fan needs at least two strokes');

  const strokes: string[] = [];

  for (let i = 0; i < options.count; i += 1) {
    const t = i / (options.count - 1);
    const points = from.map((start, j) => {
      const end = to[j];

      if (end === undefined) throw new Error('unreachable');

      return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
    });

    strokes.push(
      curve(points, {
        closed: false,
        symmetric: options.symmetric ?? false,
        ...(options.tension === undefined ? {} : { tension: options.tension }),
      }),
    );
  }

  return strokes;
}
