import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SPECIES } from '@/data';
import {
  CALENDAR_MONTHS,
  calendarRows,
  isActiveIn,
  monthAbbreviation,
  monthName,
  monthsOfSeason,
} from '@/lib/calendar';
import { binomialOf } from '@/lib/catalogue';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Month, Season } from '@/types';

import { CalendarRoute } from './CalendarRoute';

/**
 * The calendar page, against the real collection.
 *
 * Nothing here writes a month or a species down: the expected cells are read out
 * of the same records the page reads, so the test says "the chart agrees with
 * the records" rather than "the chart is what it was when this was written". A
 * new species adds a row and this file does not change.
 *
 * What it does pin is the parts a reader would notice breaking — that it is a
 * real table with headers on both axes, that a filled cell says so in words as
 * well as in colour, that the season tint follows the theme, and that reordering
 * the rows survives a reload because it is in the URL.
 */

function renderCalendar(options: { route?: string; season?: Season } = {}) {
  return renderWithProviders(<CalendarRoute />, {
    route: options.route ?? '/calendar',
    ...(options.season === undefined ? {} : { season: options.season }),
  });
}

/** The row for one species, found by the name in its row header. */
function rowFor(id: string): HTMLElement {
  const species = SPECIES.find((one) => one.id === id);
  const header = screen.getByRole('rowheader', { name: new RegExp(binomialOf(species!)) });
  const row = header.closest('tr');

  expect(row).not.toBeNull();

  return row!;
}

/** The twelve data cells of a row, in calendar order. */
function cellsOf(row: HTMLElement): HTMLElement[] {
  return within(row).getAllByRole('cell');
}

describe('CalendarRoute', () => {
  it('renders one row per specimen and twelve month columns', () => {
    renderCalendar();

    const table = screen.getByRole('table');
    const columns = within(table).getAllByRole('columnheader');

    // Thirteen headers: the corner, then the months.
    expect(columns).toHaveLength(CALENDAR_MONTHS.length + 1);
    expect(within(table).getAllByRole('rowheader')).toHaveLength(SPECIES.length);
  });

  it('heads the columns July first, and names each month in full', () => {
    renderCalendar();

    const table = screen.getByRole('table');
    const months = within(table)
      .getAllByRole('columnheader')
      .slice(1)
      .map((cell) => cell.textContent);

    for (const [index, month] of CALENDAR_MONTHS.entries()) {
      expect(months[index] ?? '', monthName(month)).toContain(monthAbbreviation(month));
    }

    // The abbreviation is what fits three characters; the full name is what a
    // reader gets on hover and what the `abbr` element is for.
    expect(within(table).getByTitle('July')).toBeInTheDocument();
  });

  it('fills a cell exactly where the record says the animal is out', () => {
    renderCalendar();

    for (const species of SPECIES) {
      const cells = cellsOf(rowFor(species.id));

      expect(cells, species.id).toHaveLength(CALENDAR_MONTHS.length);

      for (const [index, month] of CALENDAR_MONTHS.entries()) {
        const cell = cells[index];
        const active = isActiveIn(species, month);

        expect(cell?.hasAttribute('data-active'), `${species.id} ${monthName(month)}`).toBe(active);
      }
    }
  });

  it('says in words what the colour says, cell by cell', () => {
    renderCalendar();

    const cells = cellsOf(rowFor('gryllus-campestris'));
    const cricket = SPECIES.find((one) => one.id === 'gryllus-campestris')!;

    for (const [index, month] of CALENDAR_MONTHS.entries()) {
      const expected = isActiveIn(cricket, month) ? 'on the wing' : 'not recorded';

      // A filled square is not a fact a screen reader can read, so every cell
      // carries its state as text. Visually hidden, so it costs the chart
      // nothing.
      expect(cells[index]?.textContent, monthName(month)).toBe(expected);
    }
  });

  it('draws each row in its own specimen’s pigment', () => {
    renderCalendar();

    for (const species of SPECIES) {
      const filled = cellsOf(rowFor(species.id)).filter((cell) => cell.hasAttribute('data-active'));

      expect(filled.length, species.id).toBeGreaterThan(0);

      for (const cell of filled) {
        // The same index the plate beside it is inked in, so a row and its
        // drawing are one colour. A data attribute rather than a style, because
        // the CSP forbids inline styles.
        expect(cell.getAttribute('data-pigment'), species.id).toBe(String(species.pigment));
      }
    }
  });

  it('tints the three months of the season the site is dressed in', () => {
    const seasons: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];

    for (const season of seasons) {
      const { unmount } = renderCalendar({ season });
      const table = screen.getByRole('table');
      const tinted = within(table)
        .getAllByRole('columnheader')
        .filter((cell) => cell.getAttribute('data-season') === season);
      const expected = monthsOfSeason(season).map((month) => monthAbbreviation(month));

      // Three, and the right three. This is the one place in the archive where
      // the palette switcher changes what the data looks like rather than only
      // what colour it is drawn in.
      expect(tinted, season).toHaveLength(3);
      expect(tinted.map((cell) => cell.textContent.slice(0, 3))).toStrictEqual(expected);

      unmount();
    }
  });

  it('re-tints when the season changes rather than keeping the old months', () => {
    // Rendered twice at different seasons: the same component, and no month is
    // tinted for both. `monthsOfSeason` guarantees the sets are disjoint and
    // this says the page follows it.
    const first = renderCalendar({ season: 'spring' });
    const springTinted = new Set(
      within(screen.getByRole('table'))
        .getAllByRole('columnheader')
        .filter((cell) => cell.hasAttribute('data-season'))
        .map((cell) => cell.textContent.slice(0, 3)),
    );

    first.unmount();
    renderCalendar({ season: 'summer' });

    const summerTinted = within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .filter((cell) => cell.hasAttribute('data-season'))
      .map((cell) => cell.textContent.slice(0, 3));

    expect(summerTinted).toHaveLength(3);
    for (const month of summerTinted) expect(springTinted.has(month)).toBe(false);
  });

  it('rules exactly one column, the current month', () => {
    renderCalendar();

    const table = screen.getByRole('table');
    const ruled = within(table)
      .getAllByRole('columnheader')
      .filter((cell) => cell.hasAttribute('data-current'));

    expect(ruled).toHaveLength(1);
    // And every cell under it, so the rule runs down the chart rather than
    // sitting in the header.
    expect(
      within(table)
        .getAllByRole('cell')
        .filter((cell) => cell.hasAttribute('data-current')),
    ).toHaveLength(SPECIES.length);
  });

  it('orders rows by flight period by default', () => {
    renderCalendar();

    const expected = calendarRows(SPECIES, 'phenology').map((one) => binomialOf(one));
    const actual = within(screen.getByRole('table'))
      .getAllByRole('rowheader')
      .map((cell) => expected.find((name) => cell.textContent.includes(name)));

    expect(actual).toStrictEqual(expected);
  });

  it('reads the order out of the URL, so a shared link is the chart somebody saw', () => {
    renderCalendar({ route: '/calendar?by=taxonomy' });

    const expected = calendarRows(SPECIES, 'taxonomy').map((one) => binomialOf(one));
    const actual = within(screen.getByRole('table'))
      .getAllByRole('rowheader')
      .map((cell) => expected.find((name) => cell.textContent.includes(name)));

    expect(actual).toStrictEqual(expected);
    expect(screen.getByRole('radio', { name: 'By taxonomy' })).toBeChecked();
  });

  it('falls back to the default order for a parameter it cannot read', () => {
    renderCalendar({ route: '/calendar?by=sideways' });

    // A query string is user input. A chart is not worth an error page.
    expect(screen.getByRole('radio', { name: 'By flight period' })).toBeChecked();
  });

  it('reorders the rows when the control is used, and writes it to the URL', async () => {
    const user = userEvent.setup();

    renderCalendar();

    const before = within(screen.getByRole('table'))
      .getAllByRole('rowheader')
      .map((cell) => cell.textContent);

    await user.click(screen.getByRole('radio', { name: 'By taxonomy' }));

    const after = within(screen.getByRole('table'))
      .getAllByRole('rowheader')
      .map((cell) => cell.textContent);

    expect(after).not.toStrictEqual(before);
    expect(screen.getByRole('radio', { name: 'By taxonomy' })).toBeChecked();
    // Same rows, in a different order — not a filter.
    expect([...after].sort()).toStrictEqual([...before].sort());
  });

  it('links every row to its specimen sheet, and reads out its flight period', () => {
    renderCalendar();

    for (const species of SPECIES) {
      const link = within(rowFor(species.id)).getByRole('link');

      expect(link, species.id).toHaveAttribute('href', `/specimen/${species.id}`);
      // The sentence is on the link rather than on the row header, so it is
      // announced once when a reader moves down the first column instead of
      // again beside every one of the twelve cells.
      expect(link.textContent, species.id).toContain('On the wing');
    }
  });

  it('captions the table and says the year is northern months on southern seasons', () => {
    renderCalendar({ season: 'autumn' });

    // The caveat the catalogue's filter panel and the specimen sheet both carry,
    // and for the same reason: every record's months were observed in the
    // northern hemisphere and `seasonOfMonth` reads them as Thornfield's.
    // Queried as the emphasised phrases rather than as a substring of the
    // paragraph: `getByText` matches an element's own text nodes, so a <p> with
    // a <strong> inside it does not carry the strong's words.
    expect(screen.getByText('July to June')).toBeInTheDocument();
    expect(screen.getByText('northern')).toBeInTheDocument();
    // The consequence, which a reader would otherwise take for two flight
    // periods: a northern season sits astride July, so many bars appear at both
    // ends of their row.
    expect(screen.getByText('both ends')).toBeInTheDocument();

    const caption = screen.getByRole('table').querySelector('caption');

    expect(caption?.textContent).toContain(String(SPECIES.length));
    expect(caption?.textContent).toContain('autumn');
  });

  it('makes the scroller reachable, because a region nobody can focus is unreadable', () => {
    renderCalendar();

    const region = screen.getByRole('region', { name: /scrollable/i });

    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toContainElement(screen.getByRole('table'));
  });

  it('accounts for every month of every record and invents none', () => {
    renderCalendar();

    for (const species of SPECIES) {
      const filled = cellsOf(rowFor(species.id))
        .map((cell, index) => (cell.hasAttribute('data-active') ? CALENDAR_MONTHS[index] : null))
        .filter((month): month is Month => month !== null);

      expect(
        [...filled].sort((a, b) => a - b),
        species.id,
      ).toStrictEqual([...species.activeMonths].sort((a, b) => a - b));
    }
  });
});
