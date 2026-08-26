import { Link } from 'react-router';

import { catalogueRange } from '@/data';
import { useDocumentTitle } from '@/hooks';

import styles from './NotFoundRoute.module.css';

/**
 * The 404 page.
 *
 * Written as a note from the archive rather than as an error code, because that
 * is the voice of the rest of the site and because "not in this collection" is
 * the more useful thing to tell someone who followed a stale catalogue link.
 *
 * Rendered in place, without redirecting: the URL that failed stays in the
 * address bar where it can be read and corrected.
 */
export function NotFoundRoute() {
  useDocumentTitle('Not found');

  // Read from the index rather than written into the sentence. This page had a
  // range typed into it that named a prefix the archive stopped using and two
  // numbers it never issued, and nothing on the site could have caught it —
  // the 404 is the one page no visitor is expected to compare with anything.
  const range = catalogueRange();

  return (
    <div className={styles.root}>
      <p className={styles.marginal}>No such accession</p>

      <h1 className={styles.title} tabIndex={-1}>
        Not in this collection
      </h1>

      <p className={styles.body}>
        Nothing is catalogued under that reference. It may have been withdrawn, or the link may have
        been copied incompletely
        {range === undefined ? (
          '.'
        ) : (
          <>
            {' '}
            &mdash; catalogue numbers run from {range[0]} to {range[1]}.
          </>
        )}
      </p>

      <Link className={styles.action} to="/catalogue">
        Return to the catalogue
      </Link>
    </div>
  );
}
