import { clamp, randomBetween, type Rng } from '@/lib/random';

/**
 * Sampling helpers for preset resolution.
 *
 * A preset describes the region of parameter space a kind of insect occupies —
 * ranges for the continuous characters, allowed sets for the categorical ones —
 * and the seed picks a point inside it. These are the three ways to pick.
 */

/** A closed interval a parameter may be sampled from. */
export type Range = readonly [min: number, max: number];

/** A value anywhere in the range. */
export function between(rng: Rng, [min, max]: Range): number {
  return randomBetween(rng, min, max);
}

/** A whole number in the range, inclusive of both ends. */
export function betweenInt(rng: Rng, [min, max]: Range): number {
  return clamp(Math.floor(randomBetween(rng, min, max + 1)), min, max);
}

/**
 * One member of a set.
 *
 * Returns the fallback for an empty set rather than throwing: a preset that
 * declares no choices for a trait should keep whatever its base form said.
 */
export function pick<T>(rng: Rng, options: readonly T[], fallback: T): T {
  if (options.length === 0) return fallback;

  const index = Math.min(options.length - 1, Math.floor(rng() * options.length));

  return options[index] ?? fallback;
}

/**
 * Applies a proportional wobble to a value that has no declared range.
 *
 * Presets name ranges only for the characters that define them; everything else
 * still needs to differ from specimen to specimen, or a sheet of one preset
 * renders as the same drawing repeated.
 */
export function wobble(rng: Rng, value: number, fraction: number): number {
  return value * (1 + randomBetween(rng, -fraction, fraction));
}
