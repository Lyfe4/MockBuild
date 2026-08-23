import type { ReactNode } from 'react';

import { cx } from '@/lib/classNames';

import styles from './Ledger.module.css';

export interface LedgerProps {
  /**
   * The narrow column: filters, metadata, anything that annotates the body
   * rather than being read straight through.
   *
   * Optional, and `null` means there is no margin at all rather than an empty
   * one — the catalogue moves its filters into the body column on a narrow
   * screen, and an empty margin div would leave a gap above the heading where
   * they used to be.
   */
  margin?: ReactNode;
  /**
   * Whether the margin stays with the reader as the body scrolls past.
   *
   * **The caller's call, because only the caller knows how tall its margin is.**
   * Pinning works for a margin that fits in the window — a plate and its
   * caption — and fails for one that does not: a sticky element taller than the
   * viewport keeps its top at the offset and its foot below the fold, where no
   * amount of scrolling reaches it. That is what the catalogue's filter panel
   * did, and capping it with `overflow-y: auto` only traded an unreachable foot
   * for a scroll container with nothing on screen to say it scrolled.
   *
   * So: off by default, and a sticky margin still caps its height at the window
   * and shows a real scrollbar for the case of a very short window.
   */
  sticky?: boolean | undefined;
  children: ReactNode;
  className?: string | undefined;
}

/**
 * The page's two-column frame, after the ruled ledgers this archive keeps its
 * records in: a narrow margin for annotations, a wide column for the entry.
 *
 * Mobile-first, and the collapse is not merely cosmetic. On a narrow screen the
 * margin becomes a strip *above* the body, which is also its DOM order — so the
 * reading order and the visual order agree at every width, and nothing depends
 * on a `grid-row` reordering that a screen reader would not follow.
 */
export function Ledger({ margin = null, sticky = false, children, className }: LedgerProps) {
  // Not truthiness: `0` and `''` are renderable, and a margin holding either
  // should get its column. Only nothing at all skips it — and `undefined` is
  // already `null` here, by the default above.
  const hasMargin = margin !== null;

  return (
    <div className={cx(styles.root, hasMargin && styles.withMargin, className)}>
      {hasMargin && (
        <div className={cx(styles.margin, sticky && styles.marginSticky)}>{margin}</div>
      )}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
