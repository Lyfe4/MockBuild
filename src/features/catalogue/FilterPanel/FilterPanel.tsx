import { useEffect, useId, useState } from 'react';

import { useDebouncedValue } from '@/hooks';
import { isFiltered, toggleFacetValue, type CatalogueQuery } from '@/lib/catalogue';
import {
  CONSERVATION_STATUS_LABELS,
  CONSERVATION_STATUSES,
  HABITAT_LABELS,
  HABITATS,
  SEASONS,
  type ConservationStatus,
  type Habitat,
  type Season,
} from '@/types';

import styles from './FilterPanel.module.css';

/** How long the search box waits before committing a term to the URL. */
const SEARCH_DEBOUNCE_MS = 150;

const SEASON_LABELS: Record<Season, string> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
};

export interface FilterPanelProps {
  query: CatalogueQuery;
  families: readonly string[];
  onChange: (next: CatalogueQuery) => void;
}

interface CheckboxGroupProps<T extends string> {
  legend: string;
  options: readonly T[];
  labels: Record<T, string>;
  selected: readonly T[];
  onToggle: (value: T) => void;
}

/** One facet, as a fieldset of checkboxes. */
function CheckboxGroup<T extends string>({
  legend,
  options,
  labels,
  selected,
  onToggle,
}: CheckboxGroupProps<T>) {
  const groupId = useId();

  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>

      <div className={styles.options}>
        {options.map((option) => (
          <div key={option} className={styles.checkbox}>
            <input
              type="checkbox"
              id={`${groupId}-${option}`}
              checked={selected.includes(option)}
              onChange={() => {
                onToggle(option);
              }}
            />
            <label htmlFor={`${groupId}-${option}`}>{labels[option]}</label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * The catalogue's margin column.
 *
 * Every control writes through `onChange` to a single `CatalogueQuery`, which
 * the page then puts in the URL. Nothing here holds filter state of its own —
 * with one exception.
 *
 * That exception is the search box. It keeps a local value so typing stays
 * instant, and commits it on a debounce; writing to the URL on every keystroke
 * would push a history entry per character and turn the back button into an
 * undo-by-letter. The local value is re-synchronised whenever the query changes
 * from outside, which is what makes "Clear" and the back button actually empty
 * the box.
 */
export function FilterPanel({ query, families, onChange }: FilterPanelProps) {
  const searchId = useId();
  const [searchDraft, setSearchDraft] = useState(query.search);
  const debouncedSearch = useDebouncedValue(searchDraft, SEARCH_DEBOUNCE_MS);

  /**
   * Outside-in: the URL changed under us — Clear, the back button, a shared
   * link. The draft has to follow, or the box and the results disagree.
   *
   * Adjusted during render rather than in an effect. React's documented pattern
   * for "reset state when a prop changes": the re-render happens before the
   * browser paints, so nobody sees the stale value, where an effect would show
   * it for a frame and cost a second commit.
   */
  const [lastCommitted, setLastCommitted] = useState(query.search);

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
          placeholder="Name, family or number"
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

      <CheckboxGroup<Habitat>
        legend="Habitat"
        options={HABITATS}
        labels={HABITAT_LABELS}
        selected={query.habitats}
        onToggle={(value) => {
          onChange({ ...query, habitats: toggleFacetValue(query.habitats, value) });
        }}
      />

      <CheckboxGroup<Season>
        legend="Season"
        options={SEASONS}
        labels={SEASON_LABELS}
        selected={query.seasons}
        onToggle={(value) => {
          onChange({ ...query, seasons: toggleFacetValue(query.seasons, value) });
        }}
      />

      <CheckboxGroup<ConservationStatus>
        legend="Status"
        options={CONSERVATION_STATUSES}
        labels={CONSERVATION_STATUS_LABELS}
        selected={query.statuses}
        onToggle={(value) => {
          onChange({ ...query, statuses: toggleFacetValue(query.statuses, value) });
        }}
      />

      <button
        type="button"
        className={styles.clear}
        // Disabled rather than hidden: a control that vanishes when it becomes
        // irrelevant makes the panel jump as filters are applied and removed.
        disabled={!isFiltered(query)}
        onClick={() => {
          onChange({
            search: '',
            families: [],
            habitats: [],
            seasons: [],
            statuses: [],
            // The sort order is not a filter, so clearing does not reset it.
            sort: query.sort,
          });
        }}
      >
        Clear filters
      </button>
    </div>
  );
}
