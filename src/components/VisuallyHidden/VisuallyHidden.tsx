import type { ElementType, ReactNode } from 'react';

import { cx } from '@/lib/classNames';

import styles from './VisuallyHidden.module.css';

export interface VisuallyHiddenProps {
  children: ReactNode;
  /**
   * The element to render. Defaults to `span`, which is valid almost anywhere;
   * pass `'div'` inside flow content, or `'li'` inside a list, where a `span`
   * would be invalid markup.
   */
  as?: ElementType;
  /** Appended to the component's own class, not a replacement for it. */
  className?: string;
}

/**
 * Content for screen readers that is not shown on screen.
 *
 * Reach for this when sighted users get the meaning from layout or an icon and
 * assistive technology would otherwise get nothing — a "Search" label on a
 * magnifier button, a table caption, the word "current" on an active nav item.
 *
 * Not a way to hide content from everyone: screen reader users still read it,
 * so it must be accurate and it must not be decorative filler. If nobody needs
 * the text, delete it instead. If everybody does, show it.
 *
 * This is the reference implementation for the component conventions in this
 * repo — folder per component, named export, `interface XProps`, colocated
 * module stylesheet and test.
 */
export function VisuallyHidden({
  children,
  as: Component = 'span',
  className,
}: VisuallyHiddenProps) {
  return <Component className={cx(styles.root, className)}>{children}</Component>;
}
