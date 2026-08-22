import type { BeetleForm } from './types';

/**
 * The body plan, in beetle space.
 *
 * Every anatomy module reads these rather than recomputing proportions from the
 * form, so the pronotum cannot end where the elytra do not begin. It exists as
 * its own module because it is the one thing head, thorax, elytra, legs and
 * markings all need — putting it in `generate.ts` would make every part import
 * the composer that imports them.
 *
 * `y` runs from the front of the head (0) towards the rear; `x` from the
 * midline outwards. Half-widths, not widths: the generator only ever authors
 * the right side.
 */
export interface BeetleMetrics {
  /** Nose to elytral apex. Legs and antennae reach beyond this. */
  readonly length: number;
  readonly headLength: number;
  readonly headHalfWidth: number;
  readonly pronotumStart: number;
  readonly pronotumLength: number;
  readonly pronotumHalfWidth: number;
  readonly elytraStart: number;
  readonly elytraLength: number;
  readonly elytraHalfWidth: number;
  /** `y` of the rear tip. */
  readonly elytraApex: number;
}

/** Nominal body length at `bodyLength` 1, in beetle units. */
const BASE_LENGTH = 90;

export function metricsFor(form: BeetleForm): BeetleMetrics {
  const length = BASE_LENGTH * form.bodyLength;

  // The widest half-width the animal reaches, before each part scales its own.
  const bodyHalfWidth = length * 0.21 * form.bodyWidth;

  const headLength = length * 0.14;
  const pronotumLength = length * 0.2;
  // 0.46–0.66 of the body: a long-bodied longhorn against a squat ladybird.
  const elytraLength = length * 0.66 * (0.7 + 0.3 * form.elytraLength);

  const elytraHalfWidth = bodyHalfWidth * form.elytraWidth;
  const pronotumHalfWidth = elytraHalfWidth * form.pronotumWidth * 0.92;
  const headHalfWidth = pronotumHalfWidth * (0.45 + 0.3 * form.headWidth);

  const pronotumStart = headLength;
  const elytraStart = pronotumStart + pronotumLength;

  return {
    length,
    headLength,
    headHalfWidth,
    pronotumStart,
    pronotumLength,
    pronotumHalfWidth,
    elytraStart,
    elytraLength,
    elytraHalfWidth,
    elytraApex: elytraStart + elytraLength,
  };
}
