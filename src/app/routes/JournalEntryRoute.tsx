import { Link, useParams } from 'react-router';

import { Ledger } from '@/components/Ledger';
import { SpeciesIllustration } from '@/components/SpeciesIllustration';
import { catalogueNumberOf, findJournalEntry, findSpecies, journalNeighbours } from '@/data';
import { findPlate } from '@/data/species/plates';
import { JournalProse } from '@/features/journal';
import { useDocumentTitle } from '@/hooks';
import { binomialOf } from '@/lib/catalogue';
import { cx } from '@/lib/classNames';
import { formatEntryDate } from '@/lib/journal';

import styles from './JournalEntryRoute.module.css';
import { NotFoundRoute } from './NotFoundRoute';

/**
 * One journal entry, in the ledger layout.
 *
 * The margin is the specimen the entry is about: its plate, its accession
 * number and a link to its sheet. One plate and a caption fits any window, so
 * this is a margin that can honestly be pinned — the same call the specimen
 * sheet makes.
 *
 * An entry naming no specimen gets no margin at all rather than an empty one,
 * which is what `Ledger` does with `margin={null}` and why the prop is not a
 * boolean.
 */
export function JournalEntryRoute() {
  const { slug } = useParams<'slug'>();
  const entry = slug === undefined ? undefined : findJournalEntry(slug);

  useDocumentTitle(entry === undefined ? 'Not found' : entry.title);

  // A slug that names no entry is a 404, not an empty page. A journal that
  // silently renders nothing for a dead link is a journal that hides its own
  // parse failures.
  if (entry === undefined) return <NotFoundRoute />;

  const species = entry.speciesId === undefined ? undefined : findSpecies(entry.speciesId);
  const plate = species === undefined ? undefined : findPlate(species.id);
  const { previous, next } = journalNeighbours(entry.slug);

  return (
    <Ledger
      sticky
      margin={
        species === undefined ? null : (
          <figure className={styles.specimen}>
            {plate !== undefined && (
              <Link className={styles.plateLink} to={`/specimen/${species.id}`}>
                <SpeciesIllustration species={species} plate={plate} />
              </Link>
            )}
            <figcaption className={styles.specimenCaption}>
              <span className={styles.accession}>{catalogueNumberOf(species)}</span>
              <Link className={styles.specimenLink} to={`/specimen/${species.id}`}>
                <i>{binomialOf(species)}</i>
              </Link>
              <span className={styles.common}>{species.commonName}</span>
            </figcaption>
          </figure>
        )
      }
    >
      <article className={styles.sheet}>
        <header className={styles.header}>
          <p className={styles.meta}>
            <time dateTime={entry.date}>{formatEntryDate(entry.date)}</time>
            <span aria-hidden="true"> &middot; </span>
            <span>{entry.season}</span>
          </p>
          <h1 className={styles.title} tabIndex={-1}>
            {entry.title}
          </h1>
        </header>

        <JournalProse blocks={entry.blocks} className={styles.prose} />

        {/*
          Previous and next in the list's order — newest first — so "previous"
          is the newer entry. Same shape as the specimen pager, and `rel`
          tells a browser which is which.
        */}
        <nav className={styles.pager} aria-label="Journal">
          {previous === undefined ? (
            <span />
          ) : (
            <Link className={styles.pagerLink} to={`/journal/${previous.slug}`} rel="prev">
              <span className={styles.pagerDirection}>Newer</span>
              <span className={styles.pagerName}>{previous.title}</span>
            </Link>
          )}
          {next === undefined ? (
            <span />
          ) : (
            <Link
              className={cx(styles.pagerLink, styles.pagerNext)}
              to={`/journal/${next.slug}`}
              rel="next"
            >
              <span className={styles.pagerDirection}>Older</span>
              <span className={styles.pagerName}>{next.title}</span>
            </Link>
          )}
        </nav>

        <p className={styles.back}>
          <Link to="/journal">All entries</Link>
        </p>
      </article>
    </Ledger>
  );
}
