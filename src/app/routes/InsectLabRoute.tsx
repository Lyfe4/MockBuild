import { useSearchParams } from 'react-router';

import { InsectIllustration } from '@/components/InsectIllustration';
import { useDocumentTitle } from '@/hooks';
import { cx } from '@/lib/classNames';
import { seedFromName, type BeetleForm } from '@/lib/insect';

import styles from './InsectLabRoute.module.css';

/**
 * TEMPORARY — beetle generator contact sheet.
 *
 * Four hand-authored presets across four seeds each, so the generator can be
 * judged on two questions at once: does one preset hold together as a *kind* of
 * beetle across different seeds, and do the four kinds read as different from
 * one another?
 *
 * The presets are shaped after real beetle families but copy no species: they
 * are parameter sets chosen to land in the right region of the space, the same
 * way the plant presets were.
 *
 * Dev-only, like `/lab`. See `app/router.tsx`.
 */

interface Preset {
  readonly name: string;
  readonly note: string;
  readonly form: BeetleForm;
}

/** Shared baseline, so each preset states only what makes it that preset. */
const BASE: BeetleForm = {
  bodyLength: 0.85,
  bodyWidth: 0.8,
  headWidth: 0.6,
  eyeSize: 0.6,
  antennaType: 'filiform',
  antennaLength: 0.9,
  mandibleSize: 0.2,
  pronotumShape: 'rounded',
  pronotumWidth: 0.85,
  pronotumRidge: false,
  horn: false,
  hornLength: 0.5,
  elytraLength: 0.85,
  elytraWidth: 1,
  elytraTaper: 0.3,
  striaeCount: 0,
  punctures: false,
  legLength: 1,
  femurThickness: 1,
  legSpread: 0.6,
  tibialSpines: false,
  marking: 'none',
  markingCount: 4,
  markingSize: 0.9,
  scale: 0.92,
};

const PRESETS: readonly Preset[] = [
  {
    name: 'Longhorn',
    note: 'Slender, parallel-sided, antennae longer than the body',
    form: {
      ...BASE,
      bodyLength: 1,
      bodyWidth: 0.52,
      elytraLength: 1,
      elytraWidth: 0.72,
      elytraTaper: 0.18,
      antennaType: 'filiform',
      antennaLength: 1.6,
      eyeSize: 0.8,
      pronotumWidth: 0.72,
      legLength: 1.15,
      femurThickness: 0.7,
      marking: 'bands',
      markingCount: 2,
      markingSize: 0.7,
    },
  },
  {
    name: 'Ladybird',
    note: 'Almost hemispherical, short clubbed antennae, spotted',
    form: {
      ...BASE,
      bodyLength: 0.62,
      bodyWidth: 1.15,
      elytraLength: 0.62,
      elytraWidth: 1.2,
      elytraTaper: 0.05,
      antennaType: 'clavate',
      antennaLength: 0.38,
      headWidth: 0.42,
      eyeSize: 0.45,
      pronotumWidth: 0.78,
      legLength: 0.62,
      femurThickness: 0.85,
      legSpread: 0.45,
      marking: 'spots',
      markingCount: 4,
      markingSize: 1.05,
    },
  },
  {
    name: 'Stag',
    note: 'Heavy build, antler-like mandibles, lamellate antennae',
    form: {
      ...BASE,
      bodyLength: 0.95,
      bodyWidth: 0.95,
      elytraLength: 0.8,
      elytraWidth: 1.05,
      elytraTaper: 0.22,
      antennaType: 'lamellate',
      antennaLength: 0.55,
      mandibleSize: 1.45,
      headWidth: 1,
      eyeSize: 0.5,
      pronotumShape: 'angular',
      pronotumWidth: 0.98,
      pronotumRidge: true,
      legLength: 1.05,
      femurThickness: 1.3,
      legSpread: 0.75,
      tibialSpines: true,
      marking: 'none',
    },
  },
  {
    name: 'Ground',
    note: 'Tapered, deeply striate wing cases, long running legs',
    form: {
      ...BASE,
      bodyLength: 0.92,
      bodyWidth: 0.72,
      elytraLength: 0.92,
      elytraWidth: 0.9,
      elytraTaper: 0.62,
      antennaType: 'serrate',
      antennaLength: 0.85,
      headWidth: 0.7,
      pronotumShape: 'angular',
      pronotumWidth: 0.8,
      pronotumRidge: true,
      striaeCount: 8,
      punctures: true,
      legLength: 1.3,
      femurThickness: 0.9,
      legSpread: 0.85,
      tibialSpines: true,
      marking: 'stripe',
      markingSize: 0.6,
    },
  },
];

/** Four seeds, reused across every preset so the columns are comparable. */
const SEEDS = ['alpha', 'beta', 'gamma', 'delta'] as const;

export function InsectLabRoute() {
  const [searchParams] = useSearchParams();

  useDocumentTitle('Insect lab');

  // `?size=large` to judge the drawing, the default to judge the silhouette.
  const large = searchParams.get('size') === 'large';

  return (
    <section>
      <h1 tabIndex={-1}>Insect lab</h1>
      <p className={styles.intro}>
        Four presets across four seeds each. A preset should hold together as a kind of beetle
        whatever the seed, and the four kinds should be tellable apart at thumbnail size.{' '}
        <a className={styles.sizeLink} href={large ? '/lab/insects' : '/lab/insects?size=large'}>
          {large ? 'View small' : 'View large'}
        </a>
      </p>

      <div className={cx(styles.grid, large && styles.gridLarge)}>
        {PRESETS.flatMap((preset) =>
          SEEDS.map((seedName) => {
            const key = `${preset.name}-${seedName}`;

            return (
              <figure key={key} className={styles.cell}>
                <div className={styles.plate}>
                  <InsectIllustration
                    form={preset.form}
                    seed={seedFromName(key)}
                    title={`${preset.name} beetle, seed ${seedName}`}
                  />
                </div>
                <figcaption className={styles.caption}>
                  <span className={styles.name}>{preset.name}</span>
                  <span className={styles.seed}>{seedName}</span>
                </figcaption>
              </figure>
            );
          }),
        )}
      </div>

      <dl className={styles.legend}>
        {PRESETS.map((preset) => (
          <div key={preset.name} className={styles.legendRow}>
            <dt>{preset.name}</dt>
            <dd>{preset.note}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
