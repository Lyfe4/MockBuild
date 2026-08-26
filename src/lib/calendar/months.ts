import { seasonOfMonth } from '@/lib/season';
import type { Hemisphere, Month, Season, Species } from '@/types';

/**
 * The month arithmetic a phenology calendar needs, and nothing else.
 *
 * Pure functions over `Species.activeMonths`, which has been on the record
 * since the type was written and until now was read only by the catalogue's
 * season filter. A calendar is what the field was for.
 *
 * ## Why the year starts in July, and what it costs
 *
 * `CALENDAR_MONTHS` is July to June rather than January to December, and that is
 * a decision about *where to cut the loop* rather than about the months
 * themselves — a phenology chart is a ring, and any linear layout of it has to
 * break somewhere.
 *
 * July is where the Australian year is conventionally cut, and it keeps each of
 * spring, summer and autumn as an unbroken run of three columns. Only winter is
 * split, two columns at the start and one at the end.
 *
 * The cost is real and it is worth stating rather than discovering. Most records
 * here were observed in the **northern** hemisphere, where the flight season is
 * centred on June and July — so a great many of these animals are on the wing
 * *across the cut*, and their bars appear at both ends of the row. The stag
 * beetle flies May to August: one period, four months, and in a July-first chart
 * two columns at the left edge and two at the right.
 *
 * The two Australian scarabs are the exception and they show it: November to
 * February sits squarely in the middle of a July-first year, which is exactly
 * what a southern-hemisphere flight season does to this layout. They are the
 * only rows on the chart that need no explaining, and `Species.monthsHemisphere`
 * is what lets the page tell the difference.
 *
 * Which is why everything below treats the year as the ring it is. `activeRuns`
 * joins a run that crosses the cut, so the prose says "May to August" rather
 * than inventing a second flight period, and `firstActiveIndex` reports where
 * that joined run *starts* rather than where its left-hand fragment does. A
 * naive reading of the array gives two runs and a sort that puts almost every
 * row at position zero, which is what the first version of this file did.
 */

/**
 * The twelve months, July first.
 *
 * The order the calendar's columns are in, and the order `firstActiveMonth`
 * measures from — so "first" means first in this list rather than lowest
 * number, which for a summer-flying animal is not the same thing.
 */
export const CALENDAR_MONTHS: readonly Month[] = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];

/**
 * Month names, as `Record<Month, string>` so a missing one fails the build.
 *
 * Not `Intl.DateTimeFormat`, deliberately. The archive's copy is in one
 * language and these are column headings in a table whose widths are tuned to
 * three characters; a formatter would give a different string per locale and
 * per browser version, which would make the layout depend on the visitor's
 * settings and the tests depend on the machine's ICU data.
 */
const MONTH_NAMES: Record<Month, string> = {
  1: 'January',
  2: 'February',
  3: 'March',
  4: 'April',
  5: 'May',
  6: 'June',
  7: 'July',
  8: 'August',
  9: 'September',
  10: 'October',
  11: 'November',
  12: 'December',
};

/** The full name, for the accessible column header and for prose. */
export function monthName(month: Month): string {
  return MONTH_NAMES[month];
}

/** Three letters, for the visible column header. */
export function monthAbbreviation(month: Month): string {
  return MONTH_NAMES[month].slice(0, 3);
}

/** Whether this species is recorded on the wing in this month. */
export function isActiveIn(species: Species, month: Month): boolean {
  return species.activeMonths.includes(month);
}

/** The three months of one of Thornfield's seasons, in calendar order. */
export function monthsOfSeason(season: Season): Month[] {
  return CALENDAR_MONTHS.filter((month) => seasonOfMonth(month) === season);
}

/**
 * The month a date falls in, 1 = January.
 *
 * Read in the host's local time zone, like `seasonFromDate`, and for the same
 * reason: a reader in Hobart should see Hobart's month ruled.
 *
 * @throws {RangeError} if `date` is an Invalid Date. Returning a plausible
 *   month for `new Date('nonsense')` would hide the bug that produced it.
 */
export function monthOfDate(date: Date): Month {
  const zeroBased = date.getMonth();

  if (Number.isNaN(zeroBased)) {
    throw new RangeError('monthOfDate received an Invalid Date');
  }

  // `getMonth()` is zero-based and `Month` is not.
  return (zeroBased + 1) as Month;
}

/**
 * The flight period as one run per unbroken stretch, in calendar order.
 *
 * Runs rather than a list of twelve, because "May to August" is what the animal
 * does and "May, June, July, August" is the same fact read out four times
 * slower. A species with two genuinely separate periods gets two runs, which the
 * archive does not currently hold but a second-generation insect would.
 *
 * **The year is a ring.** A run that crosses the July cut is one run, not two:
 * the stag beetle flies May to August, and reading the array straight through
 * would report "July to August, and again May to June" — two flight periods,
 * neither of which exists. So the walk starts at the first month whose
 * predecessor on the ring is *inactive*, and wraps.
 *
 * An animal active in all twelve months has no such month, and gets the whole
 * year as one run beginning wherever the array does.
 */
export function activeRuns(species: Species): { from: Month; to: Month }[] {
  const length = CALENDAR_MONTHS.length;
  const activeAt = (at: number): boolean => {
    const month = CALENDAR_MONTHS[((at % length) + length) % length];

    return month !== undefined && isActiveIn(species, month);
  };
  const monthAt = (at: number): Month =>
    CALENDAR_MONTHS[((at % length) + length) % length] ?? CALENDAR_MONTHS[0] ?? 1;

  if (!CALENDAR_MONTHS.some((month) => isActiveIn(species, month))) return [];

  // Where to start walking: the first position whose predecessor is inactive, so
  // a run that straddles the cut is entered at its true beginning. An animal
  // that is never off the wing has no such position and starts at zero.
  let start = 0;

  for (let at = 0; at < length; at += 1) {
    if (activeAt(at) && !activeAt(at - 1)) {
      start = at;
      break;
    }
  }

  const runs: { from: Month; to: Month }[] = [];

  for (let step = 0; step < length; step += 1) {
    const at = start + step;

    if (!activeAt(at)) continue;

    const last = runs.at(-1);

    if (last !== undefined && activeAt(at - 1)) last.to = monthAt(at);
    else runs.push({ from: monthAt(at), to: monthAt(at) });
  }

  return runs;
}

/**
 * Where this species' flight period starts, as a position in `CALENDAR_MONTHS`.
 *
 * The number the calendar sorts rows by, and the ring is the whole of it: this
 * is the start of the first run that *begins* in the year rather than the first
 * active column. For a stag beetle out from May to August those are different
 * answers — the first active column is July, at position 0, because the animal
 * was already flying when the year was cut.
 *
 * Taking the first active column was the first version and it made the sort
 * useless: thirteen of the archive's sixteen species are on the wing in July, so
 * thirteen rows scored zero and the order fell through to the tie-break on the
 * name. Taking the run's start spreads them across February, March, April, May
 * and August, which is what the animals actually do.
 *
 * A species active in all twelve months has no run start at all, and gets 0 —
 * the beginning of the year, which is as true as any other answer for something
 * that never stops. A species with no active months, which `species.test.ts`
 * forbids and the type allows, sorts last.
 */
export function firstActiveIndex(species: Species): number {
  const runs = activeRuns(species);
  const first = runs[0];

  if (first === undefined) return CALENDAR_MONTHS.length;

  return CALENDAR_MONTHS.indexOf(first.from);
}

/**
 * Whether any record in a collection had its months observed in `hemisphere`.
 *
 * The calendar and the catalogue's filter both have to explain that a
 * northern-hemisphere flight season read against Thornfield's southern months
 * is a relabelling rather than a claim about the animal. That explanation is
 * only worth printing while there is something on the page it applies to, and
 * "sixteen of these were northern" was a sentence typed in when sixteen of them
 * were all of them.
 *
 * A boolean rather than a count, deliberately. A count would have to be spelled
 * out in words to sit in the prose, and prose that says "most" stays true
 * however the collection grows.
 */
export function hasHemisphere(species: readonly Species[], hemisphere: Hemisphere): boolean {
  return species.some((one) => one.monthsHemisphere === hemisphere);
}

/** `activeRuns` in words. Empty months read as a sentence too, not as silence. */
export function describeActiveMonths(species: Species): string {
  const runs = activeRuns(species);

  if (runs.length === 0) return 'No months of adult activity recorded.';

  const phrases = runs.map(({ from, to }) =>
    from === to ? monthName(from) : `${monthName(from)} to ${monthName(to)}`,
  );

  return `On the wing ${phrases.join(', and again ')}.`;
}
