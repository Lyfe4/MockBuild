import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigation } from 'react-router';

import { cx } from '@/lib/classNames';
import pageGrid from '@/styles/pageGrid.module.css';

import styles from './RootLayout.module.css';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

/**
 * Moves focus to the new page's heading after a route change.
 *
 * A single-page app replaces the content without the browser noticing, so
 * focus stays wherever the reader left it — usually on a link that no longer
 * exists — and a screen reader announces nothing at all. Sending focus to the
 * `h1` is what makes a client-side navigation behave like a real one.
 *
 * The first render is skipped deliberately: on a fresh page load focus is
 * already where the browser put it, and stealing it would jump past the skip
 * link before anyone had a chance to use it.
 */
function useFocusHeadingOnNavigate(): void {
  const { pathname } = useLocation();
  const navigation = useNavigation();

  /**
   * The path the heading was last focused for.
   *
   * Initialised to the current path, which skips the first render for free: on
   * a fresh page load focus is already where the browser put it, and stealing
   * it would jump past the skip link before anyone had a chance to use it.
   */
  const focusedFor = useRef(pathname);

  useEffect(() => {
    /**
     * Wait for the navigation to finish. A lazily-loaded route has not mounted
     * yet while the router is still loading, so firing now would find no
     * heading at all and silently do nothing.
     */
    if (navigation.state !== 'idle') return;

    /**
     * Only when the *path* changed. Filtering the catalogue is also a
     * navigation — it writes the query string — and re-focusing the heading on
     * every keystroke would drag focus out of the search box mid-word.
     */
    if (focusedFor.current === pathname) return;

    focusedFor.current = pathname;

    // Each route renders its own h1 with tabIndex={-1}, which makes it
    // focusable programmatically without adding a tab stop.
    document.querySelector<HTMLElement>('main h1')?.focus();
  }, [pathname, navigation.state]);
}

/**
 * The frame every route renders inside.
 *
 * Landmarks are the point. One `<header>`, one `<main>`, one `<footer>`, and a
 * skip link ahead of all of them — that combination is what lets a screen
 * reader user jump straight to the content and what lets a keyboard user past
 * the navigation without tabbing through it.
 *
 * `#main` is the skip link's target and is focusable via `tabIndex={-1}` so
 * that following the link actually moves focus, not just the scroll position.
 */
export function RootLayout() {
  useFocusHeadingOnNavigate();

  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      <SiteHeader />

      <main id="main" className={styles.main} tabIndex={-1}>
        <div className={cx(pageGrid.page, styles.container)}>
          <Outlet />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
