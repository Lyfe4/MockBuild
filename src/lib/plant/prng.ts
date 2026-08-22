/**
 * The PRNG moved to `@/lib/random` when the insect spike needed the same
 * seeded randomness. It is genuinely shared infrastructure — nothing about
 * mulberry32 or FNV-1a is botanical — so it no longer belongs under `plant`.
 *
 * This file stays as a re-export so every module in the plant generator keeps
 * importing `./prng` exactly as before. The sequence is byte-for-byte the same
 * code, so every illustration in the archive is unchanged; the determinism
 * tests would fail loudly if it were not.
 */
export { clamp, hashString, jitter, mulberry32, randomBetween } from '@/lib/random';
export type { Rng } from '@/lib/random';
