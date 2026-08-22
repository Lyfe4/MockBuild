import { describe, expect, it } from 'vitest';

import { clamp, hashString, jitter, mulberry32, randomBetween } from './prng';

describe('mulberry32', () => {
  it('replays the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);

    const first = Array.from({ length: 20 }, () => a());
    const second = Array.from({ length: 20 }, () => b());

    expect(first).toStrictEqual(second);
  });

  it('produces a different sequence for a different seed', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);

    expect(a()).not.toBe(b());
  });

  it('stays within [0, 1)', () => {
    const rng = mulberry32(7);

    for (let i = 0; i < 1000; i += 1) {
      const value = rng();

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('does not immediately repeat itself', () => {
    const rng = mulberry32(123);
    const values = new Set(Array.from({ length: 500 }, () => rng()));

    expect(values.size).toBe(500);
  });

  it('spreads roughly evenly across the unit interval', () => {
    // Not a statistical proof — just enough to catch a generator that has
    // collapsed to a narrow band or a constant.
    const rng = mulberry32(2024);
    const buckets = new Array<number>(10).fill(0);

    for (let i = 0; i < 10000; i += 1) {
      const index = Math.min(9, Math.floor(rng() * 10));
      buckets[index] = (buckets[index] ?? 0) + 1;
    }

    for (const count of buckets) {
      expect(count).toBeGreaterThan(700);
      expect(count).toBeLessThan(1300);
    }
  });

  it('tolerates seeds that are not unsigned 32-bit integers', () => {
    for (const seed of [-1, 0, 3.7, Number.NaN, 2 ** 40]) {
      const value = mulberry32(seed)();

      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('hashString', () => {
  it('is stable across calls', () => {
    expect(hashString('TBA-0042')).toBe(hashString('TBA-0042'));
  });

  it('distinguishes strings sharing a long prefix', () => {
    const ids = ['TBA-0001', 'TBA-0002', 'TBA-0010', 'TBA-0100', 'TBA-1000'];
    const hashes = ids.map(hashString);

    expect(new Set(hashes).size).toBe(ids.length);
  });

  it('distinguishes anagrams, which a summing hash would not', () => {
    expect(hashString('TBA-0042')).not.toBe(hashString('TBA-0240'));
    expect(hashString('abc')).not.toBe(hashString('cba'));
  });

  it('returns an unsigned 32-bit integer, including for the empty string', () => {
    for (const value of ['', 'a', 'TBA-9999', 'a much longer string than any id']) {
      const hash = hashString(value);

      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThan(2 ** 32);
    }
  });
});

describe('randomBetween', () => {
  it('stays within the requested bounds', () => {
    const rng = mulberry32(5);

    for (let i = 0; i < 500; i += 1) {
      const value = randomBetween(rng, -3, 7);

      expect(value).toBeGreaterThanOrEqual(-3);
      expect(value).toBeLessThan(7);
    }
  });
});

describe('jitter', () => {
  it('returns a multiplier within plus or minus the given fraction', () => {
    const rng = mulberry32(11);

    for (let i = 0; i < 500; i += 1) {
      const value = jitter(rng, 0.35);

      expect(value).toBeGreaterThanOrEqual(0.65);
      expect(value).toBeLessThanOrEqual(1.35);
    }
  });

  it('is the identity at zero jitter', () => {
    expect(jitter(mulberry32(1), 0)).toBe(1);
  });
});

describe('clamp', () => {
  it.each([
    [5, 0, 10, 5],
    [-1, 0, 10, 0],
    [11, 0, 10, 10],
    [0, 0, 10, 0],
    [10, 0, 10, 10],
  ])('clamps %s into [%s, %s] as %s', (value, min, max, expected) => {
    expect(clamp(value, min, max)).toBe(expected);
  });

  it('resolves NaN to the minimum rather than propagating it', () => {
    // A NaN leaking into the geometry would turn a whole path into "NaN NaN"
    // and silently blank the illustration, so it is pinned to a usable value.
    expect(clamp(Number.NaN, 2, 8)).toBe(2);
  });
});
