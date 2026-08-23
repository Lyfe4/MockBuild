import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { Ledger } from '@/components/Ledger';
import { catalogueNumberOf, SPECIES } from '@/data';
import { FilterPanel, SpecimenRow } from '@/features/catalogue';
import { useDocumentTitle } from '@/hooks';
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

export function CatalogueRoute() {
  const [searchParams, setSearchParams] = useSearchParams();

  useDocumentTitle('Catalogue');

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

  return (
    <Ledger
      margin={
        <FilterPanel query={query} orders={ORDERS} families={families} onChange={applyQuery} />
      }
    >
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

          <div className={styles.sort}>
            <label className={styles.sortLabel} htmlFor="catalogue-sort">
              Order
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
    </Ledger>
  );
}
