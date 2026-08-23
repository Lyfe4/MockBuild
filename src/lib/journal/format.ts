import { monthName } from '@/lib/calendar';
import type { Month } from '@/types';

/**
 * `2026-03-07` → `7 March 2026`.
 *
 * String in, string out, and no `Date` anywhere: an entry's date is a day
 * rather than an instant, and putting it through `new Date(...)` would hand it
 * a time zone it does not have — which is how a journal entry ends up dated the
 * 6th for a reader in Perth.
 *
 * The month name comes from the calendar's own list rather than a second copy,
 * and from `toLocaleDateString` least of all: the archive writes dates one way,
 * and a format that changed with the visitor's locale would put a date on the
 * page that does not match the date in the file.
 *
 * A string that is not `YYYY-MM-DD` comes back unchanged. Malformed dates are
 * caught at parse time and named as problems; this function is not the place to
 * discover one, and showing the raw value beats showing `NaN`.
 */
export function formatEntryDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (match === null) return date;

  const [, year = '', month = '', day = ''] = match;
  const index = Number(month);

  if (index < 1 || index > 12) return date;

  return `${String(Number(day))} ${monthName(index as Month)} ${year}`;
}
