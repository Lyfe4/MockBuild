import { useId } from 'react';

import { InsectIllustration } from '@/components/InsectIllustration';
import { SpeciesIllustration } from '@/components/SpeciesIllustration';
import { LUCANUS_CERVUS, LUCANUS_CERVUS_PLATE } from '@/data/species';
import { useSeason } from '@/features/theme';
import { useDocumentTitle } from '@/hooks';
import { BEETLE_PRESETS, resolveBeetlePreset, seedFromName, type InsectForm } from '@/lib/insect';
import { describePlate, validatePlate } from '@/lib/plate';

import styles from './PlateLabRoute.module.css';

/**
 * TEMPORARY — the plate spike's contact sheet.
 *
 * One question, asked three times over: does a hand-authored plate of a real
 * species beat the generator at thumbnail, at card size and at full size? The
 * two are shown at the same three sizes, in the same season, with the reference
 * the plate was traced from at the bottom.
 *
 * Three sizes because the failure modes are different at each. At 80 pixels
 * only the silhouette survives, and the generator's beetles were hard to tell
 * apart there. At 240 the line hierarchy starts to matter. At 600 every stroke
 * of hatching is visible and the drawing is either confident or it is fussy.
 *
 * Dev-only, like `/lab` and `/lab/insects`. See `app/router.tsx`. Delete this,
 * its stylesheet and both generator lab routes when the plates replace them.
 */

/** The three sizes, in pixels, that the comparison is made at. */
const SIZES = [
  { label: 'Thumbnail', px: 80 },
  { label: 'Card', px: 240 },
  { label: 'Plate', px: 600 },
] as const;

/** The generator's nearest thing to a stag beetle, for the comparison. */
const STAG_PRESET = BEETLE_PRESETS.find((preset) => /stag/i.test(preset.name));

function generatorStag(): { insect: InsectForm; seed: number; note: string } | undefined {
  if (STAG_PRESET === undefined) return undefined;

  const seed = seedFromName(`${STAG_PRESET.name}-alpha`);

  return {
    insect: { order: 'coleoptera', form: resolveBeetlePreset(STAG_PRESET, seed) },
    seed,
    note: STAG_PRESET.note,
  };
}

interface ColumnProps {
  heading: string;
  note: string;
  children: (size: (typeof SIZES)[number]) => React.ReactNode;
}

function Column({ heading, note, children }: ColumnProps) {
  const headingId = useId();

  return (
    <section className={styles.column} aria-labelledby={headingId}>
      <h2 className={styles.columnTitle} id={headingId}>
        {heading}
      </h2>
      <p className={styles.note}>{note}</p>

      <div className={styles.stack}>
        {SIZES.map((size) => (
          <figure key={size.label} className={styles.cell}>
            {/*
              The frame is sized in pixels rather than as a fraction of the
              column, because the whole comparison is about absolute size: a
              drawing that only works at 600 pixels has to be seen failing at
              80, and a responsive frame would hide that behind the viewport.
            */}
            <div className={styles[`frame${String(size.px)}`]}>{children(size)}</div>
            <figcaption className={styles.caption}>
              {size.label} · {size.px}px
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function PlateLabRoute() {
  const { season } = useSeason();

  useDocumentTitle('Plate lab');

  const problems = validatePlate(LUCANUS_CERVUS_PLATE);
  const generator = generatorStag();
  const plateParts = LUCANUS_CERVUS_PLATE.parts.length;

  return (
    <section>
      <h1 tabIndex={-1}>Plate lab</h1>

      <p className={styles.intro}>
        One hand-authored plate against the generator&rsquo;s nearest preset, at three sizes, in the
        current season ({season}). The plate is <strong>{plateParts} paths</strong>, traced from the
        reference at the bottom of the page. The question is whether the plate is worth the
        authoring cost the generator did not have — and whether it is still recognisable at 80
        pixels, where the generated beetles were not.
      </p>

      {/*
        The validator's verdict, on the page rather than only in the test run.
        A plate that fails should be visibly broken here, not quietly wrong.
      */}
      <p className={problems.length === 0 ? styles.valid : styles.invalid}>
        {problems.length === 0
          ? `validatePlate: clean — ${String(plateParts)} paths, no errors`
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

      <div className={styles.columns}>
        <Column
          heading="Hand-authored plate"
          note={`${LUCANUS_CERVUS.taxonomy.genus} ${LUCANUS_CERVUS.taxonomy.species} ${LUCANUS_CERVUS.taxonomy.authority}, male, dorsal.`}
        >
          {(size) => (
            <SpeciesIllustration
              species={LUCANUS_CERVUS}
              plate={LUCANUS_CERVUS_PLATE}
              title={`Lucanus cervus at ${String(size.px)} pixels`}
            />
          )}
        </Column>

        {generator === undefined ? (
          <section className={styles.column}>
            <h2 className={styles.columnTitle}>Generator</h2>
            <p className={styles.note}>No stag preset found to compare against.</p>
          </section>
        ) : (
          <Column heading="Generator, stag preset" note={generator.note}>
            {(size) => (
              <InsectIllustration
                insect={generator.insect}
                seed={generator.seed}
                title={`Generated stag beetle at ${String(size.px)} pixels`}
              />
            )}
          </Column>
        )}
      </div>

      <section className={styles.altText} aria-labelledby="alt-text-heading">
        <h2 className={styles.columnTitle} id="alt-text-heading">
          Alt text
        </h2>
        <p className={styles.note}>
          What a screen reader is given for the plate, built from the species record so the two
          cannot drift:
        </p>
        <blockquote className={styles.quote}>
          {describePlate(LUCANUS_CERVUS, {
            sex: LUCANUS_CERVUS_PLATE.sex,
            ...(LUCANUS_CERVUS_PLATE.hallmark === undefined
              ? {}
              : { hallmark: LUCANUS_CERVUS_PLATE.hallmark }),
          })}
        </blockquote>
      </section>

      <section className={styles.reference} aria-labelledby="reference-heading">
        <h2 className={styles.columnTitle} id="reference-heading">
          The reference
        </h2>
        {/*
          Served from `references/` rather than `public/`, so it is never
          bundled: this page is dev-only and the image must not ship. Vite
          serves it from the project root at dev time and the build never sees
          it, because the build never sees this route.
        */}
        <img
          className={styles.referenceImage}
          src="/references/lucanus-cervus.jpg"
          alt="The 1876 lithograph the plate was traced from: a male European stag beetle in dorsal view, black head and thorax with deep red-brown wing cases."
          width={396}
          height={628}
        />
        <p className={styles.credit}>
          {LUCANUS_CERVUS_PLATE.reference.artist},{' '}
          <cite>{LUCANUS_CERVUS_PLATE.reference.title}</cite>,{' '}
          {String(LUCANUS_CERVUS_PLATE.reference.year)}. {LUCANUS_CERVUS_PLATE.reference.licence}.{' '}
          <a href={LUCANUS_CERVUS_PLATE.reference.source}>Source</a>
        </p>
      </section>
    </section>
  );
}
