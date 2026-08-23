import { Link } from 'react-router';

import { JOURNAL_ENTRIES } from '@/data';
import { useSeason } from '@/features/theme';
import { useDocumentTitle } from '@/hooks';
import { cx } from '@/lib/classNames';
import { formatEntryDate } from '@/lib/journal';

import styles from './JournalRoute.module.css';

/**
 * The journal index: every entry, newest first.
 *
 * No margin column, so no `Ledger`. The index is a list of five things and a
 * paragraph saying what they are — a margin here would be furniture around
 * furniture.
 *
 * Each row is date, season and title, and the season tag is the entry's own
 * word rather than one derived at render time. The dates are Thornfield's, so
 * an entry written in June is a winter entry; the intro says so, because a
 * northern reader will otherwise read the tags as wrong.
 *
 * A tag matching the season the site is currently dressed in is inked in the
 * palette's accent — the same tie to the theme engine the calendar's month
 * headers have, and the only thing on this page that changes when the season
 * does.
 */
export function JournalRoute() {
  const { season } = useSeason();

  useDocumentTitle('Field journal');

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Field journal</p>
        <h1 className={styles.title} tabIndex={-1}>
          From the reading room
        </h1>
        <p className={styles.standfirst}>
          Notes on the drawings as they are made: what a reference will and will not give, what a
          check caught, and which animal cost the most argument. Dated in Thornfield&rsquo;s
          southern seasons, so a June entry is a winter one.
        </p>
      </header>

      {/*
        A `ul`, not an `ol`. The list is in date order, but the position is not
        content — nobody refers to the third entry — and an ordered list would
        have a screen reader count them out. `role="list"` is restated because
        `list-style: none` removes list semantics in Safari.
      */}
      <ul className={styles.entries} role="list">
        {JOURNAL_ENTRIES.map((entry) => (
          <li key={entry.slug} className={styles.entry}>
            <p className={styles.meta}>
              {/*
                A `<time>` with the machine-readable date in `dateTime` and the
                archive's own formatting as its text. The two say the same day,
                which is the entire reason the attribute exists.
              */}
              <time className={styles.date} dateTime={entry.date}>
                {formatEntryDate(entry.date)}
              </time>
              <span className={cx(styles.season, entry.season === season && styles.seasonCurrent)}>
                {entry.season}
              </span>
            </p>
            <h2 className={styles.entryTitle}>
              <Link className={styles.entryLink} to={`/journal/${entry.slug}`}>
                {entry.title}
              </Link>
            </h2>
            <p className={styles.lede}>{entry.lede}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
