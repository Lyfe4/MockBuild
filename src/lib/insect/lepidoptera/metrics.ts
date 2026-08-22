import type { Point } from '../core';
import type { MothForm } from './types';
import type { WingPlacement } from './wings';

/**
 * The body plan, in moth space.
 *
 * `y` runs from the front of the head towards the rear; `x` from the midline
 * outwards. As with the beetles, every module reads these rather than
 * recomputing proportions, so the wings cannot attach where the thorax is not.
 */
export interface MothMetrics {
  readonly headLength: number;
  readonly headHalfWidth: number;
  readonly thoraxStart: number;
  readonly thoraxLength: number;
  readonly thoraxHalfWidth: number;
  readonly abdomenStart: number;
  readonly abdomenLength: number;
  readonly abdomenHalfWidth: number;
  readonly bodyEnd: number;
  readonly forewing: WingPlacement;
  readonly hindwing: WingPlacement;
}

/** Nominal body length at `bodyLength` 1, in moth units. */
const BASE_BODY = 58;

export function metricsFor(form: MothForm): MothMetrics {
  const bodyLength = BASE_BODY * form.bodyLength;

  const headLength = bodyLength * 0.15;
  const thoraxLength = bodyLength * 0.3;
  const abdomenLength = bodyLength * 0.55;

  const thoraxHalfWidth = bodyLength * 0.115 * form.bodyThickness;
  const headHalfWidth = thoraxHalfWidth * 0.72;
  const abdomenHalfWidth = thoraxHalfWidth * 0.82;

  const thoraxStart = headLength;
  const abdomenStart = thoraxStart + thoraxLength;

  /**
   * Wing length is set against the *body* rather than the view box, so a
   * long-bodied hawkmoth and a stubby geometrid keep their proportions when the
   * fit normalises them. Forewings sweep slightly forward and hindwings back,
   * which is how a specimen is set on the board.
   */
  const forewingLength = bodyLength * 1.15 * form.wingSpan;

  return {
    headLength,
    headHalfWidth,
    thoraxStart,
    thoraxLength,
    thoraxHalfWidth,
    abdomenStart,
    abdomenLength,
    abdomenHalfWidth,
    bodyEnd: abdomenStart + abdomenLength,
    forewing: {
      base: { x: thoraxHalfWidth * 0.7, y: thoraxStart + thoraxLength * 0.25 },
      // Radians clockwise from +x; negative sweeps towards the head.
      angle: -0.34,
      length: forewingLength,
      chord: forewingLength * form.wingAspect,
    },
    hindwing: {
      base: { x: thoraxHalfWidth * 0.68, y: thoraxStart + thoraxLength * 0.82 },
      angle: 0.42,
      length: forewingLength * form.hindwingScale,
      chord: forewingLength * form.hindwingScale * form.wingAspect,
    },
  } satisfies MothMetrics & { forewing: { base: Point } };
}
