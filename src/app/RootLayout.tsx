import { Outlet } from 'react-router';

import styles from './RootLayout.module.css';

/**
 * The frame every route renders inside.
 *
 * Landmarks are the point of this component. One `<header>`, one `<main>`, one
 * `<footer>`, and a skip link ahead of all of them — that combination is what
 * lets a screen reader user jump straight to the content and what lets a
 * keyboard user past the navigation without tabbing through it.
 *
 * `#main` is the skip link's target and is focusable via `tabIndex={-1}` so that
 * following the link actually moves focus, not just the scroll position. It is
 * not reachable by Tab.
 *
 * Header and footer are intentionally near-empty: navigation, the season picker
 * and the archive's colophon land here later.
 */
export function RootLayout() {
  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      <header className={styles.header}>
        <div className={styles.container}>
          <p className={styles.wordmark}>Thornfield Botanical Archive</p>
        </div>
      </header>

      <main id="main" className={styles.main} tabIndex={-1}>
        <div className={styles.container}>
          <Outlet />
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <p>A fictional institution, built as a portfolio piece.</p>
        </div>
      </footer>
    </div>
  );
}
