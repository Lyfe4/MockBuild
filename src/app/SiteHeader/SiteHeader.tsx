import { Link } from 'react-router';

import { INSTITUTION } from '@/data';
import { SeasonSwitcher } from '@/features/theme';
import { cx } from '@/lib/classNames';
import pageGrid from '@/styles/pageGrid.module.css';

import { SiteNav } from '../SiteNav';
import styles from './SiteHeader.module.css';

/**
 * The masthead.
 *
 * A wordmark set in Fraunces with the WONK axis engaged — the one place on the
 * site that uses it. WONK swaps in the face's wayward alternates, which is too
 * much personality for running text and exactly right for a name that has to
 * carry an institution.
 *
 * Below it, a catalogue-card subtitle in mono. The header is a ruled block, not
 * a bar: a hairline underneath and nothing else.
 *
 * It is laid out on the page grid — the same one the main column and the
 * colophon take — so the wordmark starts on `content-start`, which is also
 * where the catalogue's filter margin and its first specimen row start, and the
 * navigation ends on `content-end`, which is where the entry column ends. None
 * of those three components knows about the others; they are on the same lines
 * because they are on the same grid.
 */
export function SiteHeader() {
  return (
    <header className={styles.root}>
      <div className={cx(pageGrid.page, styles.inner)}>
        <div className={styles.identity}>
          <Link to="/" className={styles.wordmarkLink}>
            <span className={styles.wordmark}>Thornfield Entomological Archive</span>
          </Link>
          <p className={styles.establishment}>
            Est. {INSTITUTION.founded} &middot; {INSTITUTION.town}
          </p>
        </div>

        <div className={styles.controls}>
          <SiteNav className={styles.nav} />
          <SeasonSwitcher className={styles.season} />
        </div>
      </div>
    </header>
  );
}
