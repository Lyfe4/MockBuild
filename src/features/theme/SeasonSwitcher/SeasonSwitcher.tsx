import { useSearchParams } from 'react-router';

import { cx } from '@/lib/classNames';
import { SEASONS, type Season } from '@/types';

import { useSeason } from '../useSeason';
import styles from './SeasonSwitcher.module.css';

const SEASON_LABELS: Record<Season, string> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
};

export interface SeasonSwitcherProps {
  className?: string | undefined;
}

/**
 * The segmented control that dresses the archive for a season.
 *
 * Built from a `fieldset` of real radio inputs, not buttons. That is not
 * pedantry: a radio group is a single tab stop whose options are chosen with
 * the arrow keys, and the browser gives that behaviour for free. Buttons would
 * mean four tab stops and hand-rolled key handling that would then have to be
 * kept correct. The inputs are visually hidden but never `display: none`, so
 * they keep their focus behaviour and their place in the accessibility tree;
 * the labels are what is painted.
 *
 * Choosing a season does three things: applies it, remembers it, and writes it
 * into the URL so the view can be shared. The URL is written **only on an
 * explicit choice** — the season derived from today's date stays out of the
 * address bar, because a link should carry an intention rather than the
 * accident of when it was copied.
 */
export function SeasonSwitcher({ className }: SeasonSwitcherProps) {
  const { season, setSeason } = useSeason();
  const [searchParams, setSearchParams] = useSearchParams();

  const choose = (next: Season): void => {
    setSeason(next);

    const params = new URLSearchParams(searchParams);

    params.set('season', next);
    // `replace` so the back button steps through pages, not through every
    // season the reader tried on the way.
    setSearchParams(params, { replace: true });
  };

  return (
    <fieldset className={cx(styles.root, className)}>
      <legend className={styles.legend}>Season</legend>

      <div className={styles.options}>
        {SEASONS.map((option) => (
          <div key={option} className={styles.option}>
            <input
              className={styles.input}
              type="radio"
              name="season"
              id={`season-${option}`}
              value={option}
              checked={season === option}
              onChange={() => {
                choose(option);
              }}
            />
            <label className={styles.label} htmlFor={`season-${option}`}>
              {SEASON_LABELS[option]}
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
