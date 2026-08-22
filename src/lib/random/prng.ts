/**
 * Deterministic pseudo-randomness.
 *
 * `Math.random()` would make every re-render draw a different plant and every
 * test unassertable. Everything random in the generator comes from here, seeded
 * from the specimen's catalogue number, so a given specimen is always drawn
 * identically — across reloads, across machines, and in CI.
 */

/**
 * A seeded random source. Returns a float in `[0, 1)`, like `Math.random`.
 *
 * Stateful by design: each call advances the sequence.
 */
export type Rng = () => number;

/**
 * mulberry32 — a 32-bit generator that is small, fast and good enough for
 * scattering leaves.
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
 * "TBA-0042" and "TBA-0024" must not draw the same plant.
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
