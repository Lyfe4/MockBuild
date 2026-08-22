import type { PathCommand, Point } from './types';

/**
 * Path helpers shared by every insect order.
 *
 * Deliberately separate from the plant generator's equivalents. The two
 * diverge — mirroring here, tapered ribbons there — and would only accumulate
 * flags if merged. The PRNG is shared because it is neither botanical nor
 * entomological; path building is not so neutral.
 */

/** Rounds to 2dp. Keeps output small and comparisons stable across platforms. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function moveTo(x: number, y: number): PathCommand {
  return { c: 'M', x: round(x), y: round(y) };
}

export function lineTo(x: number, y: number): PathCommand {
  return { c: 'L', x: round(x), y: round(y) };
}

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

export function quadTo(control: Point, end: Point): PathCommand {
  return { c: 'Q', x1: round(control.x), y1: round(control.y), x: round(end.x), y: round(end.y) };
}

export const closePath: PathCommand = { c: 'Z' };

/** Serialises commands into an SVG `d` attribute. */
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

/** Every anchor and control point, for bounds and for the symmetry check. */
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

/** Applies a point transform to every coordinate, control points included. */
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

/**
 * Reflects across the midline.
 *
 * The whole of the generator's symmetry rests on this one line: parts are
 * authored on the right and this produces their counterpart.
 */
export function mirrorPoint(point: Point): Point {
  return { x: -point.x, y: point.y };
}

/** Reflects a whole path across the midline. */
export function mirrorCommands(commands: readonly PathCommand[]): PathCommand[] {
  return mapCommands(commands, mirrorPoint);
}

/**
 * Builds a closed outline that is symmetric about the midline, from half of it.
 *
 * Takes the right-hand profile from nose to tail and walks back up its
 * reflection, so parts that straddle the centre — head capsule, pronotum, horn
 * — are authored once and cannot come out lopsided.
 *
 * @param profile Points with `x >= 0`, ordered front to back.
 */
export function symmetricOutline(profile: readonly Point[]): PathCommand[] {
  const first = profile[0];
  const last = profile[profile.length - 1];

  if (first === undefined || last === undefined) return [];

  const commands: PathCommand[] = [moveTo(first.x, first.y)];

  // Down the right side.
  for (let i = 1; i < profile.length; i += 1) {
    const point = profile[i];

    if (point !== undefined) commands.push(lineTo(point.x, point.y));
  }

  // Back up the left, skipping the endpoints: both sit on the midline, and
  // repeating them would leave a zero-length segment at each end.
  for (let i = profile.length - 2; i >= 1; i -= 1) {
    const point = profile[i];

    if (point !== undefined) commands.push(lineTo(-point.x, point.y));
  }

  commands.push(closePath);

  return commands;
}

/**
 * Samples a smooth closed profile through the given points.
 *
 * Straight segments between sampled points would show as facets on a shape as
 * large as an elytron, so the outline is built from quadratics through the
 * midpoints — a Catmull-Rom-ish smoothing that needs no tangent bookkeeping.
 */
export function smoothClosedPath(points: readonly Point[]): PathCommand[] {
  if (points.length < 3) return [];

  const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  const first = points[0];
  const last = points[points.length - 1];

  if (first === undefined || last === undefined) return [];

  const start = midpoint(last, first);
  const commands: PathCommand[] = [moveTo(start.x, start.y)];

  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];

    if (current === undefined || next === undefined) continue;

    commands.push(quadTo(current, midpoint(current, next)));
  }

  commands.push(closePath);

  return commands;
}
