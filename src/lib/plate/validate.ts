import { parsePathData, pathPoints, PathSyntaxError, type PlateSegment } from './pathData';
import {
  MEMBRANOUS_PART_IDS,
  REQUIRED_PARTS,
  type PlatePart,
  type PlatePartId,
  type SpeciesPlate,
} from './types';

/**
 * Checking a hand-authored plate.
 *
 * A generated drawing could not be malformed — the generator only knew how to
 * emit valid geometry. A hand-authored one can be malformed in a handful of
 * specific ways, all of them mistakes a person makes while typing coordinates
 * next to a reference image, and every one of them fails *quietly*: a stray
 * minus sign puts a leg on the wrong side and the mirror puts a second one on
 * top of it, so the plate renders, looks nearly right, and has five legs.
 *
 * So this is not a schema check. TypeScript already guarantees the shape. This
 * checks the four things the type system cannot see, and returns them all
 * rather than throwing on the first, because an author fixing a plate wants the
 * whole list.
 */

/** What kind of mistake a plate has. */
export const PLATE_ERROR_CODES = [
  /** The `d` string does not parse. */
  'path-syntax',
  /** A mirrored part reaches across the midline into the left half. */
  'negative-x',
  /** `clipTo` names a part the plate does not contain. */
  'missing-clip-target',
  /** A part is clipped to its own id, which would clip it to itself. */
  'self-clip',
  /** The order requires a part the plate does not have. */
  'missing-part',
  /** A midline part is not actually on the midline. */
  'midline-off-axis',
  /** The plate has no parts at all. */
  'empty-plate',
  /** A part that is not a wing declared itself membranous. */
  'solid-part-as-membrane',
] as const;

export type PlateErrorCode = (typeof PLATE_ERROR_CODES)[number];

/**
 * One problem with a plate.
 *
 * Structured rather than a string so a test can assert on the code without
 * matching wording, and so a lab sheet could group errors by part. `message` is
 * for a person; `code` is for everything else.
 */
export interface PlateError {
  readonly code: PlateErrorCode;
  readonly message: string;
  /** Index into `plate.parts`, absent for a problem with the plate as a whole. */
  readonly partIndex?: number;
  readonly partId?: PlatePartId;
}

/**
 * How far left of the midline a mirrored part may reach.
 *
 * Not zero. A part that meets the midline — the head's front margin, an
 * elytron's inner edge — is authored *at* x = 0, and its control points land a
 * hair either side of it once the curve is fitted by eye. Half a unit in a
 * thousand is below anything visible and well under the width of the finest
 * line, so it buys nothing to complain about and costs an author an afternoon.
 */
const MIDLINE_TOLERANCE = 0.5;

/**
 * How far off the axis a midline part's extremes may be from each other.
 *
 * A part declaring `mirror: false` is claiming to be symmetric in itself, and
 * the renderer takes it at its word — it draws it once, unreflected. If it is
 * in fact lopsided nothing catches it downstream, so it is checked here: the
 * part must reach about as far right as it does left.
 */
const SYMMETRY_TOLERANCE = 6;

/** A part reaching across the midline is only wrong if it is going to be mirrored. */
function isMirrored(part: PlatePart): boolean {
  return part.mirror !== false;
}

function error(
  code: PlateErrorCode,
  message: string,
  part?: { readonly index: number; readonly id: PlatePartId },
): PlateError {
  return {
    code,
    message,
    ...(part === undefined ? {} : { partIndex: part.index, partId: part.id }),
  };
}

/**
 * Everything wrong with a plate, or an empty array.
 *
 * Ordered by part, then by check, so the list reads down the plate in drawing
 * order. Plate-wide problems come last: a missing leg is worth knowing about
 * whichever of the paths that *are* there is broken.
 */
export function validatePlate(plate: SpeciesPlate): PlateError[] {
  const errors: PlateError[] = [];

  if (plate.parts.length === 0) {
    return [error('empty-plate', 'the plate has no parts')];
  }

  const present = new Set<PlatePartId>(plate.parts.map((part) => part.id));

  plate.parts.forEach((part, index) => {
    const where = { index, id: part.id };
    const label = `${part.id} (part ${String(index)})`;

    let segments: PlateSegment[];

    try {
      segments = parsePathData(part.d);
    } catch (cause) {
      const detail = cause instanceof PathSyntaxError ? cause.message : String(cause);

      errors.push(error('path-syntax', `${label}: ${detail}`, where));

      // Nothing further can be said about a path that did not parse.
      return;
    }

    const points = pathPoints(segments);

    if (isMirrored(part)) {
      // The author drew the right half. Anything left of the midline is a sign
      // change, and the mirror will duplicate it rather than correct it.
      const strayed = points.filter((point) => point.x < -MIDLINE_TOLERANCE);
      const worst = strayed.reduce(
        (lowest, point) => (point.x < lowest ? point.x : lowest),
        Infinity,
      );

      if (strayed.length > 0) {
        errors.push(
          error(
            'negative-x',
            `${label}: ${String(strayed.length)} point(s) left of the midline, reaching x = ${String(worst)}. Mirrored parts are authored on the right half only.`,
            where,
          ),
        );
      }
    } else {
      // A part that says it is on the axis has to be on the axis, because
      // nothing downstream reflects it into agreement.
      let minX = Infinity;
      let maxX = -Infinity;

      for (const point of points) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
      }

      if (Number.isFinite(minX) && Math.abs(maxX + minX) > SYMMETRY_TOLERANCE) {
        errors.push(
          error(
            'midline-off-axis',
            `${label}: declared a midline part but spans x = ${String(minX)} to ${String(maxX)}, which is not centred on the axis.`,
            where,
          ),
        );
      }
    }

    /*
     * A membrane is a window, and only a wing is one. Letting the flag through
     * on anything else would produce a see-through abdomen that reads as a
     * rendering bug rather than as the typo it is — and it would not show up at
     * all until the part happened to overlap something.
     */
    if (part.opacity === 'membrane' && !MEMBRANOUS_PART_IDS.includes(part.id)) {
      errors.push(
        error(
          'solid-part-as-membrane',
          `${label}: declared membrane, which only a wing may be (${MEMBRANOUS_PART_IDS.join(', ')})`,
          where,
        ),
      );
    }

    if (part.clipTo !== undefined) {
      if (part.clipTo === part.id) {
        errors.push(
          error('self-clip', `${label}: clipped to its own id, which clips nothing`, where),
        );
      } else if (!present.has(part.clipTo)) {
        errors.push(
          error(
            'missing-clip-target',
            `${label}: clipped to ${part.clipTo}, which the plate does not contain`,
            where,
          ),
        );
      }
    }
  });

  for (const required of REQUIRED_PARTS[plate.order]) {
    if (!present.has(required)) {
      errors.push(
        error('missing-part', `a ${plate.order} plate needs a ${required}, and this has none`),
      );
    }
  }

  return errors;
}

/** Whether a plate is fit to render. */
export function isValidPlate(plate: SpeciesPlate): boolean {
  return validatePlate(plate).length === 0;
}
