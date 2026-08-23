import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import { Ledger } from '@/components/Ledger';
import { SpeciesIllustration } from '@/components/SpeciesIllustration';
import { findPlate, SPECIES } from '@/data';
import { useDocumentTitle } from '@/hooks';
import { binomialOf, sortSpecies } from '@/lib/catalogue';
import { cx } from '@/lib/classNames';
import type { Species } from '@/types';

import { NotFoundRoute } from './NotFoundRoute';
import styles from './SpecimenRoute.module.css';

/**
 * One species: its plate in the margin and its record on the sheet.
 *
 * Ordered by catalogue number for the pager, not by whatever the visitor had
 * the list sorted by when they clicked through. The pager is a property of the
 * collection, not of the view — a drawer of specimens is in one order however
 * you got to it.
 */
const ORDERED = sortSpecies(SPECIES, 'catalogue');

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

interface LabelRowProps {
  term: string;
  children: ReactNode;
}

function LabelRow({ term, children }: LabelRowProps) {
  return (
    <div className={styles.labelRow}>
      <dt className={styles.term}>{term}</dt>
      <dd className={styles.value}>{children}</dd>
    </div>
  );
}

/** `May–August`, or `May, July` where the months do not run together. */
function formatMonths(months: readonly number[]): string {
  const sorted = [...months].sort((a, b) => a - b);
  const name = (month: number): string => MONTH_NAMES[month - 1] ?? String(month);
  const runs: number[][] = [];

  for (const month of sorted) {
    const last = runs.at(-1);

    if (last !== undefined && month === (last.at(-1) ?? 0) + 1) last.push(month);
    else runs.push([month]);
  }

  return runs
    .map((run) => {
      const first = run[0] ?? 0;
      const final = run.at(-1) ?? 0;

      return run.length > 1 ? `${name(first)}–${name(final)}` : name(first);
    })
    .join(', ');
}

export function SpecimenRoute() {
  const { id } = useParams<'id'>();
  const index = ORDERED.findIndex((candidate) => candidate.id === id);
  const species: Species | undefined = ORDERED[index];

  useDocumentTitle(species === undefined ? 'Not found' : binomialOf(species));

  if (species === undefined) return <NotFoundRoute />;

  const plate = findPlate(species.id);
  const previous = ORDERED[index - 1];
  const next = ORDERED[index + 1];
  const { taxonomy, morphology } = species;

  return (
    <Ledger
      margin={
        <figure className={styles.plate}>
          {plate !== undefined && <SpeciesIllustration species={species} plate={plate} />}
          <figcaption className={styles.plateCaption}>
            {plate === undefined
              ? 'No plate drawn for this species yet.'
              : `${plate.reference.artist}, ${String(plate.reference.year)}. Traced from a public-domain reference.`}
          </figcaption>
        </figure>
      }
    >
      <article className={styles.sheet}>
        <header className={styles.header}>
          <p className={styles.accession}>{species.id}</p>
          <h1 className={styles.name} tabIndex={-1}>
            {binomialOf(species)}
          </h1>
          <p className={styles.common}>{species.commonName}</p>
        </header>

        <dl className={styles.label}>
          <LabelRow term="Order">{taxonomy.order}</LabelRow>
          <LabelRow term="Family">{taxonomy.family}</LabelRow>
          <LabelRow term="Authority">{taxonomy.authority}</LabelRow>
          <LabelRow term="Size">
            {species.sizeMm.min}&ndash;{species.sizeMm.max} mm
          </LabelRow>
          <LabelRow term="Distribution">{species.distribution}</LabelRow>
          <LabelRow term="Active">{formatMonths(species.activeMonths)}</LabelRow>
          <LabelRow term="Wings">{morphology.wingCover}</LabelRow>
          <LabelRow term="Antennae">{morphology.antennae}</LabelRow>
          <LabelRow term="Markings">{morphology.markings}</LabelRow>
        </dl>

        <section className={styles.note}>
          <h2 className={styles.noteHeading}>Curator&rsquo;s note</h2>
          <p className={styles.noteBody}>{species.notes}</p>
        </section>

        <nav className={styles.pager} aria-label="Catalogue">
          {previous === undefined ? (
            <span />
          ) : (
            <Link className={styles.pagerLink} to={`/specimen/${previous.id}`} rel="prev">
              <span className={styles.pagerDirection}>Previous</span>
              <span className={styles.pagerName}>{binomialOf(previous)}</span>
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
              <span className={styles.pagerName}>{binomialOf(next)}</span>
            </Link>
          )}
        </nav>
      </article>
    </Ledger>
  );
}
