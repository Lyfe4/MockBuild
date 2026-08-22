import { Link } from 'react-router';

import { SeasonSwitcher } from '@/features/theme';

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
 */
export function SiteHeader() {
  return (
    <header className={styles.root}>
      <div className={styles.inner}>
        <div className={styles.identity}>
          <Link to="/" className={styles.wordmarkLink}>
            <span className={styles.wordmark}>Thornfield Botanical Archive</span>
          </Link>
          <p className={styles.establishment}>Est. 1887 &middot; Armidale</p>
        </div>

        <div className={styles.controls}>
          <SiteNav className={styles.nav} />
          <SeasonSwitcher className={styles.season} />
        </div>
      </div>
    </header>
  );
}
