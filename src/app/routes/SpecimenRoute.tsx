import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import { Ledger } from '@/components/Ledger';
import { PlantIllustration } from '@/components/PlantIllustration';
import { SPECIMENS } from '@/data';
import { useDocumentTitle } from '@/hooks';
import { sortSpecimens } from '@/lib/catalogue';
import { cx } from '@/lib/classNames';
import { CONSERVATION_STATUS_LABELS, HABITAT_LABELS, type Specimen } from '@/types';

import { NotFoundRoute } from './NotFoundRoute';
import styles from './SpecimenRoute.module.css';

/** Catalogue order, so prev/next follow the accession sequence. */
const ORDERED = sortSpecimens(SPECIMENS, 'catalogue');

const SEASON_LABELS: Record<string, string> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
};

interface LabelRowProps {
  term: string;
  children: ReactNode;
}

/** One line of the herbarium label: term in the margin, value in the column. */
function LabelRow({ term, children }: LabelRowProps) {
  return (
    <div className={styles.labelRow}>
      <dt className={styles.term}>{term}</dt>
      <dd className={styles.value}>{children}</dd>
    </div>
  );
}

function formatCollectedOn(iso: string): string {
  // Parsed as UTC and formatted in UTC, so the date on the label is the date
  // that was written on it regardless of where it is being read.
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * One specimen sheet.
 *
 * The metadata is a description list laid out as a ruled ledger — term in the
 * margin, value in the column — because that is what it is: a label transcribed
 * from a sheet, not a set of statistics.
 *
 * An unknown catalogue number renders the 404 page rather than redirecting.
 * The URL stays put so a mistyped or stale link can be seen and corrected.
 */
export function SpecimenRoute() {
  const { id } = useParams<'id'>();
  const index = ORDERED.findIndex((candidate) => candidate.id === id);
  const specimen: Specimen | undefined = ORDERED[index];

  useDocumentTitle(specimen?.scientificName ?? 'Not found');

  if (specimen === undefined) return <NotFoundRoute />;

  const previous = ORDERED[index - 1];
  const next = ORDERED[index + 1];

  return (
    <Ledger
      margin={
        <figure className={styles.plate}>
          <PlantIllustration specimen={specimen} />
          <figcaption className={styles.plateCaption}>
            Illustration generated from this record&rsquo;s form parameters.
          </figcaption>
        </figure>
      }
    >
      <article className={styles.sheet}>
        <header className={styles.header}>
          <p className={styles.accession}>{specimen.id}</p>
          <h1 className={styles.name} tabIndex={-1}>
            {specimen.scientificName}
          </h1>
          <p className={styles.common}>{specimen.commonName}</p>
        </header>

        <dl className={styles.label}>
          <LabelRow term="Family">{specimen.family}</LabelRow>
          <LabelRow term="Habitat">{HABITAT_LABELS[specimen.habitat]}</LabelRow>
          <LabelRow term="Season">
            {specimen.seasons.map((season) => SEASON_LABELS[season] ?? season).join(', ')}
          </LabelRow>
          <LabelRow term="Status">
            {CONSERVATION_STATUS_LABELS[specimen.conservationStatus]}
            <span className={styles.code}> ({specimen.conservationStatus})</span>
          </LabelRow>
          <LabelRow term="Collected">
            <time dateTime={specimen.collectedOn}>{formatCollectedOn(specimen.collectedOn)}</time>
          </LabelRow>
          <LabelRow term="Collector">{specimen.collectedBy}</LabelRow>
          <LabelRow term="Locality">{specimen.region}</LabelRow>
        </dl>

        <section className={styles.note}>
          <h2 className={styles.noteHeading}>Curator&rsquo;s note</h2>
          <p className={styles.noteBody}>{specimen.notes}</p>
        </section>

        <nav className={styles.pager} aria-label="Catalogue">
          {previous === undefined ? (
            <span />
          ) : (
            <Link className={styles.pagerLink} to={`/specimen/${previous.id}`} rel="prev">
              <span className={styles.pagerDirection}>Previous</span>
              <span className={styles.pagerName}>{previous.scientificName}</span>
            </Link>
          )}

          {next === undefined ? (
            <span />
          ) : (
            <Link
              className={cx(styles.pagerLink, styles.pagerNext)}
              to={`/specimen/${next.id}`}
              rel="next"
            >
              <span className={styles.pagerDirection}>Next</span>
              <span className={styles.pagerName}>{next.scientificName}</span>
            </Link>
          )}
        </nav>
      </article>
    </Ledger>
  );
}
