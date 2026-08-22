import { useId } from 'react';
import { Link, useSearchParams } from 'react-router';

import { InsectIllustration } from '@/components/InsectIllustration';
import { useDocumentTitle } from '@/hooks';
import { cx } from '@/lib/classNames';
import {
  BEETLE_PRESETS,
  MOTH_PRESETS,
  pigmentWord,
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

/**
 * The orders, and the query parameter each one's reroll button writes.
 *
 * Per order rather than one shared counter: judging the beetles usually means
 * scrolling past twenty moths, and rerolling the pair together loses the
 * specimen you were in the middle of looking at.
 */
const ROUND_PARAM = { coleoptera: 'beetles', lepidoptera: 'moths' } as const;

interface Card {
  readonly key: string;
  readonly preset: string;
  readonly seed: string;
  readonly insect: InsectForm;
  /** The traits the seed picked, for the line under the drawing. */
  readonly traits: readonly string[];
}

/**
 * A specimen's key, which is also its seed.
 *
 * The round is in the key rather than added to the hash, so bumping it walks
 * somewhere unrelated in the space instead of to the adjacent seed — adjacent
 * seeds are not similar, but a hash is the only thing guaranteeing that, and
 * mixing the round into the string is what keeps it honest.
 */
function specimenKey(preset: string, seed: string, round: number): string {
  return round === 0 ? `${preset}-${seed}` : `${preset}-${seed}-r${String(round)}`;
}

function beetleTraits(form: BeetleForm): string[] {
  return [
    form.antennaType,
    form.pronotumShape,
    form.marking === 'none' ? 'plain' : `${form.marking}·${String(form.markingCount)}`,
    `stria ${String(form.striaeCount)}`,
    `hatch ${form.hatching.toFixed(2)}`,
    `mand ${form.mandibleSize.toFixed(2)}`,
    pigmentWord(form.pigment),
  ];
}

function mothTraits(form: MothForm): string[] {
  return [
    form.forewingShape,
    form.hindwingShape,
    form.antennaType,
    `hind ${form.hindwingScale.toFixed(2)}`,
    // The layers this specimen actually carries, which is the character the
    // preset varies most and the one hardest to read off the drawing.
    form.patterns.length === 0 ? 'plain' : form.patterns.join('+'),
    `band ${String(form.bandCount)}×${form.bandWidth.toFixed(1)}`,
    `eye ${String(form.eyespotCount)}×${String(form.eyespotRings)}`,
    `hatch ${form.hatching.toFixed(2)}`,
    pigmentWord(form.pigment),
  ];
}

function beetleCards(round: number): Card[] {
  return BEETLE_PRESETS.flatMap((spec) =>
    SEEDS.map((seed) => {
      const key = specimenKey(spec.name, seed, round);
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
}

function mothCards(round: number): Card[] {
  return MOTH_PRESETS.flatMap((spec) =>
    SEEDS.map((seed) => {
      const key = specimenKey(spec.name, seed, round);
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
}

interface SectionProps {
  title: string;
  cards: readonly Card[];
  legend: readonly { readonly name: string; readonly note: string }[];
  large: boolean;
  /** Landscape plates for the moths, portrait for the beetles. */
  landscape: boolean;
  round: number;
  /** Where the reroll link goes: this page with this section's round bumped. */
  rerollTo: string;
}

function Section({ title, cards, legend, large, landscape, round, rerollTo }: SectionProps) {
  const titleId = useId();

  return (
    // Named by its heading, so each order is a landmark a screen reader can
    // jump between rather than an anonymous run of thirty-two figures.
    <section className={styles.section} aria-labelledby={titleId}>
      <h2 className={styles.sectionTitle} id={titleId}>
        {title}
        <span className={styles.sectionActions}>
          <span className={styles.round}>round {round + 1}</span>
          <Link className={styles.actionLink} to={rerollTo}>
            Reroll
          </Link>
        </span>
      </h2>

      <div className={cx(styles.grid, large && styles.gridLarge)}>
        {cards.map((card) => (
          <figure key={card.key} className={styles.cell}>
            <div className={cx(styles.plate, landscape && styles.plateLandscape)}>
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

/** A non-negative round from a query parameter, or zero if it says anything else. */
function roundFrom(params: URLSearchParams, key: string): number {
  const raw = Number(params.get(key));

  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
}

export function InsectLabRoute() {
  const [searchParams] = useSearchParams();

  useDocumentTitle('Insect lab');

  // `?size=large` to judge the drawing, the default to judge the silhouette.
  const large = searchParams.get('size') === 'large';

  const rounds = {
    coleoptera: roundFrom(searchParams, ROUND_PARAM.coleoptera),
    lepidoptera: roundFrom(searchParams, ROUND_PARAM.lepidoptera),
  };

  /** This URL with one section's round bumped and everything else untouched. */
  const rerollTo = (order: keyof typeof ROUND_PARAM): string => {
    const next = new URLSearchParams(searchParams);

    next.set(ROUND_PARAM[order], String(rounds[order] + 1));

    return `?${next.toString()}`;
  };

  const sizeTo = (): string => {
    const next = new URLSearchParams(searchParams);

    if (large) next.delete('size');
    else next.set('size', 'large');

    const query = next.toString();

    return query === '' ? '/lab/insects' : `?${query}`;
  };

  return (
    <section>
      <h1 tabIndex={-1}>Insect lab</h1>
      <p className={styles.intro}>
        Four presets across four seeds each, per order. A preset should hold together as a kind
        whatever the seed, and the kinds should be tellable apart at thumbnail size. The line under
        each card is what that seed actually chose. Reroll a section to walk to four fresh
        individuals of every preset in it.{' '}
        <Link className={styles.actionLink} to={sizeTo()}>
          {large ? 'View small' : 'View large'}
        </Link>
      </p>

      <Section
        title="Coleoptera"
        cards={beetleCards(rounds.coleoptera)}
        legend={BEETLE_PRESETS.map((spec) => ({ name: spec.name, note: spec.note }))}
        large={large}
        landscape={false}
        round={rounds.coleoptera}
        rerollTo={rerollTo('coleoptera')}
      />

      <Section
        title="Lepidoptera"
        cards={mothCards(rounds.lepidoptera)}
        legend={MOTH_PRESETS.map((spec) => ({ name: spec.name, note: spec.note }))}
        large={large}
        // A spread specimen is far wider than it is long; a portrait plate
        // letterboxes it and the moth ends up half the size of the beetles.
        landscape
        round={rounds.lepidoptera}
        rerollTo={rerollTo('lepidoptera')}
      />
    </section>
  );
}
