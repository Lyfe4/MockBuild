import { useEffect, useId, useState } from 'react';

import { useDebouncedValue } from '@/hooks';
import { isFiltered, type CatalogueQuery } from '@/lib/catalogue';

import styles from './FilterPanel.module.css';

/**
 * The catalogue's margin: search, family, and a way out.
 *
 * The search box is the one control that does not commit on every change. A
 * keystroke rewrites the URL, and rewriting it thirty times a second would fill
 * the history and re-render the list on every letter, so the draft is local and
 * the committed value is debounced.
 */
const SEARCH_DEBOUNCE_MS = 150;

export interface FilterPanelProps {
  query: CatalogueQuery;
  families: readonly string[];
  onChange: (next: CatalogueQuery) => void;
}

export function FilterPanel({ query, families, onChange }: FilterPanelProps) {
  const searchId = useId();
  const [searchDraft, setSearchDraft] = useState(query.search);
  const debouncedSearch = useDebouncedValue(searchDraft, SEARCH_DEBOUNCE_MS);
  const [lastCommitted, setLastCommitted] = useState(query.search);

  // The URL can change under us — a back button, a link, the clear button —
  // and the draft has to follow it. Derived during render rather than in an
  // effect, so the input never paints one frame of the old text.
  if (lastCommitted !== query.search) {
    setLastCommitted(query.search);
    setSearchDraft(query.search);
  }

  // Inside-out: the reader stopped typing.
  useEffect(() => {
    if (debouncedSearch === query.search) return;

    onChange({ ...query, search: debouncedSearch });
    // `query` and `onChange` are deliberately absent: this must fire when the
    // debounced term settles, not every time the parent re-renders with a new
    // query object. Including them would immediately re-commit a stale term.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    <div className={styles.root}>
      <div className={styles.field}>
        <label className={styles.legend} htmlFor={searchId}>
          Search
        </label>
        <input
          id={searchId}
          className={styles.search}
          type="search"
          value={searchDraft}
          placeholder="Scientific or common name"
          autoComplete="off"
          onChange={(event) => {
            setSearchDraft(event.target.value);
          }}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.legend} htmlFor={`${searchId}-family`}>
          Family
        </label>
        <select
          id={`${searchId}-family`}
          className={styles.select}
          value={query.families[0] ?? ''}
          onChange={(event) => {
            const { value } = event.target;

            onChange({ ...query, families: value === '' ? [] : [value] });
          }}
        >
          <option value="">All families</option>
          {families.map((family) => (
            <option key={family} value={family}>
              {family}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className={styles.clear}
        disabled={!isFiltered(query)}
        onClick={() => {
          onChange({ search: '', families: [], sort: query.sort });
        }}
      >
        Clear filters
      </button>
    </div>
  );
}
