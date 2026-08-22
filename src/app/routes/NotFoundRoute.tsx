import { Link } from 'react-router';

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

  return (
    <div className={styles.root}>
      <p className={styles.marginal}>No such accession</p>

      <h1 className={styles.title} tabIndex={-1}>
        Not in this collection
      </h1>

      <p className={styles.body}>
        Nothing is catalogued under that reference. It may have been withdrawn, or the link may have
        been copied incompletely &mdash; catalogue numbers run from TBA-0007 to TBA-0181.
      </p>

      <Link className={styles.action} to="/catalogue">
        Return to the catalogue
      </Link>
    </div>
  );
}
