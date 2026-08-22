import type { Season } from '@/types';

/**
 * Maps a date to its Southern Hemisphere season.
 *
 * Uses the *meteorological* seasons — whole calendar months — rather than the
 * astronomical ones, which shift by a day or two each year and would make this
 * function depend on an ephemeris:
 *
 *   spring  September, October, November
 *   summer  December, January, February
 *   autumn  March, April, May
 *   winter  June, July, August
 *
 * The month is read in the host's local time zone, which is what we want: a
 * reader in Hobart should get Hobart's season, not UTC's.
 *
 * Pure, total over valid dates, and free of `Date.now()` — the caller supplies
 * the date, so this stays trivially testable.
 *
 * @throws {RangeError} if `date` is an Invalid Date. Returning a plausible-
 *   looking season for `new Date('nonsense')` would hide the bug that produced it.
 */
export function seasonFromDate(date: Date): Season {
  const month = date.getMonth();

  if (Number.isNaN(month)) {
    throw new RangeError('seasonFromDate received an Invalid Date');
  }

  // `getMonth()` is zero-based: 0 is January, 11 is December.
  if (month >= 8 && month <= 10) return 'spring';
  if (month === 11 || month <= 1) return 'summer';
  if (month >= 2 && month <= 4) return 'autumn';
  return 'winter';
}
