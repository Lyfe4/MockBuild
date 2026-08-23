/**
 * What an author writes: the landmark file.
 *
 * One JSON file per species, under `src/data/species/landmarks/`, holding the
 * points measured off the reference and the roles they play. `npm run
 * plate:build` turns it into the `*.plate.ts` beside the record, and
 * `npm run plate:verify` proves the committed file is still what the landmarks
 * say. The plate file is generated; the landmark file is the source.
 *
 * ## Why JSON and not TypeScript
 *
 * Because it is measurements. A landmark file has no logic in it, and the one
 * thing it must never acquire is a helper that computes a coordinate from
 * another coordinate — the moment it does, the file stops being a record of
 * what was measured and starts being a second drawing program. JSON cannot hold
 * a function, which is the point.
 *
 * The trade is that JSON cannot hold a comment either, so the prose that used
 * to live in the plate file lives in `doc` and in each part's `note`, and the
 * emitter puts it back as comments. Losing those on the first build would have
 * thrown away most of what makes the plates readable.
 *
 * ## Plate space
 *
 * Unchanged, and `src/lib/plate/types.ts` is still where it is explained:
 * midline at x = 0, y = 0 at the head end, y = 1000 at the tip of the abdomen,
 * right half only. Landmarks are measured in those units, so a species is
 * measured against the others rather than against its own photograph.
 */

import { capsule, curve, ellipse, fan, strip, type Point } from './geometry.ts';

/** A measured point, `[x, y]`. Terser than `{ "x": .., "y": .. }` a thousand times over. */
export type LandmarkPoint = readonly [number, number];

/** A smooth curve through every landmark. The workhorse: any traced margin. */
export interface CurveShape {
  readonly kind: 'curve';
  readonly points: readonly LandmarkPoint[];
  /** Closed outlines only. An antenna or a vein is open, which is the default. */
  readonly closed?: boolean;
  /** Lower it where a curve overshoots between two far-apart landmarks. */
  readonly tension?: number;
}

/** A limb: the spine an author can measure, plus how thick it is. */
export interface CapsuleShape {
  readonly kind: 'capsule';
  readonly spine: readonly LandmarkPoint[];
  readonly width: number | readonly number[];
  readonly tension?: number;
}

/** An eye, a spot, a fleck. */
export interface EllipseShape {
  readonly kind: 'ellipse';
  readonly at: LandmarkPoint;
  readonly radii: readonly [number, number];
  readonly rotate?: number;
}

/** A band following an edge: a marginal border, a costal wash. */
export interface StripShape {
  readonly kind: 'strip';
  readonly edge: readonly LandmarkPoint[];
  readonly depth: number | readonly number[];
  readonly tension?: number;
}

/** A run of strokes between two guides: hatching, striae, veins. */
export interface FanShape {
  readonly kind: 'fan';
  readonly from: readonly LandmarkPoint[];
  readonly to: readonly LandmarkPoint[];
  readonly count: number;
  readonly tension?: number;
}

export type Shape = CurveShape | CapsuleShape | EllipseShape | StripShape | FanShape;

/**
 * One entry in the landmark file.
 *
 * Mostly one part of the plate — except a `fan`, which is one measurement and
 * many strokes, and expands into as many parts as it has strokes. The role
 * fields (`id`, `rank`, `fill`, `clipTo`, `mirror`, `opacity`) are copied
 * verbatim onto each part the entry produces and mean exactly what
 * `src/lib/plate/types.ts` says they mean.
 */
export interface LandmarkPart {
  readonly id: string;
  readonly rank: 'outline' | 'structure' | 'detail';
  readonly fill: 'none' | 'surface' | 'pigment' | 'pigment-deep' | 'ink';
  readonly shape: Shape;
  /** `false` for a part that straddles the midline and is drawn once. */
  readonly mirror?: false;
  readonly opacity?: 'solid' | 'membrane';
  readonly clipTo?: string;
  /** Comment lines the emitter writes above this part. */
  readonly note?: readonly string[];
}

export interface LandmarkReference {
  readonly title: string;
  readonly artist: string;
  readonly year: number;
  /** Comment lines above the year, for a date that needed working out. */
  readonly yearNote?: readonly string[];
  readonly source: string;
  readonly licence: string;
}

/** One landmark file. */
export interface LandmarkPlate {
  /** The slug of the `Species` record, and the name of this file. */
  readonly species: string;
  /** The exported constant, e.g. `LUCANUS_CERVUS_PLATE`. */
  readonly constant: string;
  readonly order: string;
  readonly sex: 'male' | 'female' | 'unsexed';
  readonly hallmark?: string;
  readonly reference: LandmarkReference;
  /** The file's doc comment, one string per line. */
  readonly doc: readonly string[];
  readonly parts: readonly LandmarkPart[];
}

export const asPoint = ([x, y]: LandmarkPoint): Point => ({ x, y });
export const asPoints = (points: readonly LandmarkPoint[]): Point[] => points.map(asPoint);

const RANKS = new Set(['outline', 'structure', 'detail']);
const FILLS = new Set(['none', 'surface', 'pigment', 'pigment-deep', 'ink']);
const SEXES = new Set(['male', 'female', 'unsexed']);
const KINDS = new Set(['curve', 'capsule', 'ellipse', 'strip', 'fan']);

function isPoint(value: unknown): value is LandmarkPoint {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

/**
 * The landmark file, checked before anything is drawn from it.
 *
 * Not a substitute for `validatePlate` — that checks the *drawing*, and still
 * runs in every plate's test. This checks the *file*, and exists because a
 * typo in JSON is silent: a missing `kind` builds a plate with one part fewer
 * and nothing says so, and a point written `[120]` becomes a coordinate of
 * `undefined` that surfaces four steps later as `NaN` in a path.
 */
export function validateLandmarks(value: unknown, file: string): LandmarkPlate {
  const problems: string[] = [];
  const plate = value as Partial<LandmarkPlate>;
  const need = (ok: boolean, message: string): void => {
    if (!ok) problems.push(message);
  };

  need(typeof plate.species === 'string' && plate.species !== '', 'species must be a slug');
  need(
    typeof plate.constant === 'string' && /^[A-Z0-9_]+$/.test(plate.constant),
    'constant must be SCREAMING_SNAKE',
  );
  need(typeof plate.order === 'string' && plate.order !== '', 'order must be a plate order');
  need(
    typeof plate.sex === 'string' && SEXES.has(plate.sex),
    'sex must be male, female or unsexed',
  );
  need(Array.isArray(plate.doc) && plate.doc.length > 0, 'doc must carry at least one line');
  need(typeof plate.reference?.artist === 'string', 'reference.artist is required');
  need(typeof plate.reference?.title === 'string', 'reference.title is required');
  need(typeof plate.reference?.year === 'number', 'reference.year is required');
  need(typeof plate.reference?.source === 'string', 'reference.source is required');
  need(typeof plate.reference?.licence === 'string', 'reference.licence is required');
  need(Array.isArray(plate.parts) && plate.parts.length > 0, 'parts must not be empty');

  // Read through an untyped view from here down. The declared types describe
  // what a *valid* file holds, and checking a field against the type it is
  // asserted to have proves nothing — `part.mirror === false` is trivially true
  // when `part.mirror` is typed `false | undefined`, and the compiler says so.
  // The whole point is that this input has not been checked yet.
  const loose = (Array.isArray(plate.parts) ? plate.parts : []) as readonly Record<
    string,
    unknown
  >[];

  for (const [index, part] of loose.entries()) {
    const at = `parts[${String(index)}]`;

    need(typeof part.id === 'string' && part.id !== '', `${at}.id is required`);
    need(RANKS.has(String(part.rank)), `${at}.rank must be outline, structure or detail`);
    need(FILLS.has(String(part.fill)), `${at}.fill is not a plate fill`);
    need(part.mirror === undefined || part.mirror === false, `${at}.mirror may only be false`);
    need(
      part.clipTo === undefined || typeof part.clipTo === 'string',
      `${at}.clipTo must be a part id`,
    );
    need(
      part.opacity === undefined || part.opacity === 'solid' || part.opacity === 'membrane',
      `${at}.opacity must be solid or membrane`,
    );

    const shape = part.shape as Record<string, unknown> | undefined;

    if (shape === undefined || !KINDS.has(String(shape.kind))) {
      problems.push(`${at}.shape.kind is missing or unknown`);
      continue;
    }

    const points = (name: string, list: unknown, least: number): void => {
      if (!Array.isArray(list) || list.length < least) {
        problems.push(`${at}.shape.${name} needs at least ${String(least)} points`);

        return;
      }

      for (const [i, point] of list.entries()) {
        if (!isPoint(point))
          problems.push(`${at}.shape.${name}[${String(i)}] is not an [x, y] pair`);
      }
    };

    if (shape.kind === 'curve') points('points', shape.points, 2);
    if (shape.kind === 'capsule') {
      points('spine', shape.spine, 2);
      need(
        typeof shape.width === 'number' || Array.isArray(shape.width),
        `${at}.shape.width must be a number or a list`,
      );
    }
    if (shape.kind === 'ellipse') {
      need(isPoint(shape.at), `${at}.shape.at is not an [x, y] pair`);
      need(
        Array.isArray(shape.radii) &&
          shape.radii.length === 2 &&
          shape.radii.every((r: unknown) => typeof r === 'number'),
        `${at}.shape.radii must be [rx, ry]`,
      );
    }
    if (shape.kind === 'strip') {
      points('edge', shape.edge, 2);
      need(
        typeof shape.depth === 'number' || Array.isArray(shape.depth),
        `${at}.shape.depth must be a number or a list`,
      );
    }
    if (shape.kind === 'fan') {
      points('from', shape.from, 2);
      points('to', shape.to, 2);
      need(
        Array.isArray(shape.from) &&
          Array.isArray(shape.to) &&
          shape.from.length === shape.to.length,
        `${at}.shape guides must have the same number of points`,
      );
      need(
        typeof shape.count === 'number' && shape.count >= 2,
        `${at}.shape.count must be 2 or more`,
      );

      // A fan on the midline is nearly always a mistake, and an expensive one:
      // `mirror: false` says *every part this entry draws* straddles the axis,
      // and a fan draws one part per stroke. Guides running from one side of the
      // animal to the other therefore declare a row of strokes, each sitting
      // off-axis, and `validatePlate` reports every one of them as
      // `midline-off-axis`. It is legal only where both guides are themselves
      // centred — a run of strokes that each cross the axis, like the rings
      // across an abdomen.
      if (part.mirror === false) {
        const centred = (guide: unknown): boolean => {
          if (!Array.isArray(guide)) return false;

          const xs = guide.flatMap((point: unknown) => (isPoint(point) ? [point[0]] : []));

          return xs.length > 0 && Math.abs(Math.max(...xs) + Math.min(...xs)) < 0.01;
        };

        need(
          centred(shape.from) && centred(shape.to),
          `${at} is a fan on the midline, but its guides are not centred on it. ` +
            'Author it on the right half and let the renderer reflect it, or give both ' +
            'guides strokes that cross the axis.',
        );
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`${file} is not a valid landmark file:\n  ${problems.join('\n  ')}`);
  }

  return plate as LandmarkPlate;
}

/**
 * Every path an entry draws. One for most shapes; a fan draws many.
 *
 * `symmetric` says the part is half of a bilaterally symmetric drawing, which
 * is every part that does not declare `mirror: false`. It reaches the curve
 * maths so that a landmark on the midline gets a vertical tangent; see
 * `CurveOptions.symmetric`.
 */
export function drawShape(shape: Shape, symmetric: boolean): string[] {
  switch (shape.kind) {
    case 'curve':
      return [
        curve(asPoints(shape.points), {
          closed: shape.closed ?? false,
          symmetric,
          ...(shape.tension === undefined ? {} : { tension: shape.tension }),
        }),
      ];
    case 'capsule':
      return [
        capsule(asPoints(shape.spine), {
          width: shape.width,
          symmetric,
          ...(shape.tension === undefined ? {} : { tension: shape.tension }),
        }),
      ];
    case 'ellipse':
      return [ellipse(asPoint(shape.at), shape.radii[0], shape.radii[1], shape.rotate ?? 0)];
    case 'strip':
      return [
        strip(asPoints(shape.edge), {
          depth: shape.depth,
          symmetric,
          ...(shape.tension === undefined ? {} : { tension: shape.tension }),
        }),
      ];
    case 'fan':
      return fan(asPoints(shape.from), asPoints(shape.to), {
        count: shape.count,
        symmetric,
        ...(shape.tension === undefined ? {} : { tension: shape.tension }),
      });
  }
}
