import { useEffect, useId, useState } from 'react';

import { useDebouncedValue } from '@/hooks';
import { clearFilters, isFiltered, toggleFacetValue, type CatalogueQuery } from '@/lib/catalogue';
import {
  MARKING_FORMS,
  SEASONS,
  SIZE_CLASSES,
  type MarkingForm,
  type Season,
  type SizeClass,
} from '@/types';

import styles from './FilterPanel.module.css';

/**
 * The catalogue's margin: everything that narrows the list.
 *
 * The search box is the one control that does not commit on every change. A
 * keystroke rewrites the URL, and rewriting it thirty times a second would fill
 * the history and re-filter the list on every letter, so the draft is local
 * state and the committed value is debounced.
 *
 * Order is checkboxes and family is a select, and the difference is not
 * cosmetic: there are three or four orders and a reader wants two of them at
 * once, where families are numerous and asking for two unrelated ones at once
 * is not a question anybody has. The family list is narrowed to the chosen
 * orders by the caller, which is why it arrives as a prop rather than being
 * derived here.
 */
const SEARCH_DEBOUNCE_MS = 150;

const SEASON_LABELS: Record<Season, string> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
};

const MARKING_LABELS: Record<MarkingForm, string> = {
  none: 'Unmarked',
  spots: 'Spotted',
  bands: 'Banded',
  stripes: 'Striped',
  eyespots: 'Eyespots',
};

const SIZE_LABELS: Record<SizeClass, string> = {
  tiny: 'Tiny, under 5 mm',
  small: 'Small, 5 to 15 mm',
  medium: 'Medium, 15 to 30 mm',
  large: 'Large, over 30 mm',
};

export interface FilterPanelProps {
  query: CatalogueQuery;
  /** Every taxonomic order the collection holds. */
  orders: readonly string[];
  /** Families inside the chosen orders, or all of them if none is chosen. */
  families: readonly string[];
  onChange: (next: CatalogueQuery) => void;
}

interface CheckboxGroupProps<T extends string> {
  legend: string;
  hint?: string;
  options: readonly T[];
  labels: Record<T, string>;
  selected: readonly T[];
  onToggle: (value: T) => void;
}

function CheckboxGroup<T extends string>({
  legend,
  hint,
  options,
  labels,
  selected,
  onToggle,
}: CheckboxGroupProps<T>) {
  const groupId = useId();

  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      {hint !== undefined && <p className={styles.hint}>{hint}</p>}
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

export function FilterPanel({ query, orders, families, onChange }: FilterPanelProps) {
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

  const orderLabels = Object.fromEntries(orders.map((order) => [order, order])) as Record<
    string,
    string
  >;

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

      <CheckboxGroup<string>
        legend="Order"
        options={orders}
        labels={orderLabels}
        selected={query.orders}
        onToggle={(value) => {
          const orders_ = toggleFacetValue(query.orders, value);

          // A family outside the chosen orders can only ever return nothing, so
          // it goes when the order that offered it does. Without this the panel
          // shows a family the select no longer lists and the list is empty for
          // a reason nothing on screen explains.
          onChange({ ...query, orders: orders_, families: [] });
        }}
      />

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
          <option value="">
            {query.orders.length === 0 ? 'All families' : 'All families in these orders'}
          </option>
          {families.map((family) => (
            <option key={family} value={family}>
              {family}
            </option>
          ))}
        </select>
      </div>

      <CheckboxGroup<MarkingForm>
        legend="Markings"
        options={MARKING_FORMS}
        labels={MARKING_LABELS}
        selected={query.markings}
        onToggle={(value) => {
          onChange({ ...query, markings: toggleFacetValue(query.markings, value) });
        }}
      />

      <CheckboxGroup<SizeClass>
        legend="Size"
        options={SIZE_CLASSES}
        labels={SIZE_LABELS}
        selected={query.sizes}
        onToggle={(value) => {
          onChange({ ...query, sizes: toggleFacetValue(query.sizes, value) });
        }}
      />

      <CheckboxGroup<Season>
        legend="On the wing"
        // Said plainly, because it would otherwise read as a claim about the
        // animals: most species here were recorded in the northern hemisphere
        // and Thornfield keeps a southern calendar, so the facet relabels their
        // months rather than describing their weather. The hint is worded to be
        // true of both halves of the collection — the two Australian scarabs
        // were recorded in these seasons — which is why it names the seasons as
        // Thornfield's rather than calling the records northern.
        hint="Months of adult activity, read against Thornfield’s southern seasons."
        options={SEASONS}
        labels={SEASON_LABELS}
        selected={query.seasons}
        onToggle={(value) => {
          onChange({ ...query, seasons: toggleFacetValue(query.seasons, value) });
        }}
      />

      <button
        type="button"
        className={styles.clear}
        disabled={!isFiltered(query)}
        onClick={() => {
          onChange(clearFilters(query));
        }}
      >
        Clear filters
      </button>
    </div>
  );
}
