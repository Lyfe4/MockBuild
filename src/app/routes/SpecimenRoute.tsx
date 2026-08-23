import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import { Ledger } from '@/components/Ledger';
import { SpeciesIllustration } from '@/components/SpeciesIllustration';
import { catalogueNumberOf, findPlate, SPECIES } from '@/data';
import { useSeason } from '@/features/theme';
import { useDocumentTitle } from '@/hooks';
import { binomialOf, sortSpecies } from '@/lib/catalogue';
import { cx } from '@/lib/classNames';
import { seasonOfMonth } from '@/lib/season';
import { MONTHS, type Month, type Species } from '@/types';

import { NotFoundRoute } from './NotFoundRoute';
import styles from './SpecimenRoute.module.css';

/**
 * One species: its plate in the margin and its record on the sheet.
 *
 * Ordered by catalogue number for the pager, not by whatever the visitor had
 * the list sorted by when they clicked through. The pager is a property of the
 * collection rather than of the view — a drawer of specimens is in one order
 * however you got to it.
 */
const ORDERED = sortSpecies(SPECIES, 'catalogue', { accessionOf: catalogueNumberOf });

const MONTH_INITIALS: Record<Month, string> = {
  1: 'J',
  2: 'F',
  3: 'M',
  4: 'A',
  5: 'M',
  6: 'J',
  7: 'J',
  8: 'A',
  9: 'S',
  10: 'O',
  11: 'N',
  12: 'D',
};

const MONTH_NAMES: Record<Month, string> = {
  1: 'January',
  2: 'February',
  3: 'March',
  4: 'April',
  5: 'May',
  6: 'June',
  7: 'July',
  8: 'August',
  9: 'September',
  10: 'October',
  11: 'November',
  12: 'December',
};

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
function formatMonths(months: readonly Month[]): string {
  const sorted = [...months].sort((a, b) => a - b);
  const runs: Month[][] = [];

  for (const month of sorted) {
    const last = runs.at(-1);
    const previous = last?.at(-1);

    if (last !== undefined && previous !== undefined && month === previous + 1) last.push(month);
    else runs.push([month]);
  }

  return runs
    .map((run) => {
      const first = run[0];
      const final = run.at(-1);

      if (first === undefined || final === undefined) return '';

      return run.length > 1 ? `${MONTH_NAMES[first]}–${MONTH_NAMES[final]}` : MONTH_NAMES[first];
    })
    .join(', ');
}

interface PhenologyProps {
  months: readonly Month[];
  species: Species;
}

/**
 * Twelve cells, one a month, filled where the adult is on the wing.
 *
 * The months in the record were observed in the northern hemisphere and
 * Thornfield keeps a southern calendar, so the strip marks the months of the
 * *current* season as well — which is the honest way to show the mismatch
 * rather than quietly resolving it. The sentence under the strip says which is
 * which.
 *
 * The strip itself is `aria-hidden`: twelve one-letter cells read aloud are
 * noise, and the same information is in the prose beside it.
 */
function Phenology({ months, species }: PhenologyProps) {
  const { season } = useSeason();
  const active = new Set(months);

  return (
    <div className={styles.phenology}>
      <ol className={styles.calendar} aria-hidden="true">
        {MONTHS.map((month) => (
          <li
            key={month}
            className={cx(
              styles.month,
              active.has(month) && styles.monthActive,
              seasonOfMonth(month) === season && styles.monthInSeason,
            )}
          >
            {MONTH_INITIALS[month]}
          </li>
        ))}
      </ol>
      <p className={styles.phenologyNote}>
        Adults on the wing {formatMonths(months)}. The outlined cells are the months of
        Thornfield&rsquo;s {season}; {binomialOf(species)} was recorded in the northern hemisphere,
        so the two are not the same weather.
      </p>
    </div>
  );
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
      // The plate and its caption are shorter than any window, so this margin
      // is one that can honestly be pinned. The catalogue's filter panel is
      // not, and does not ask for it. See `LedgerProps.sticky`.
      sticky
      margin={
        <figure className={styles.plate}>
          {plate !== undefined && <SpeciesIllustration species={species} plate={plate} />}
          <figcaption className={styles.plateCaption}>
            {plate === undefined
              ? 'No plate drawn for this species yet.'
              : `Traced by hand from ${plate.reference.artist}, ${String(plate.reference.year)}. ${plate.sex === 'unsexed' ? 'Dorsal.' : `${plate.sex[0]?.toUpperCase() ?? ''}${plate.sex.slice(1)}, dorsal.`}`}
          </figcaption>
        </figure>
      }
    >
      <article className={styles.sheet}>
        <header className={styles.header}>
          <p className={styles.accession}>{catalogueNumberOf(species)}</p>
          <h1 className={styles.name} tabIndex={-1}>
            {binomialOf(species)}
          </h1>
          <p className={styles.common}>{species.commonName}</p>
        </header>

        <dl className={styles.label}>
          <LabelRow term="Order">{taxonomy.order}</LabelRow>
          <LabelRow term="Family">{taxonomy.family}</LabelRow>
          <LabelRow term="Genus">
            <i>{taxonomy.genus}</i>
          </LabelRow>
          <LabelRow term="Species">
            <i>{taxonomy.species}</i>
          </LabelRow>
          <LabelRow term="Authority">{taxonomy.authority}</LabelRow>
          <LabelRow term="Common name">{species.commonName}</LabelRow>
          <LabelRow term="Size">
            {species.sizeMm.min}&ndash;{species.sizeMm.max} mm{' '}
            <span className={styles.qualifier}>({species.sizeBasis})</span>
          </LabelRow>
          <LabelRow term="Distribution">{species.distribution}</LabelRow>
          <LabelRow term="Active">
            <Phenology months={species.activeMonths} species={species} />
          </LabelRow>
        </dl>

        <section className={styles.note} aria-labelledby="morphology-heading">
          <h2 className={styles.noteHeading} id="morphology-heading">
            Morphology
          </h2>
          {/*
            The machine-readable characters, shown as they are stored. These are
            what a later identification key will filter on, so a reader looking
            at a plate can see exactly what the archive claims about it.
          */}
          <dl className={styles.characters}>
            <LabelRow term="Wings">{morphology.wingCover}</LabelRow>
            <LabelRow term="Antennae">{morphology.antennae}</LabelRow>
            <LabelRow term="Markings">{morphology.markings}</LabelRow>
            <LabelRow term="Body">{morphology.bodyShape}</LabelRow>
            <LabelRow term="Size class">{morphology.sizeClass}</LabelRow>
            <LabelRow term="Colour">{morphology.colourFamily}</LabelRow>
          </dl>
        </section>

        <section className={styles.note} aria-labelledby="notes-heading">
          <h2 className={styles.noteHeading} id="notes-heading">
            Curator&rsquo;s note
          </h2>
          <p className={styles.noteBody}>{species.notes}</p>
        </section>

        <section className={styles.note} aria-labelledby="sources-heading">
          <h2 className={styles.noteHeading} id="sources-heading">
            Sources
          </h2>
          <p className={styles.noteBody}>
            Every claim on this sheet comes from one of these. The archive is fictional; the animal
            is not.
          </p>
          <ul className={styles.sources} role="list">
            {species.sources.map((source) => (
              <li key={source.url}>
                {/*
                  `rel="noopener noreferrer"` on every outbound link: noopener
                  because a new tab must not get a handle on this window, and
                  noreferrer because which specimen sheet somebody was reading
                  is nobody else's business.
                */}
                <a
                  className={styles.sourceLink}
                  href={source.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {source.title}
                </a>
              </li>
            ))}
            {plate !== undefined && (
              <li>
                <a
                  className={styles.sourceLink}
                  href={plate.reference.source}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {plate.reference.artist}, {plate.reference.title} ({plate.reference.year}) &mdash;
                  the plate&rsquo;s reference
                </a>
              </li>
            )}
          </ul>
        </section>

        {/*
          Through to the request form with this specimen already chosen. The
          form reads `?species=` and ignores an id the collection does not hold,
          so a stale link arrives with nothing selected rather than with the
          wrong animal selected.
        */}
        <p className={styles.request}>
          <Link className={styles.requestLink} to={`/request?species=${species.id}`}>
            Request this specimen
          </Link>
        </p>

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
