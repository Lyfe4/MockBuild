import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { Ledger } from '@/components/Ledger';
import { SPECIES } from '@/data';
import { FilterPanel, SpecimenRow } from '@/features/catalogue';
import { useDocumentTitle } from '@/hooks';
import {
  familiesOf,
  isFiltered,
  parseCatalogueQuery,
  queryCatalogue,
  SORT_KEYS,
  SORT_LABELS,
  toSearchParams,
  type CatalogueQuery,
  type SortKey,
} from '@/lib/catalogue';

import styles from './CatalogueRoute.module.css';

/** Derived once: the dataset is a module constant and never changes. */
const FAMILIES = familiesOf(SPECIES);

/**
 * The catalogue.
 *
 * All filter state lives in the URL. That is the whole architecture of this
 * page: `useSearchParams` is the single source of truth, the query is parsed
 * out of it on every render, and every control writes back to it. Nothing is
 * mirrored into component state, so there is no possibility of the two
 * disagreeing — and a filtered view is linkable, bookmarkable and survives a
 * reload for free.
 */
export function CatalogueRoute() {
  const [searchParams, setSearchParams] = useSearchParams();

  useDocumentTitle('Catalogue');

  const query = useMemo(() => parseCatalogueQuery(searchParams, FAMILIES), [searchParams]);

  const results = useMemo(() => queryCatalogue(SPECIES, query), [query]);

  const applyQuery = (next: CatalogueQuery): void => {
    const params = toSearchParams(next);

    // The season is not part of the catalogue query, but it is in the same URL.
    // Carrying it across keeps a shared link's palette intact while filtering.
    const season = searchParams.get('season');

    if (season !== null) params.set('season', season);

    setSearchParams(params, { replace: true });
  };

  return (
    <Ledger margin={<FilterPanel query={query} families={FAMILIES} onChange={applyQuery} />}>
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
              applyQuery({ search: '', families: [], sort: query.sort });
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
