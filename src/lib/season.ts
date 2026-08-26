import type { Month, Season } from '@/types';

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
/**
 * Which of Thornfield's seasons a calendar month falls in.
 *
 * Southern hemisphere, like everything else here: September to November is
 * spring, December to February summer, March to May autumn, June to August
 * winter.
 *
 * Most records in the archive were observed in the *northern* hemisphere, and
 * for those the mismatch is deliberate and needs saying out loud wherever it is
 * shown. A European stag beetle flies in May to August, and this reports that
 * as autumn and winter — because those are Thornfield's names for those months,
 * not because anyone has claimed the beetle flies in the southern winter.
 *
 * Not all of them, though, which is what `Species.monthsHemisphere` is for. The
 * two Australian scarabs were observed here, so November and December really are
 * their spring and summer and the pages say nothing about a mismatch on their
 * rows. A caveat printed over a record that has not got the problem is as wrong
 * as one left off a record that has.
 */
export function seasonOfMonth(month: Month): Season {
  if (month >= 9 && month <= 11) return 'spring';
  if (month === 12 || month <= 2) return 'summer';
  if (month >= 3 && month <= 5) return 'autumn';

  return 'winter';
}

/** Every season a set of months touches, in calendar order. */
export function seasonsOfMonths(months: readonly Month[]): Season[] {
  const found = new Set(months.map(seasonOfMonth));

  return (['spring', 'summer', 'autumn', 'winter'] as const).filter((season) => found.has(season));
}

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
