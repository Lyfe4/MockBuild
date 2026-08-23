import { describe, expect, it } from 'vitest';

import { SPECIES } from '@/data';
import { binomialOf } from '@/lib/catalogue';

import { firstActiveIndex } from './months';
import {
  CALENDAR_ORDER_LABELS,
  CALENDAR_ORDERS,
  calendarRows,
  DEFAULT_CALENDAR_ORDER,
  parseCalendarOrder,
} from './rows';

/**
 * The row order, checked against the real collection.
 *
 * Both orders are total and stable — the same records give the same rows every
 * time, which is what lets the order live in a URL — and neither of them touches
 * `SPECIES`, which is a module constant whose position assigns the accession
 * numbers.
 */

describe('parseCalendarOrder', () => {
  it('reads both orders', () => {
    for (const order of CALENDAR_ORDERS) {
      expect(parseCalendarOrder(order)).toBe(order);
    }
  });

  it('falls back to the default rather than erroring', () => {
    // A query string is user input. A chart is not worth an error page.
    expect(parseCalendarOrder(null)).toBe(DEFAULT_CALENDAR_ORDER);
    expect(parseCalendarOrder('')).toBe(DEFAULT_CALENDAR_ORDER);
    expect(parseCalendarOrder('sideways')).toBe(DEFAULT_CALENDAR_ORDER);
    expect(parseCalendarOrder('PHENOLOGY')).toBe(DEFAULT_CALENDAR_ORDER);
  });

  it('labels every order, so a new one fails the build here', () => {
    for (const order of CALENDAR_ORDERS) {
      expect(CALENDAR_ORDER_LABELS[order].length).toBeGreaterThan(0);
    }
  });
});

describe('calendarRows', () => {
  it('leaves the collection where it is', () => {
    const before = SPECIES.map((one) => one.id);

    calendarRows(SPECIES, 'phenology');
    calendarRows(SPECIES, 'taxonomy');

    // Sorting in place would reorder the accession numbers, which are assigned
    // from position in `SPECIES`.
    expect(SPECIES.map((one) => one.id)).toStrictEqual(before);
  });

  it('returns every species exactly once, in both orders', () => {
    for (const order of CALENDAR_ORDERS) {
      const rows = calendarRows(SPECIES, order);

      expect(rows, order).toHaveLength(SPECIES.length);
      expect(new Set(rows.map((one) => one.id)).size, order).toBe(SPECIES.length);
    }
  });

  it('steps the flight periods down the page', () => {
    const rows = calendarRows(SPECIES, 'phenology');
    const starts = rows.map(firstActiveIndex);

    // The reason this is the default order: read down the first column of bars
    // and they descend, so a reader can see what is out in October without
    // picking a row out.
    expect([...starts].sort((a, b) => a - b)).toStrictEqual(starts);
  });

  it('breaks a phenology tie on the name, so the order is stable', () => {
    const rows = calendarRows(SPECIES, 'phenology');

    for (const [index, row] of rows.entries()) {
      const before = rows[index - 1];

      if (before === undefined) continue;
      if (firstActiveIndex(before) !== firstActiveIndex(row)) continue;

      expect(binomialOf(before).localeCompare(binomialOf(row))).toBeLessThan(0);
    }
  });

  it('groups the orders together when asked for taxonomy', () => {
    const rows = calendarRows(SPECIES, 'taxonomy');
    const orders = rows.map((one) => one.taxonomy.order);

    // Each order appears as one contiguous block, which is the point: the two
    // Odonata sit together and their flight periods can be compared.
    const blocks = orders.filter((order, index) => order !== orders[index - 1]);

    expect(new Set(blocks).size).toBe(blocks.length);
    expect(blocks).toStrictEqual([...new Set(orders)].sort((a, b) => a.localeCompare(b)));
  });

  it('groups families inside an order, and names inside a family', () => {
    const rows = calendarRows(SPECIES, 'taxonomy');

    for (const [index, row] of rows.entries()) {
      const before = rows[index - 1];

      if (before === undefined) continue;
      if (before.taxonomy.order !== row.taxonomy.order) continue;

      if (before.taxonomy.family === row.taxonomy.family) {
        expect(binomialOf(before).localeCompare(binomialOf(row))).toBeLessThan(0);
      } else {
        expect(before.taxonomy.family.localeCompare(row.taxonomy.family)).toBeLessThan(0);
      }
    }
  });

  it('gives the same rows twice, which is what lets the order live in a URL', () => {
    for (const order of CALENDAR_ORDERS) {
      expect(calendarRows(SPECIES, order).map((one) => one.id)).toStrictEqual(
        calendarRows(SPECIES, order).map((one) => one.id),
      );
    }
  });
});
