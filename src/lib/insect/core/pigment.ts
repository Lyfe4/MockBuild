import { clamp, type Rng } from '@/lib/random';

import { pick } from './choose';
import { PIGMENTS, type Pigment } from './types';

/**
 * Choosing and coercing a specimen's pigment.
 *
 * Separate from `choose.ts` because only one of these is sampling: the other is
 * the boundary check every form passes through, and both orders need it.
 */

/** Pulls any number onto a valid pigment index. Out of range clamps; NaN is 1. */
export function normalisePigment(value: number): Pigment {
  const index = clamp(Math.round(value), 1, PIGMENTS.length);

  return (PIGMENTS[index - 1] ?? 1) satisfies Pigment;
}

/**
 * One pigment out of the set a preset allows.
 *
 * A preset names the earths its kind is actually found in — a ladybird is not
 * slate — and the seed picks inside that. An empty set keeps the base, on the
 * same rule as every other categorical trait.
 */
export function pickPigment(rng: Rng, allowed: readonly Pigment[], fallback: Pigment): Pigment {
  return pick(rng, allowed, fallback);
}
