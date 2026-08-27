import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { Ledger } from '@/components/Ledger';
import { catalogueNumberOf, SPECIES } from '@/data';
import { FilterDisclosure, FilterPanel, SpecimenRow } from '@/features/catalogue';
import { JsonLd, useRouteMeta } from '@/features/meta';
import { useMediaQuery } from '@/hooks';
import {
  clearFilters,
  familiesOf,
  isFiltered,
  ordersOf,
  parseCatalogueQuery,
  queryCatalogue,
  SORT_KEYS,
  SORT_LABELS,
  toSearchParams,
  type CatalogueQuery,
  type SortKey,
} from '@/lib/catalogue';
import { catalogueDataset, clampDescription, routeMeta } from '@/lib/meta';

import styles from './CatalogueRoute.module.css';

/**
 * The catalogue: every species in the collection, filtered from the URL.
 *
 * The facets a reader is offered come from the data rather than a hard-coded
 * list, so adding an order or a family to `src/data/species` adds it here.
 */
const ORDERS = ordersOf(SPECIES);
const ALL_FAMILIES = familiesOf(SPECIES);

/** Sorting by catalogue number needs to know what the numbers are. */
const OPTIONS = { accessionOf: catalogueNumberOf } as const;

/**
 * The width at which the ledger grows its margin column. Matches the media
 * query in `Ledger.module.css`, which is the thing that actually decides it.
 *
 * Read in JavaScript because the *markup* differs either side of it, not just
 * its presentation: above the breakpoint the filters are the margin and are
 * always open, and below it they are a disclosure inside the body column,
 * between the heading and the list. Rendering both and hiding one with CSS
 * would put two search boxes with the same label into the page.
 */
const HAS_MARGIN = '(min-width: 60rem)';

export function CatalogueRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const hasMargin = useMediaQuery(HAS_MARGIN);

  useRouteMeta(
    routeMeta({
      title: 'Catalogue',
      description: clampDescription(
        `Every specimen in the collection: ${String(SPECIES.length)} insect species across six ` +
          'orders, each with an accession record and a hand-drawn plate. Filter by order, ' +
          'colour, markings, size and season.',
      ),
      path: '/catalogue',
    }),
  );

  const query = useMemo(
    () => parseCatalogueQuery(searchParams, { orders: ORDERS, families: ALL_FAMILIES }),
    [searchParams],
  );
  const results = useMemo(() => queryCatalogue(SPECIES, query, OPTIONS), [query]);
  // The family select only offers what the chosen orders contain.
  const families = useMemo(() => familiesOf(SPECIES, query.orders), [query.orders]);

  const applyQuery = (next: CatalogueQuery): void => {
    const params = toSearchParams(next);
    // The season is not part of the catalogue query, but it shares the URL —
    // dropping it would reset a shared link's palette on the first click.
    const season = searchParams.get('season');

    if (season !== null) params.set('season', season);

    setSearchParams(params, { replace: true });
  };

  const filters = (
    <FilterPanel query={query} orders={ORDERS} families={families} onChange={applyQuery} />
  );

  return (
    <Ledger margin={hasMargin ? filters : null}>
      <div className={styles.header}>
        <h1 className={styles.title} tabIndex={-1}>
          Catalogue
        </h1>
        <p className={styles.description}>
          Every species held at Thornfield, with its hand-authored plate beside the record.
        </p>

        <div className={styles.summary}>
          {/*
            Announced, not just displayed. Filtering happens without a page
            change, so a screen reader user would otherwise have no idea the
            list beneath them had grown or shrunk.
          */}
          <p className={styles.count} aria-live="polite">
            {results.length === SPECIES.length
              ? `${String(results.length)} species`
              : `${String(results.length)} of ${String(SPECIES.length)} species`}
          </p>

          {/*
            "Sort", not "Order". The taxonomic Order is a filter a few
            centimetres to the left of this control, and a page with two things
            labelled Order is a page where a reader has to work out which one a
            label belongs to. The animal's Order is the one with a claim to the
            word.
          */}
          <div className={styles.sort}>
            <label className={styles.sortLabel} htmlFor="catalogue-sort">
              Sort
            </label>
            <select
              id="catalogue-sort"
              className={styles.sortSelect}
              value={query.sort}
              onChange={(event) => {
                applyQuery({ ...query, sort: event.target.value as SortKey });
              }}
            >
              {SORT_KEYS.map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/*
        Narrow screens only; above the breakpoint the same panel is the margin.
        Placed after the heading and before the list, because that is where a
        reader looks for the controls that narrow it — and because it is what
        lets the first specimen be on screen when the page opens.
      */}
      {!hasMargin && (
        <FilterDisclosure query={query} orders={ORDERS} families={families} onChange={applyQuery} />
      )}

      {results.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No species match those filters.</p>
          <p className={styles.emptyBody}>
            The archive holds {SPECIES.length} species in total. Try widening the search, or clear
            the filters and start again.
          </p>
          <button
            type="button"
            className={styles.emptyAction}
            onClick={() => {
              applyQuery(clearFilters(query));
            }}
          >
            Show all {SPECIES.length} species
          </button>
        </div>
      ) : (
        <ul className={styles.results} role="list">
          {results.map((species) => (
            <SpecimenRow key={species.id} species={species} />
          ))}
        </ul>
      )}

      {isFiltered(query) && results.length > 0 && (
        <p className={styles.footnote}>
          Showing {results.length} of {SPECIES.length} species.
        </p>
      )}

      {/*
        The catalogue described to a machine, as a `Dataset` — which is what it
        honestly is, and the reason there is no `Organization` node anywhere on
        this site. See `src/lib/meta/schema.ts`: a `Museum` with a town and a
        founding year in it would be a machine-readable claim that Thornfield
        exists, made in the one place a reader never looks and a crawler always
        does. The disclosure rides in the dataset's own description instead.

        Built from the unfiltered collection rather than from `results`: the
        dataset is what the archive holds, not what this visitor has narrowed it
        to, and a filtered link should not describe a smaller catalogue.
      */}
      <JsonLd data={catalogueDataset(SPECIES)} />
    </Ledger>
  );
}
