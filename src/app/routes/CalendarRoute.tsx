import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';

import { SpeciesIllustration } from '@/components/SpeciesIllustration';
import { VisuallyHidden } from '@/components/VisuallyHidden';
import { SPECIES } from '@/data';
import { findPlate } from '@/data/species/plates';
import { useRouteMeta } from '@/features/meta';
import { useSeason } from '@/features/theme';
import {
  CALENDAR_MONTHS,
  CALENDAR_ORDER_LABELS,
  CALENDAR_ORDER_PARAM,
  CALENDAR_ORDERS,
  calendarRows,
  describeActiveMonths,
  hasHemisphere,
  isActiveIn,
  monthAbbreviation,
  monthName,
  monthOfDate,
  monthsOfSeason,
  parseCalendarOrder,
  type CalendarOrder,
} from '@/lib/calendar';
import { binomialOf } from '@/lib/catalogue';
import { routeMeta } from '@/lib/meta';
import { seasonOfMonth } from '@/lib/season';
import type { Month } from '@/types';

import styles from './CalendarRoute.module.css';

/**
 * The phenology calendar: which specimens are out, and when.
 *
 * A month × species matrix built from `Species.activeMonths` and from nothing
 * else. The field has been on the record since the type was written — the type's
 * own comment says "a phenology calendar plots them" — and until now only the
 * catalogue's season filter read it.
 *
 * ## It is a table, and it is a table on purpose
 *
 * Sixteen rows of twelve cells with headers on both axes is tabular data, so it
 * is a `<table>` with a `<caption>`, `scope="col"` on the months and
 * `scope="row"` on the species. A grid of divs with ARIA bolted back on would be
 * the same markup with more of it, and one round of the browser's own table
 * navigation worse.
 *
 * Each cell carries its state as visually hidden text rather than as colour
 * alone, because a filled square is not a fact a screen reader can read and
 * `aria-label` on a `<td>` is honoured inconsistently. The alternative — one
 * summary sentence per row — was tried and rejected: a row header is announced
 * again for every cell in its row, so a twelve-word summary there is read twelve
 * times. The sentence is on the *link* instead, where it is read once.
 *
 * ## The season is the tie to the theme engine
 *
 * `useSeason` gives the season the whole site is dressed in, and the three
 * header cells belonging to it are tinted. Switching season in the header
 * re-tints them, which is the one place in the archive where the palette
 * switcher changes what the *data* looks like rather than only what colour it
 * is drawn in.
 *
 * Most records' months were observed in the **northern** hemisphere and
 * `seasonOfMonth` reads them as Thornfield's southern ones. That has to be said
 * out loud wherever it appears, so the note under the heading says it — the same
 * rule the catalogue's season filter and the specimen sheet follow.
 *
 * The word is "most" and it is read off the data through `hasHemisphere`, not
 * typed in. It said "every" while every record was European, which was true
 * when written and became false the moment two Australian scarabs were
 * accessioned — and their rows are the only two on this chart that need no
 * explaining at all.
 */

/**
 * Today, read once when the module loads.
 *
 * A calendar that re-read the clock on every render would change under a reader
 * at midnight on the last of the month, which is a bug nobody would ever see
 * and everybody would have to reason about. Once per page load is the honest
 * granularity for "the current month is ruled".
 */
const TODAY = new Date();

export function CalendarRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { season } = useSeason();

  useRouteMeta(
    routeMeta({
      title: 'Calendar',
      description:
        'A month-by-species phenology chart: when the adults of each specimen in the ' +
        'collection are on the wing, read against Thornfield’s southern year.',
      path: '/calendar',
    }),
  );

  const order = parseCalendarOrder(searchParams.get(CALENDAR_ORDER_PARAM));
  const rows = useMemo(() => calendarRows(SPECIES, order), [order]);
  const currentMonth = useMemo(() => monthOfDate(TODAY), []);
  const seasonMonths = useMemo(() => new Set<Month>(monthsOfSeason(season)), [season]);

  // Read off the records rather than written into the prose. See the note above
  // `TODAY` — the sentence said "every record" for as long as every record was
  // European, and nothing on the page could have caught it changing.
  const northernRecords = hasHemisphere(SPECIES, 'northern');
  const southernRecords = hasHemisphere(SPECIES, 'southern');

  const summary =
    `Months of adult activity for all ${String(SPECIES.length)} specimens, ` +
    `${season} highlighted, the current month ruled. ` +
    `${CALENDAR_ORDER_LABELS[order].toLowerCase()}.`;

  const setOrder = (next: CalendarOrder): void => {
    const params = new URLSearchParams(searchParams);

    params.set(CALENDAR_ORDER_PARAM, next);
    // Replace rather than push: reordering the same chart is not a step a
    // reader would want the back button to walk through.
    setSearchParams(params, { replace: true });
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h1 className={styles.title} tabIndex={-1}>
          Calendar
        </h1>
        <p className={styles.description}>
          When each specimen in the collection is on the wing, read against Thornfield&rsquo;s
          southern year.
        </p>

        <p className={styles.note}>
          The year runs <strong>July to June</strong>, which keeps spring, summer and autumn as
          unbroken runs of three columns and splits only winter.{' '}
          {northernRecords ? (
            <>
              Most of these records&rsquo; months were observed in the <strong>northern</strong>{' '}
              hemisphere and are shown against Thornfield&rsquo;s southern seasons, so a European
              stag beetle flying from May to August lands in autumn and winter. That is what the
              months say, not a claim about the animal.
              {southernRecords ? (
                <> The Australian species are the exception: their months were observed here.</>
              ) : null}
            </>
          ) : null}
        </p>

        <p className={styles.note}>
          A northern flight season sits astride July, so many of these bars appear at{' '}
          <strong>both ends</strong> of their row. The stag beetle&rsquo;s two columns on the left
          and two on the right are one flight period of four months, not two of two — the year is a
          ring and the chart has to cut it somewhere. Rows are ordered from where each
          period&nbsp;begins.
        </p>

        <fieldset className={styles.orderControl}>
          <legend className={styles.orderLegend}>Order rows</legend>
          {CALENDAR_ORDERS.map((candidate) => (
            <label key={candidate} className={styles.orderOption}>
              {/*
                Radios rather than buttons, because this is a choice among two
                presentations of the same page and it stays chosen — unlike the
                key's options, which navigate and so must not be radios.
              */}
              <input
                type="radio"
                name="calendar-order"
                value={candidate}
                checked={order === candidate}
                onChange={() => {
                  setOrder(candidate);
                }}
              />
              {CALENDAR_ORDER_LABELS[candidate]}
            </label>
          ))}
        </fieldset>
      </div>

      {/*
        The chart's summary, twice over and once each way.

        A `<caption>` is the right element and it is the one screen readers get,
        but a caption is as wide as its table — 40rem here — so on a phone its
        text wraps at 640 pixels and a reader sees the first 375 of each line.
        So the caption stays, visually hidden, and the same sentence is set again
        above the scroller where it can wrap to the viewport. The visible copy is
        `aria-hidden`, so nothing is announced twice.
      */}
      <p className={styles.summary} aria-hidden="true">
        {summary}
      </p>

      {/*
        The scroller, not the table, is what scrolls, and it is focusable and
        labelled: a region a keyboard user cannot reach is a region they cannot
        read. `tabIndex={0}` is the accepted way to give an `overflow` container
        a scroll position of its own.
      */}
      <div
        className={styles.scroller}
        // A labelled region with a tab stop is the documented way to make a
        // scrollable area reachable from the keyboard (WCAG technique G202), and
        // this rule cannot tell that apart from a tab stop on a paragraph. The
        // alternative is a chart a keyboard user cannot scroll.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        role="region"
        aria-label="Phenology calendar, scrollable"
      >
        <table className={styles.table}>
          <caption className={styles.caption}>
            <VisuallyHidden>{summary}</VisuallyHidden>
          </caption>

          <thead>
            <tr>
              <th scope="col" className={styles.corner}>
                Specimen
              </th>
              {CALENDAR_MONTHS.map((month) => (
                <th
                  key={month}
                  scope="col"
                  className={styles.month}
                  data-season={seasonMonths.has(month) ? season : undefined}
                  data-current={month === currentMonth ? 'true' : undefined}
                >
                  {/*
                    The abbreviation is what fits a column three characters
                    wide; the full name is what a screen reader should say, and
                    it is said once per column rather than once per cell.
                  */}
                  <abbr title={monthName(month)}>{monthAbbreviation(month)}</abbr>
                  <VisuallyHidden>
                    {' '}
                    &mdash; {seasonOfMonth(month)}
                    {month === currentMonth ? ', this month' : ''}
                  </VisuallyHidden>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((species) => {
              const plate = findPlate(species.id);

              return (
                <tr key={species.id}>
                  <th scope="row" className={styles.species}>
                    <Link to={`/specimen/${species.id}`} className={styles.link}>
                      <span className={styles.thumb}>
                        {plate !== undefined && (
                          <SpeciesIllustration species={species} plate={plate} decorative />
                        )}
                      </span>
                      <span className={styles.names}>
                        <span className={styles.scientific}>{binomialOf(species)}</span>
                        <span className={styles.common}>{species.commonName}</span>
                      </span>
                      {/*
                        The flight period as a sentence, on the link rather than
                        on the row header, so it is announced once when a reader
                        moves through the first column instead of again for every
                        one of the twelve cells beside it.
                      */}
                      <VisuallyHidden>{describeActiveMonths(species)}</VisuallyHidden>
                    </Link>
                  </th>

                  {CALENDAR_MONTHS.map((month) => {
                    const active = isActiveIn(species, month);

                    return (
                      <td
                        key={month}
                        className={styles.cell}
                        // The pigment the specimen's own plate is inked in, so a
                        // row of cells and the drawing beside it are the same
                        // colour. A data attribute rather than a style, because
                        // the CSP forbids inline styles.
                        data-pigment={active ? String(species.pigment) : undefined}
                        data-active={active ? 'true' : undefined}
                        data-current={month === currentMonth ? 'true' : undefined}
                      >
                        <VisuallyHidden>{active ? 'on the wing' : 'not recorded'}</VisuallyHidden>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
