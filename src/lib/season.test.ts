import { describe, expect, it } from 'vitest';

import { seasonFromDate } from '@/lib/season';
import { SEASONS, type Season } from '@/types';

/**
 * Dates are constructed with the `(year, monthIndex, day)` constructor rather
 * than an ISO string. An ISO date-only string parses as UTC, which would land
 * in the previous month for anyone west of Greenwich and make these assertions
 * depend on where the test runs. The numeric constructor is local-time, which
 * is the same clock `seasonFromDate` reads.
 */
const dateIn = (monthIndex: number, day = 15): Date => new Date(2025, monthIndex, day);

describe('seasonFromDate', () => {
  it.each([
    ['September', 8, 'spring'],
    ['October', 9, 'spring'],
    ['November', 10, 'spring'],
    ['December', 11, 'summer'],
    ['January', 0, 'summer'],
    ['February', 1, 'summer'],
    ['March', 2, 'autumn'],
    ['April', 3, 'autumn'],
    ['May', 4, 'autumn'],
    ['June', 5, 'winter'],
    ['July', 6, 'winter'],
    ['August', 7, 'winter'],
  ] as const satisfies readonly (readonly [string, number, Season])[])(
    'maps %s to %s',
    (_name, monthIndex, expected) => {
      expect(seasonFromDate(dateIn(monthIndex))).toBe(expected);
    },
  );

  it('is stable across the whole of a month, including its boundaries', () => {
    // December is the interesting one: summer wraps around the year end.
    expect(seasonFromDate(new Date(2025, 11, 1))).toBe('summer');
    expect(seasonFromDate(new Date(2025, 11, 31))).toBe('summer');
    expect(seasonFromDate(new Date(2026, 0, 1))).toBe('summer');
  });

  it('covers every month of the year and returns nothing outside the union', () => {
    const produced = new Set(
      Array.from({ length: 12 }, (_, month) => seasonFromDate(dateIn(month))),
    );

    expect([...produced].sort()).toEqual([...SEASONS].sort());
  });

  it('handles a leap day', () => {
    expect(seasonFromDate(new Date(2024, 1, 29))).toBe('summer');
  });

  it('throws rather than guessing when given an Invalid Date', () => {
    expect(() => seasonFromDate(new Date('not a date'))).toThrow(RangeError);
  });
});
