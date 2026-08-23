import { useEffect, useId, useRef, useState } from 'react';

import { activeFilterCount, type CatalogueQuery } from '@/lib/catalogue';

import { FilterPanel } from '../FilterPanel';
import styles from './FilterDisclosure.module.css';

/** The panel's own props, passed straight through. See `FilterPanelProps`. */
export interface FilterDisclosureProps {
  query: CatalogueQuery;
  /** Every taxonomic order the collection holds. */
  orders: readonly string[];
  /** Families inside the chosen orders, or all of them if none is chosen. */
  families: readonly string[];
  onChange: (next: CatalogueQuery) => void;
}

/**
 * The filter panel, folded behind a button. **Narrow screens only.**
 *
 * On a phone the panel is about nine hundred pixels of form, and it sat between
 * the heading and the list — so the catalogue opened on a page of controls with
 * the collection somewhere below the fold. A visitor who arrives to look at
 * insects should see one without scrolling, so the whole panel goes behind a
 * disclosure and the button carries the count of what is currently applied. The
 * count is the point: a collapsed panel that is silently filtering the list is
 * worse than an open one.
 *
 * The panel is genuinely `hidden` when closed rather than moved off-screen —
 * `hidden` governs the accessibility tree, and a folded-away form that still
 * takes fifteen tab stops is the version of this that helps nobody.
 *
 * Above the ledger's breakpoint this component is not rendered at all: the
 * panel goes back into the margin column, where it is always open and no
 * JavaScript is involved in showing it. Two presentations, one at a time —
 * rendering both and hiding one with CSS would put two search boxes with the
 * same label in the page.
 */
export function FilterDisclosure({ query, orders, families, onChange }: FilterDisclosureProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const count = activeFilterCount(query);

  /**
   * Opening moves focus into the panel.
   *
   * The panel itself rather than the search box inside it: landing on a text
   * input raises the on-screen keyboard, and the first thing a phone visitor
   * wanted was to see the list of facets, not to type. From here Tab reaches
   * every control in order.
   *
   * In an effect because the panel is still `hidden` at the moment the click
   * handler runs, and `focus()` on a hidden element does nothing.
   */
  useEffect(() => {
    if (!open) return;

    panelRef.current?.focus();
  }, [open]);

  /** Escape closes it and hands focus back to the button that opened it. */
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;

      setOpen(false);
      toggleRef.current?.focus();
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.root}>
      <button
        ref={toggleRef}
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={panelId}
        /*
         * Named rather than left to the concatenation of "Filters", a decorative
         * middot and a bare numeral, which announces as "Filters 3" — three
         * what. The label opens with the visible word, so the visible name is
         * still contained in the accessible one and a voice-control user can
         * still say "Filters".
         */
        aria-label={count === 0 ? undefined : `Filters, ${String(count)} applied`}
        onClick={() => {
          setOpen((wasOpen) => !wasOpen);
        }}
      >
        Filters
        {count > 0 && (
          <span className={styles.count}>
            <span aria-hidden="true"> · </span>
            {count}
          </span>
        )}
      </button>

      {/*
        `tabIndex={-1}` so the panel can take focus when it opens without
        becoming a tab stop of its own afterwards.
      */}
      <div
        ref={panelRef}
        id={panelId}
        className={styles.panel}
        hidden={!open}
        tabIndex={-1}
        role="group"
        aria-label="Filters"
      >
        <FilterPanel query={query} orders={orders} families={families} onChange={onChange} />
      </div>
    </div>
  );
}
