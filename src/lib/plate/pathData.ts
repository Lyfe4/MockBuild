/**
 * Reading and writing plate path data.
 *
 * A plate stores its geometry as SVG `d` strings rather than as structured
 * commands, which is the one place the plate schema differs from the generator
 * and it is a deliberate trade. A generator emits geometry, so structure is
 * free; an author *writes* geometry, and writing `M 140 7 C 156 43 174 72 …` is
 * something a person can do in a text editor while looking at a reference,
 * where an array of command objects is not.
 *
 * The cost is that the strings have to be parsed to be checked, mirrored or
 * measured — hence this file. Nothing here draws: it turns text into numbers
 * and back, and everything that needs to reason about a path goes through it.
 *
 * ## What is supported
 *
 * `M`, `L`, `C`, `Z` and their relative forms. No arcs, no quadratics, no
 * shorthand `S`/`T`, no `H`/`V`. An engraved curve is a cubic; three ways to
 * write the same curve would be three ways to get mirroring subtly wrong, and
 * a parser that accepts only what the plates use is a parser whose failures are
 * all real.
 *
 * Relative commands are accepted on input and resolved to absolute immediately,
 * because a coordinate that is only meaningful relative to the previous one
 * cannot be checked against the midline.
 */

/** A point in plate space. */
export interface PlatePoint {
  readonly x: number;
  readonly y: number;
}

/** One absolute path command. */
export type PlateSegment =
  | { readonly c: 'M'; readonly x: number; readonly y: number }
  | { readonly c: 'L'; readonly x: number; readonly y: number }
  | {
      readonly c: 'C';
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
      readonly x: number;
      readonly y: number;
    }
  | { readonly c: 'Z' };

/**
 * A `d` string that does not parse.
 *
 * A named class rather than a plain `Error` so `validatePlate` can tell a
 * syntax failure apart from a bug in its own code and report it against the
 * part it came from.
 */
export class PathSyntaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathSyntaxError';
  }
}

/** How many numbers each command consumes per repetition. */
const ARITY = { M: 2, L: 2, C: 6, Z: 0 } as const;

type Verb = keyof typeof ARITY;

function isVerb(letter: string): letter is Verb {
  return letter === 'M' || letter === 'L' || letter === 'C' || letter === 'Z';
}

/**
 * Splits a `d` string into command letters and numbers.
 *
 * Written as an explicit scan rather than a `split` on whitespace because SVG
 * path data does not require any: `M0 0C1 1 2 2 3 3` is legal, and so is
 * `M0,0L1-1` — a minus sign separates numbers all by itself. A naive split
 * accepts the spaced form and silently mangles the compact one, which is the
 * kind of bug that shows up as one limb in the wrong place.
 */
function tokenise(d: string): string[] {
  const tokens: string[] = [];
  let index = 0;

  while (index < d.length) {
    const char = d[index] ?? '';

    if (char === ' ' || char === ',' || char === '\n' || char === '\r' || char === '\t') {
      index += 1;
      continue;
    }

    if (/[A-Za-z]/.test(char)) {
      tokens.push(char);
      index += 1;
      continue;
    }

    // A number: optional sign, digits, optional fraction, optional exponent.
    const rest = d.slice(index);
    const match = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(rest);

    if (match === null) {
      throw new PathSyntaxError(`unexpected character ${JSON.stringify(char)} at ${String(index)}`);
    }

    tokens.push(match[0]);
    index += match[0].length;
  }

  return tokens;
}

/** Rounds to 2dp, which is finer than a plate is drawn and keeps output short. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Parses plate path data into absolute commands.
 *
 * @throws PathSyntaxError on an unknown command, a missing or non-numeric
 *   argument, or a path that does not begin with a move.
 */
export function parsePathData(d: string): PlateSegment[] {
  const tokens = tokenise(d);

  if (tokens.length === 0) throw new PathSyntaxError('empty path data');

  const segments: PlateSegment[] = [];

  // The pen, for resolving relative commands, and the last `M`, for `Z`.
  let cursor: PlatePoint = { x: 0, y: 0 };
  let subpathStart: PlatePoint = { x: 0, y: 0 };
  let verb: Verb | undefined;
  let relative = false;
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index] ?? '';

    if (/[A-Za-z]/.test(token)) {
      const upper = token.toUpperCase();

      if (!isVerb(upper)) {
        throw new PathSyntaxError(
          `unsupported command ${JSON.stringify(token)} — plates use M, L, C and Z only`,
        );
      }

      verb = upper;
      relative = token !== upper;
      index += 1;
    } else if (verb === undefined) {
      throw new PathSyntaxError('path data must begin with a command');
    } else if (verb === 'M') {
      // A repeated coordinate pair after `M` is an implicit `L`, per the spec.
      verb = 'L';
      continue;
    } else if (verb === 'Z') {
      // `Z` takes no arguments, so a number here can never be consumed. Left
      // to fall through it would push a close, advance nothing, and loop for
      // ever; this is the one parser error that would hang rather than fail.
      throw new PathSyntaxError(`Z takes no arguments, found ${JSON.stringify(token)}`);
    }

    if (segments.length === 0 && verb !== 'M') {
      throw new PathSyntaxError(`path data must begin with a move, not ${verb}`);
    }

    const arity = ARITY[verb];
    const numbers: number[] = [];

    for (let i = 0; i < arity; i += 1) {
      const raw = tokens[index + i];

      if (raw === undefined || /[A-Za-z]/.test(raw)) {
        throw new PathSyntaxError(
          `${verb} needs ${String(arity)} numbers, found ${String(i)} before the end of the path`,
        );
      }

      const value = Number(raw);

      if (!Number.isFinite(value)) {
        throw new PathSyntaxError(`${verb} given a non-numeric argument ${JSON.stringify(raw)}`);
      }

      numbers.push(value);
    }

    index += arity;

    // Relative offsets are resolved here and never stored: a coordinate that
    // only means something next to its neighbour cannot be checked or mirrored.
    const dx = relative ? cursor.x : 0;
    const dy = relative ? cursor.y : 0;

    switch (verb) {
      case 'M': {
        const x = round((numbers[0] ?? 0) + dx);
        const y = round((numbers[1] ?? 0) + dy);

        segments.push({ c: 'M', x, y });
        cursor = { x, y };
        subpathStart = cursor;
        break;
      }
      case 'L': {
        const x = round((numbers[0] ?? 0) + dx);
        const y = round((numbers[1] ?? 0) + dy);

        segments.push({ c: 'L', x, y });
        cursor = { x, y };
        break;
      }
      case 'C': {
        const x1 = round((numbers[0] ?? 0) + dx);
        const y1 = round((numbers[1] ?? 0) + dy);
        const x2 = round((numbers[2] ?? 0) + dx);
        const y2 = round((numbers[3] ?? 0) + dy);
        const x = round((numbers[4] ?? 0) + dx);
        const y = round((numbers[5] ?? 0) + dy);

        segments.push({ c: 'C', x1, y1, x2, y2, x, y });
        cursor = { x, y };
        break;
      }
      case 'Z': {
        segments.push({ c: 'Z' });
        cursor = subpathStart;
        break;
      }
    }
  }

  return segments;
}

/**
 * Serialises absolute commands back to a `d` string.
 *
 * One canonical form — command letter, arguments separated by single spaces —
 * so `formatPathData(parsePathData(d))` normalises any accepted spelling of a
 * path, and round-tripping the structured form is an identity. The plate tests
 * lean on both.
 */
export function formatPathData(segments: readonly PlateSegment[]): string {
  return segments
    .map((segment) => {
      switch (segment.c) {
        case 'M':
          return `M${String(segment.x)} ${String(segment.y)}`;
        case 'L':
          return `L${String(segment.x)} ${String(segment.y)}`;
        case 'C':
          return `C${String(segment.x1)} ${String(segment.y1)} ${String(segment.x2)} ${String(segment.y2)} ${String(segment.x)} ${String(segment.y)}`;
        case 'Z':
          return 'Z';
      }
    })
    .join(' ');
}

/**
 * Every anchor and control point of a path.
 *
 * Control points included, which overstates a curve's extent slightly — a cubic
 * stays inside the hull of its four points and usually well inside it. That is
 * the right way to be wrong for both callers: the midline check errs towards
 * complaining about a control point that has strayed left of the axis, and the
 * bounds err towards a frame a shade too generous.
 */
export function pathPoints(segments: readonly PlateSegment[]): PlatePoint[] {
  const points: PlatePoint[] = [];

  for (const segment of segments) {
    switch (segment.c) {
      case 'M':
      case 'L':
        points.push({ x: segment.x, y: segment.y });
        break;
      case 'C':
        points.push(
          { x: segment.x1, y: segment.y1 },
          { x: segment.x2, y: segment.y2 },
          { x: segment.x, y: segment.y },
        );
        break;
      case 'Z':
        break;
    }
  }

  return points;
}

export interface PlateBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** The extent of a set of points, or `undefined` if there are none. */
export function boundsOf(points: readonly PlatePoint[]): PlateBounds | undefined {
  const first = points[0];

  if (first === undefined) return undefined;

  let minX = first.x;
  let minY = first.y;
  let maxX = first.x;
  let maxY = first.y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, maxX, maxY };
}
