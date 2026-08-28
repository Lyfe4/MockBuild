import { Link } from 'react-router';

import { INSTITUTION } from '@/data';
import { SeasonDial } from '@/features/theme';
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
 * control strip ends on `content-end`, which is where the entry column ends.
 * None of those components knows about the others; they are on the same lines
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

        {/*
          The navigation and the dial on one line, the dial last, so its
          quadrants sit on `content-end` and the whole block reads as one
          control strip rather than two rows of words. On a phone the same line
          is the menu button at one end and, at the other, the season's name
          with the dial after it — see `.controls` for why the name is what
          makes that a header bar rather than a button and a stray circle.
        */}
        <div className={styles.controls}>
          <SiteNav />
          <SeasonDial />
        </div>
      </div>
    </header>
  );
}
