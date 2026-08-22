import type { ReactNode } from 'react';

import { cx } from '@/lib/classNames';

import styles from './Ledger.module.css';

export interface LedgerProps {
  /**
   * The narrow column: filters, metadata, anything that annotates the body
   * rather than being read straight through.
   */
  margin: ReactNode;
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
export function Ledger({ margin, children, className }: LedgerProps) {
  return (
    <div className={cx(styles.root, className)}>
      <div className={styles.margin}>{margin}</div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
