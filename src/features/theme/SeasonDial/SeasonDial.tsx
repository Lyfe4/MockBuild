import { useSearchParams } from 'react-router';

import { VisuallyHidden } from '@/components/VisuallyHidden';
import { cx } from '@/lib/classNames';
import { SEASONS, type Season } from '@/types';

import { SEASON_GLYPHS } from '../seasonGlyphs';
import { useSeason } from '../useSeason';
import styles from './SeasonDial.module.css';

const SEASON_LABELS: Record<Season, string> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
};

/**
 * One quadrant, drawn once and turned three times.
 *
 * The wedge fills the top-left quarter of a circle centred at (50, 50) with a
 * radius of 45, and the stylesheet rotates it a quarter turn per season — so
 * the year runs clockwise from the top left and the four wedges are the same
 * shape by construction, rather than by four hand-written paths agreeing.
 */
const WEDGE = 'M50 50 L5 50 A45 45 0 0 1 50 5 Z';

/**
 * The view box is the circle, not the square it was drawn in.
 *
 * `5 5 90 90` crops to the ink exactly, so `--dial-size` is the diameter rather
 * than something a few per cent larger — which is what puts the dial's own edge
 * on `content-end` instead of two pixels inside it. The focus halo is stroked
 * wide enough to reach past this box; the SVG's `overflow` is `visible` so it
 * is drawn rather than clipped.
 */
const VIEW_BOX = '5 5 90 90';

export interface SeasonDialProps {
  className?: string | undefined;
}

/**
 * The dial that dresses the archive for a season, and the name of the season it
 * is turned to.
 *
 * A compass rose rather than a row of buttons. The switcher this replaces was a
 * strip of four text labels sitting directly under the navigation, in the same
 * mono uppercase as the six words above it — so it read as a second row of
 * navigation, and a reader had to try one to find out it was not. A circle
 * divided into four, each quadrant inked in that season's own colour, cannot be
 * mistaken for a list of pages.
 *
 * ## What says which season is active
 *
 * **The fill, and only the fill.** The chosen quadrant is at full pigment and
 * the other three are mixed a quarter into the paper, which is a large enough
 * step to be unmistakable on its own — and the two things that used to help it
 * along have both gone. The heavier ink outline went because a site drawn in
 * hairlines had one control shouting in outline; the tick that pointed at the
 * quadrant went because a mark that small and that detached reads as a speck.
 * A single ink hairline now runs round the whole circle, which is the job that
 * outline was doing badly: giving the object an edge.
 *
 * At the centre, where the four meet, sits a **glyph for the active season** —
 * a sprout, a sun, a fallen leaf, a snowflake — drawn in the plates' own
 * language of one ink weight and no fills. It does not point at anything; it
 * says what the dial is set to, in the third register the control has after
 * the colour and the word. `seasonGlyphs.ts` is where the four are authored and
 * why they are those four.
 *
 * ## The name beside it
 *
 * A quartered circle is unmistakably not navigation, which was the point, and
 * unmistakably not self-explanatory, which was the cost: nothing on the drawing
 * says which quadrant is which, and a reader who has not clicked one has no way
 * to find out. So the active season's name is set beside it, in the same small
 * tracked mono as the establishment line and the navigation — one word, which
 * is the least that can be said and still be a legend.
 *
 * It is `role="status"`, so the new season is announced politely on a change.
 * That is a second announcement after the radio's own "Winter, selected", and
 * it is wanted: the radio says *what was chosen*, the status says *what the
 * archive is now dressed in*. They are the same fact today, and the status is
 * the one that would still be true if the season were ever changed by something
 * other than this control.
 *
 * The word is shown at **every** width rather than hidden on a phone. It is
 * what balances the mobile header — see `SiteHeader.module.css` — and at
 * `--font-size-2xs` the longest of the four sets in about fifty pixels, which
 * even a 320px screen has to spare between the menu button and the dial.
 *
 * ## Undressed
 *
 * `season` is `null` in the prerendered HTML, because a file written at build
 * time cannot know which season this reader gets — see `ThemeContext`. The dial
 * draws that state rather than guessing at one: no radio checked, no name, four
 * quadrants all at the same muted strength and **no glyph** at the centre,
 * which is the truthful picture of a control nobody has answered yet.
 *
 * The `<p>` itself is always rendered, empty rather than absent, for two
 * reasons. A live region has to exist before its content changes or the change
 * is not announced; and the stylesheet reserves its width, so the dial does not
 * slide sideways when the word arrives a moment after the page does.
 *
 * ## It is still a radio group
 *
 * A `fieldset` of four real radios, exactly as before and for the same reason:
 * a radio group is a single tab stop whose options are chosen with the arrow
 * keys, and the browser gives that behaviour for free. The inputs are visually
 * hidden but never `display: none`, so they keep their focus behaviour and
 * their place in the accessibility tree; the labels carry the season names for
 * a screen reader and the wedges are what is painted. `aria-checked`, the arrow
 * keys, the focus ring and the group's own name all come from the elements
 * themselves — nothing here is a div pretending to be a control.
 *
 * ## The hit area
 *
 * The drawn dial is 48px across, so a quadrant of it is 24px — half of what a
 * finger needs. So the control is laid out as a **2 × 2 grid of 44px
 * transparent squares**, 88px in all, with the drawing centred on the point
 * where the four meet: each wedge is absolutely positioned into the inner
 * corner of its own square and overflows it with `pointer-events: none`. Every
 * label is a full 44 × 44 target that happens to paint a quarter-circle in one
 * corner, and because the squares tile rather than overlap, no point on the
 * control belongs to two seasons. The 20px of empty space this adds on each
 * side is taken back with a negative margin, so the dial lays out at its drawn
 * size in the header and receives taps at its felt one.
 *
 * Choosing a season does three things: applies it, remembers it, and writes it
 * into the URL so the view can be shared. The URL is written **only on an
 * explicit choice** — the season derived from today's date stays out of the
 * address bar, because a link should carry an intention rather than the
 * accident of when it was copied.
 */
export function SeasonDial({ className }: SeasonDialProps) {
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
    <div className={cx(styles.root, className)}>
      {/*
        The name first, the dial last. The order earns its keep at both ends of
        the layout: on a phone it gathers the two into one right-hand cluster
        facing the menu button, and at every width it leaves the dial's own rim
        as this block's right edge — which is the edge `SiteHeader` hangs on
        `content-end` and what `layout.test.tsx` measures.
      */}
      <p className={styles.name} role="status">
        {season === null ? '' : SEASON_LABELS[season]}
      </p>

      {/*
        `data-active` is the season the archive is dressed in, and it is what
        chooses the glyph. `data-season` on each option is which season that
        quadrant *is*, and `data-glyph` is which season a drawing *shows* — a
        third name rather than a second `data-season` because the tests count
        the quadrants by attribute, and eight of them is not four. All three are
        attributes rather than styles because the CSP forbids the second.
      */}
      <fieldset className={styles.dial} data-active={season ?? undefined}>
        <VisuallyHidden as="legend">Season</VisuallyHidden>

        <div className={styles.options}>
          {SEASONS.map((option) => (
            <div key={option} className={styles.option} data-season={option}>
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
                <svg
                  className={styles.quadrant}
                  viewBox={VIEW_BOX}
                  aria-hidden="true"
                  focusable="false"
                >
                  {/*
                    The same wedge twice. The first is stroked heavily and is
                    transparent until the radio takes keyboard focus, at which
                    point it shows as a halo hugging that quadrant — a focus
                    ring on the shape itself rather than on the square it lives
                    in.
                  */}
                  <path className={styles.focusRing} d={WEDGE} />
                  <path className={styles.wedge} d={WEDGE} />
                </svg>
                <VisuallyHidden>{SEASON_LABELS[option]}</VisuallyHidden>
              </label>
            </div>
          ))}
        </div>

        {/*
          The rim, drawn once, on the same arc the four wedges already stroke —
          so it covers their outer edge rather than doubling it. It is the only
          ink line on the dial, and it is what the active quadrant's heavy
          outline used to be doing badly: giving the circle an edge.
        */}
        <svg className={styles.rim} viewBox={VIEW_BOX} aria-hidden="true" focusable="false">
          <circle cx="50" cy="50" r="45" />
        </svg>

        {/*
          The seasonal glyph, at the centre where the four quadrants meet.

          All four are rendered and three of them are transparent, because that
          is what makes the change a **cross-fade** rather than a swap: at the
          midpoint both the leaving glyph and the arriving one are half there.
          One element whose path data changed could not do it without a morph,
          and these four shapes have nothing in common to morph through.

          Nothing here is conditional on the season, including the undressed
          case: with no `data-active` on the fieldset, no rule raises any of the
          four, and the centre of the dial is simply empty — which is the same
          thing the unchecked radios and the empty name are saying.
        */}
        <span className={styles.centre} aria-hidden="true">
          {SEASONS.map((option) => {
            const glyph = SEASON_GLYPHS[option];

            return (
              <svg
                key={option}
                className={styles.glyph}
                data-glyph={option}
                viewBox={glyph.viewBox}
                focusable="false"
              >
                {glyph.paths.map((d) => (
                  <path key={d} d={d} />
                ))}
              </svg>
            );
          })}
        </span>
      </fieldset>
    </div>
  );
}
