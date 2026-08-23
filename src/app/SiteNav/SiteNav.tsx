import { useEffect, useId, useRef, useState } from 'react';
import { NavLink } from 'react-router';

import { useMediaQuery } from '@/hooks';
import { cx } from '@/lib/classNames';

import styles from './SiteNav.module.css';

interface NavItem {
  readonly to: string;
  readonly label: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/catalogue', label: 'Catalogue' },
  // Next to the catalogue, because it is the other way in to the same eight
  // specimens: browse them, or key one out.
  { to: '/key', label: 'Identify' },
  { to: '/about', label: 'About' },
  { to: '/journal', label: 'Journal' },
  { to: '/request', label: 'Request' },
];

/** Matches the breakpoint in SiteNav.module.css where the menu becomes a list. */
const WIDE = '(min-width: 48rem)';

export interface SiteNavProps {
  className?: string | undefined;
}

/**
 * Primary navigation.
 *
 * One list, two presentations. On a narrow screen it is a disclosure: a button
 * that owns `aria-expanded` and `aria-controls`, and a panel that is genuinely
 * removed from the page when closed rather than merely moved off-screen — a
 * hidden menu that still takes tab stops is worse than no menu.
 *
 * Above the breakpoint the panel is always open and the button is gone, so the
 * nav is a plain horizontal list with no JavaScript involved in showing it.
 *
 * The toggle is drawn as three rules in an inline SVG. An icon font or an icon
 * package for three lines would be a dependency, a download and a licence, and
 * the shape has not changed since 1981.
 */
export function SiteNav({ className }: SiteNavProps) {
  const [open, setOpen] = useState(false);
  const isWide = useMediaQuery(WIDE);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  /**
   * Escape closes the menu and returns focus to the button that opened it.
   *
   * Without the focus return, dismissing the menu would drop the caret back to
   * the top of the document and a keyboard user would have to tab in again.
   */
  useEffect(() => {
    if (!open || isWide) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;

      setOpen(false);
      toggleRef.current?.focus();
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, isWide]);

  return (
    <nav className={cx(styles.root, className)} aria-label="Primary">
      <button
        ref={toggleRef}
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((wasOpen) => !wasOpen);
        }}
      >
        <svg className={styles.rules} viewBox="0 0 24 16" aria-hidden="true" focusable="false">
          <path d="M0 1.5h24M0 8h24M0 14.5h24" />
        </svg>
        Menu
      </button>

      {/*
        Above the breakpoint the panel is genuinely open, not hidden-and-
        overridden: `hidden` governs the accessibility tree, so CSS cannot
        honestly undo it. The toggle is display:none there, which removes it
        from the tree too.
      */}
      <div id={panelId} className={styles.panel} hidden={!isWide && !open}>
        <ul className={styles.list} role="list">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => cx(styles.link, isActive && styles.linkActive)}
                /*
                 * Closing on activation rather than on a location change.
                 * Following a link is the only way out of this menu that would
                 * otherwise leave it open, and the link already knows it was
                 * activated — watching the pathname instead meant a setState
                 * inside an effect, and a cascading render, to learn something
                 * we are told directly here. Keyboard activation fires this too.
                 */
                onClick={() => {
                  setOpen(false);
                }}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
