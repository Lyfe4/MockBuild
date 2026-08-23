import { binomialOf } from '@/lib/catalogue';
import type { Species } from '@/types';

import { firstActiveIndex } from './months';

/**
 * The order the calendar's rows are in, and how a URL says so.
 *
 * Two orders, because the chart answers two different questions. Sorted by
 * phenology it reads as a *season*: the bars step down the page from left to
 * right and a reader can see what is out in October without picking a row.
 * Sorted taxonomically it reads as a *collection*: the two Odonata sit together
 * and their flight periods can be compared, which the first order scatters.
 *
 * The order lives in the query string, like the catalogue's filters and the
 * key's answers, so a link to the chart is a link to the chart somebody was
 * looking at.
 */
export const CALENDAR_ORDERS = ['phenology', 'taxonomy'] as const;

export type CalendarOrder = (typeof CALENDAR_ORDERS)[number];

export const CALENDAR_ORDER_LABELS: Record<CalendarOrder, string> = {
  phenology: 'By flight period',
  taxonomy: 'By taxonomy',
};

/** The parameter name. Short, because it sits beside `season` in a shared link. */
export const CALENDAR_ORDER_PARAM = 'by';

/** The order a bare `/calendar` is in. */
export const DEFAULT_CALENDAR_ORDER: CalendarOrder = 'phenology';

/**
 * The order a URL asks for, or the default.
 *
 * A URL is user input: anything that is not one of the two known orders is the
 * default rather than an error, on the same reasoning as the catalogue's query
 * parser. A chart is not worth an error page.
 */
export function parseCalendarOrder(raw: string | null): CalendarOrder {
  return CALENDAR_ORDERS.find((order) => order === raw) ?? DEFAULT_CALENDAR_ORDER;
}

/**
 * The rows, sorted.
 *
 * Never in place — `SPECIES` is a module constant and sorting it would reorder
 * the accession numbers, which are assigned from position.
 *
 * `phenology` sorts by where the flight period starts and breaks ties on the
 * binomial, so two animals out from the same month are in a stable order rather
 * than in whatever order the collection happens to hold them.
 *
 * `taxonomy` sorts order, then family, then binomial. Alphabetically within each
 * — not phylogenetically, which would be a claim about relationships the archive
 * is not in a position to make and which nobody would be able to check against
 * the page.
 */
export function calendarRows(all: readonly Species[], order: CalendarOrder): Species[] {
  const byName = (a: Species, b: Species): number => binomialOf(a).localeCompare(binomialOf(b));

  if (order === 'taxonomy') {
    return [...all].sort(
      (a, b) =>
        a.taxonomy.order.localeCompare(b.taxonomy.order) ||
        a.taxonomy.family.localeCompare(b.taxonomy.family) ||
        byName(a, b),
    );
  }

  return [...all].sort((a, b) => firstActiveIndex(a) - firstActiveIndex(b) || byName(a, b));
}
