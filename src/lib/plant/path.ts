import type { PathCommand, Point } from './types';

/**
 * Path helpers: building, measuring and transforming command lists.
 *
 * Kept apart from the growth modules because none of this knows what a plant
 * is — it is geometry, and it is where the awkward numeric work lives so
 * `branch.ts` and `leaf.ts` can stay readable.
 */

/** Rounds to 2dp. Trims the output and keeps snapshots stable across platforms. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** `M x y` */
export function moveTo(x: number, y: number): PathCommand {
  return { c: 'M', x: round(x), y: round(y) };
}

/** `L x y` */
export function lineTo(x: number, y: number): PathCommand {
  return { c: 'L', x: round(x), y: round(y) };
}

/** `C x1 y1 x2 y2 x y` — cubic Bézier. */
export function curveTo(c1: Point, c2: Point, end: Point): PathCommand {
  return {
    c: 'C',
    x1: round(c1.x),
    y1: round(c1.y),
    x2: round(c2.x),
    y2: round(c2.y),
    x: round(end.x),
    y: round(end.y),
  };
}

/** `Q x1 y1 x y` — quadratic Bézier. */
export function quadTo(control: Point, end: Point): PathCommand {
  return { c: 'Q', x1: round(control.x), y1: round(control.y), x: round(end.x), y: round(end.y) };
}

/** `Z` — close the subpath. */
export const closePath: PathCommand = { c: 'Z' };

/**
 * Serialises commands into an SVG `d` attribute.
 *
 * The one place a path becomes a string. Everything upstream stays structured,
 * which is what lets the tests assert on geometry rather than on formatting.
 */
export function toPathData(commands: readonly PathCommand[]): string {
  return commands
    .map((command) => {
      switch (command.c) {
        case 'M':
          return `M${String(command.x)} ${String(command.y)}`;
        case 'L':
          return `L${String(command.x)} ${String(command.y)}`;
        case 'C':
          return `C${String(command.x1)} ${String(command.y1)} ${String(command.x2)} ${String(command.y2)} ${String(command.x)} ${String(command.y)}`;
        case 'Q':
          return `Q${String(command.x1)} ${String(command.y1)} ${String(command.x)} ${String(command.y)}`;
        case 'Z':
          return 'Z';
      }
    })
    .join(' ');
}

/** Every anchor and control point in a command list, for bounds work. */
export function commandPoints(commands: readonly PathCommand[]): Point[] {
  const points: Point[] = [];

  for (const command of commands) {
    switch (command.c) {
      case 'M':
      case 'L':
        points.push({ x: command.x, y: command.y });
        break;
      case 'Q':
        points.push({ x: command.x1, y: command.y1 }, { x: command.x, y: command.y });
        break;
      case 'C':
        points.push(
          { x: command.x1, y: command.y1 },
          { x: command.x2, y: command.y2 },
          { x: command.x, y: command.y },
        );
        break;
      case 'Z':
        break;
    }
  }

  return points;
}

/**
 * Applies a point transform to every coordinate in a command list.
 *
 * Control points move with their anchors, which is what keeps a curve's shape
 * intact under the uniform scale-and-flip that `generate` finishes with.
 */
export function mapCommands(
  commands: readonly PathCommand[],
  transform: (point: Point) => Point,
): PathCommand[] {
  return commands.map((command): PathCommand => {
    switch (command.c) {
      case 'M': {
        const p = transform({ x: command.x, y: command.y });
        return moveTo(p.x, p.y);
      }
      case 'L': {
        const p = transform({ x: command.x, y: command.y });
        return lineTo(p.x, p.y);
      }
      case 'Q': {
        const control = transform({ x: command.x1, y: command.y1 });
        const end = transform({ x: command.x, y: command.y });
        return quadTo(control, end);
      }
      case 'C': {
        const c1 = transform({ x: command.x1, y: command.y1 });
        const c2 = transform({ x: command.x2, y: command.y2 });
        const end = transform({ x: command.x, y: command.y });
        return curveTo(c1, c2, end);
      }
      case 'Z':
        return closePath;
    }
  });
}

/** A point on a cubic Bézier at `t` in `[0, 1]`. */
export function cubicPointAt(p0: Point, c1: Point, c2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;

  return {
    x: a * p0.x + b * c1.x + c * c2.x + d * p3.x,
    y: a * p0.y + b * c1.y + c * c2.y + d * p3.y,
  };
}

/** The unit tangent of a cubic Bézier at `t`, as an angle measured from +y. */
export function cubicAngleAt(p0: Point, c1: Point, c2: Point, p3: Point, t: number): number {
  const u = 1 - t;
  const dx = 3 * u * u * (c1.x - p0.x) + 6 * u * t * (c2.x - c1.x) + 3 * t * t * (p3.x - c2.x);
  const dy = 3 * u * u * (c1.y - p0.y) + 6 * u * t * (c2.y - c1.y) + 3 * t * t * (p3.y - c2.y);

  // atan2(dx, dy) rather than (dy, dx): angles here are measured from +y.
  return Math.atan2(dx, dy);
}

/**
 * Approximate arc length of a cubic, by chording it.
 *
 * Sixteen samples is well inside a pixel at this scale, and the value is only
 * ever used to choose a sample count and to report segment length, so a
 * fraction of a percent of error is immaterial.
 */
export function cubicLength(p0: Point, c1: Point, c2: Point, p3: Point): number {
  const samples = 16;
  let length = 0;
  let previous = p0;

  for (let i = 1; i <= samples; i += 1) {
    const current = cubicPointAt(p0, c1, c2, p3, i / samples);
    length += Math.hypot(current.x - previous.x, current.y - previous.y);
    previous = current;
  }

  return length;
}

/**
 * Builds a closed outline around a cubic centreline whose width eases from
 * `widthStart` to `widthEnd`.
 *
 * Walks up one side offsetting along the curve's normal, then back down the
 * other, giving a filled ribbon that tapers continuously.
 *
 * A ribbon rather than a stroke because a stroked path has exactly one width
 * for its whole length. Faking a taper by chopping every branch into separately
 * stroked pieces would multiply the path count several-fold and still look
 * stepped; this is one path per segment and genuinely continuous.
 *
 * The sample count adapts to length, so a long main stem stays smooth without a
 * short twig paying for points it is too small to show.
 */
export function taperedRibbon(
  p0: Point,
  c1: Point,
  c2: Point,
  p3: Point,
  widthStart: number,
  widthEnd: number,
): PathCommand[] {
  const samples = Math.min(14, Math.max(5, Math.round(cubicLength(p0, c1, c2, p3) / 4)));

  const near: Point[] = [];
  const far: Point[] = [];

  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const point = cubicPointAt(p0, c1, c2, p3, t);
    const angle = cubicAngleAt(p0, c1, c2, p3, t);

    // Direction is (sin θ, cos θ), so its normal is (cos θ, −sin θ).
    const nx = Math.cos(angle);
    const ny = -Math.sin(angle);
    const halfWidth = (widthStart + (widthEnd - widthStart) * t) / 2;

    near.push({ x: point.x + nx * halfWidth, y: point.y + ny * halfWidth });
    far.push({ x: point.x - nx * halfWidth, y: point.y - ny * halfWidth });
  }

  const start = near[0];

  // Unreachable — the loop always runs at least six times — but it keeps the
  // compiler satisfied under noUncheckedIndexedAccess without an assertion.
  if (start === undefined) return [];

  const commands: PathCommand[] = [moveTo(start.x, start.y)];

  for (let i = 1; i < near.length; i += 1) {
    const point = near[i];

    if (point !== undefined) commands.push(lineTo(point.x, point.y));
  }

  for (let i = far.length - 1; i >= 0; i -= 1) {
    const point = far[i];

    if (point !== undefined) commands.push(lineTo(point.x, point.y));
  }

  commands.push(closePath);

  return commands;
}
