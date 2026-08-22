import { useSearchParams } from 'react-router';

import { InsectIllustration } from '@/components/InsectIllustration';
import { useDocumentTitle } from '@/hooks';
import { cx } from '@/lib/classNames';
import {
  BEETLE_PRESETS,
  MOTH_PRESETS,
  resolveBeetlePreset,
  resolveMothPreset,
  seedFromName,
  type BeetleForm,
  type InsectForm,
  type MothForm,
} from '@/lib/insect';

import styles from './InsectLabRoute.module.css';

/**
 * TEMPORARY — insect generator contact sheet.
 *
 * Four presets across four seeds each, per order, so the generator can be
 * judged on two questions at once: does one preset hold together as a *kind*
 * across different seeds, and do the kinds read as different from one another?
 *
 * Each card names the traits the seed actually chose, which is the only way to
 * tell a preset that is varying well from one whose ranges are too narrow to
 * see.
 *
 * Dev-only, like `/lab`. See `app/router.tsx`.
 */

/** Four seeds, reused across every preset so the columns are comparable. */
const SEEDS = ['alpha', 'beta', 'gamma', 'delta'] as const;

interface Card {
  readonly key: string;
  readonly preset: string;
  readonly seed: string;
  readonly insect: InsectForm;
  /** The categorical traits the seed picked, for the line under the drawing. */
  readonly traits: readonly string[];
}

function beetleTraits(form: BeetleForm): string[] {
  return [
    form.antennaType,
    form.pronotumShape,
    form.marking === 'none' ? 'plain' : `${form.marking}·${String(form.markingCount)}`,
    `stria ${String(form.striaeCount)}`,
    `mand ${form.mandibleSize.toFixed(2)}`,
  ];
}

function mothTraits(form: MothForm): string[] {
  return [
    form.forewingShape,
    form.hindwingShape,
    form.antennaType,
    `band ${String(form.bandCount)}`,
    `eye ${String(form.eyespotCount)}×${String(form.eyespotRings)}`,
    ...form.patterns,
  ];
}

const BEETLE_CARDS: readonly Card[] = BEETLE_PRESETS.flatMap((spec) =>
  SEEDS.map((seed) => {
    const key = `${spec.name}-${seed}`;
    const form = resolveBeetlePreset(spec, seedFromName(key));

    return {
      key,
      preset: spec.name,
      seed,
      insect: { order: 'coleoptera', form } as const,
      traits: beetleTraits(form),
    };
  }),
);

const MOTH_CARDS: readonly Card[] = MOTH_PRESETS.flatMap((spec) =>
  SEEDS.map((seed) => {
    const key = `${spec.name}-${seed}`;
    const form = resolveMothPreset(spec, seedFromName(key));

    return {
      key,
      preset: spec.name,
      seed,
      insect: { order: 'lepidoptera', form } as const,
      traits: mothTraits(form),
    };
  }),
);

interface SectionProps {
  title: string;
  cards: readonly Card[];
  legend: readonly { readonly name: string; readonly note: string }[];
  large: boolean;
}

function Section({ title, cards, legend, large }: SectionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>

      <div className={cx(styles.grid, large && styles.gridLarge)}>
        {cards.map((card) => (
          <figure key={card.key} className={styles.cell}>
            <div className={styles.plate}>
              <InsectIllustration
                insect={card.insect}
                seed={seedFromName(card.key)}
                title={`${card.preset}, seed ${card.seed}`}
              />
            </div>
            <figcaption className={styles.caption}>
              <span className={styles.name}>{card.preset}</span>
              <span className={styles.seed}>{card.seed}</span>
            </figcaption>
            {/* What the seed chose, so a narrow range is visible as one. */}
            <p className={styles.traits}>{card.traits.join(' · ')}</p>
          </figure>
        ))}
      </div>

      <dl className={styles.legend}>
        {legend.map((entry) => (
          <div key={entry.name} className={styles.legendRow}>
            <dt>{entry.name}</dt>
            <dd>{entry.note}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function InsectLabRoute() {
  const [searchParams] = useSearchParams();

  useDocumentTitle('Insect lab');

  // `?size=large` to judge the drawing, the default to judge the silhouette.
  const large = searchParams.get('size') === 'large';

  return (
    <section>
      <h1 tabIndex={-1}>Insect lab</h1>
      <p className={styles.intro}>
        Four presets across four seeds each, per order. A preset should hold together as a kind
        whatever the seed, and the kinds should be tellable apart at thumbnail size. The line under
        each card is what that seed actually chose.{' '}
        <a className={styles.sizeLink} href={large ? '/lab/insects' : '/lab/insects?size=large'}>
          {large ? 'View small' : 'View large'}
        </a>
      </p>

      <Section
        title="Coleoptera"
        cards={BEETLE_CARDS}
        legend={BEETLE_PRESETS.map((spec) => ({ name: spec.name, note: spec.note }))}
        large={large}
      />

      <Section
        title="Lepidoptera"
        cards={MOTH_CARDS}
        legend={MOTH_PRESETS.map((spec) => ({ name: spec.name, note: spec.note }))}
        large={large}
      />
    </section>
  );
}
