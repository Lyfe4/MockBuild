import { useId } from 'react';

import { SpeciesIllustration } from '@/components/SpeciesIllustration';
import { findPlate, SPECIES } from '@/data';
import { useSeason } from '@/features/theme';
import { useDocumentTitle } from '@/hooks';
import { binomialOf } from '@/lib/catalogue';
import { describePlate, validatePlate, type SpeciesPlate } from '@/lib/plate';
import type { Species } from '@/types';

import styles from './PlateLabRoute.module.css';

/**
 * TEMPORARY — the plate contact sheet.
 *
 * One question, asked of every plate in the collection: does it hold together
 * at thumbnail, at card size and at full size? Three sizes because the failure
 * modes are different at each. At 80 pixels only the silhouette survives, and
 * two beetles that look alike there are two beetles nobody can tell apart in a
 * list. At 240 the line hierarchy starts to matter. At 600 every stroke of
 * hatching is visible and the drawing is either confident or it is fussy.
 *
 * The validator's verdict is printed on the page as well as asserted in the
 * tests, so a broken plate is visibly broken here rather than quietly wrong.
 *
 * Dev-only. See `app/router.tsx` — the route is behind `import.meta.env.DEV`
 * inside a dynamic `import()`, which matters because this page displays the
 * traced references, and those must never ship.
 */

/** The three sizes, in pixels, that each plate is judged at. */
const SIZES = [
  { label: 'Thumbnail', px: 80 },
  { label: 'Card', px: 240 },
  { label: 'Plate', px: 600 },
] as const;

/** Every species that has a plate drawn for it, in catalogue order. */
function drawn(): { species: Species; plate: SpeciesPlate }[] {
  return SPECIES.flatMap((species) => {
    const plate = findPlate(species.id);

    return plate === undefined ? [] : [{ species, plate }];
  });
}

/** The file the plate was traced from, served from `references/` at dev time. */
function referenceSrc(id: string): string {
  return `/references/${id}.jpg`;
}

interface ColumnProps {
  species: Species;
  plate: SpeciesPlate;
}

function Column({ species, plate }: ColumnProps) {
  const headingId = useId();
  const problems = validatePlate(plate);
  const name = binomialOf(species);

  return (
    <section className={styles.column} aria-labelledby={headingId}>
      <h2 className={styles.columnTitle} id={headingId}>
        {name}
      </h2>
      <p className={styles.note}>
        {species.commonName}. {species.taxonomy.order}, {species.taxonomy.family}. {plate.sex},
        dorsal.
      </p>

      <p className={problems.length === 0 ? styles.valid : styles.invalid}>
        {problems.length === 0
          ? `validatePlate: clean — ${String(plate.parts.length)} paths, no errors`
          : `validatePlate: ${String(problems.length)} problem(s)`}
      </p>

      {problems.length > 0 && (
        <ul className={styles.problems}>
          {problems.map((problem, index) => (
            <li key={index}>
              <code>{problem.code}</code> {problem.message}
            </li>
          ))}
        </ul>
      )}

      <div className={styles.stack}>
        {SIZES.map((size) => (
          <figure key={size.label} className={styles.cell}>
            {/*
              The frame is sized in pixels rather than as a fraction of the
              column, because the whole comparison is about absolute size: a
              drawing that only works at 600 pixels has to be seen failing at
              80, and a responsive frame would hide that behind the viewport.
            */}
            <div className={styles[`frame${String(size.px)}`]}>
              <SpeciesIllustration
                species={species}
                plate={plate}
                title={`${name} at ${String(size.px)} pixels`}
              />
            </div>
            <figcaption className={styles.caption}>
              {size.label} · {size.px}px
            </figcaption>
          </figure>
        ))}
      </div>

      <blockquote className={styles.quote}>
        {describePlate(species, {
          sex: plate.sex,
          ...(plate.hallmark === undefined ? {} : { hallmark: plate.hallmark }),
        })}
      </blockquote>
    </section>
  );
}

export function PlateLabRoute() {
  const { season } = useSeason();
  const plates = drawn();

  useDocumentTitle('Plate lab');

  return (
    <section>
      <h1 tabIndex={-1}>Plate lab</h1>

      <p className={styles.intro}>
        Every hand-authored plate in the collection, at three sizes, in the current season ({season}
        ), with the alt text each is given and the reference each was traced from. {
          plates.length
        }{' '}
        plates, {plates.reduce((total, entry) => total + entry.plate.parts.length, 0)} paths between
        them.
      </p>

      <div className={styles.columns}>
        {plates.map((entry) => (
          <Column key={entry.species.id} species={entry.species} plate={entry.plate} />
        ))}
      </div>

      <section className={styles.reference} aria-labelledby="reference-heading">
        <h2 className={styles.columnTitle} id="reference-heading">
          The references
        </h2>
        <p className={styles.note}>
          Served from <code>references/</code> rather than <code>public/</code>, so they are never
          bundled. Vite serves them from the project root at dev time and the build never sees them,
          because the build never sees this route.
        </p>

        <ul className={styles.referenceList} role="list">
          {plates.map(({ species, plate }) => (
            <li key={species.id} className={styles.referenceItem}>
              <img
                className={styles.referenceImage}
                src={referenceSrc(species.id)}
                alt={`The reference the ${binomialOf(species)} plate was traced from.`}
                loading="lazy"
              />
              <p className={styles.credit}>
                {plate.reference.artist}, <cite>{plate.reference.title}</cite>,{' '}
                {String(plate.reference.year)}. {plate.reference.licence}.{' '}
                <a href={plate.reference.source} rel="noopener noreferrer">
                  Source
                </a>
              </p>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
