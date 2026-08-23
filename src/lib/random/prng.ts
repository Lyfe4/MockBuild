/**
 * Deterministic pseudo-randomness.
 *
 * Written for the procedural generators, which are gone: `Math.random()` would
 * have made every re-render draw a different animal and every test
 * unassertable, so everything random came from here, seeded from the
 * specimen's catalogue number.
 *
 * **Nothing calls this any more.** Hand-authored plates have no random element
 * — that is rather the point of them. It is kept because a correct, tested
 * seeded PRNG is worth more than the twenty lines it costs, and because
 * anything that later wants reproducible variation should use this rather than
 * write a third one. If nothing has picked it up by the next sweep, delete it.
 */

/**
 * A seeded random source. Returns a float in `[0, 1)`, like `Math.random`.
 *
 * Stateful by design: each call advances the sequence.
 */
export type Rng = () => number;

/**
 * mulberry32 — a 32-bit generator that is small, fast and good enough for
 * scattering marks.
 *
 * Not cryptographically secure and not trying to be; it has a 2^32 period and
 * passes gjrand's basic tests, which is the right trade for something that runs
 * a few hundred times per illustration.
 *
 * @param seed Any 32-bit integer. Fractional or out-of-range values are coerced.
 */
export function mulberry32(seed: number): Rng {
  // `>>> 0` coerces to an unsigned 32-bit int, so NaN and negatives are total.
  let state = seed >>> 0;

  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;

    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * FNV-1a, 32-bit. Turns a catalogue number into a seed.
 *
 * Chosen over summing char codes because that collides constantly on strings
 * that share characters — and every id here starts with the same four.
 * "TEA-0042" and "TEA-0024" must not draw the same animal.
 *
 * @returns An unsigned 32-bit integer.
 */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < value.length; i += 1) {
    // charCodeAt is safe for every index below length; the non-null assertion
    // that noUncheckedIndexedAccess would otherwise demand is avoided by using
    // the method rather than indexing.
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

/** A float in `[min, max)`. */
export function randomBetween(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/**
 * A multiplier in `[1 - amount, 1 + amount)`, for nudging a value off its
 * nominal without changing its order of magnitude.
 *
 * @param amount Jitter fraction, e.g. `0.35` for ±35%.
 */
export function jitter(rng: Rng, amount: number): number {
  return 1 + (rng() * 2 - 1) * amount;
}

/** Restricts `value` to `[min, max]`. NaN clamps to `min`. */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;

  return Math.min(Math.max(value, min), max);
}
