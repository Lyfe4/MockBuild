import type { Season } from '@/types';

/**
 * One season's mark, as data.
 *
 * Paths and a view box, no React: the dial renders them, a test measures them,
 * and anything else that ever wants to say "autumn" in a drawing rather than a
 * word can import the same four.
 */
export interface SeasonGlyph {
  /** Always `GLYPH_VIEW_BOX`; carried per glyph so a consumer needs one import. */
  readonly viewBox: string;
  /**
   * Stroked in order, all at one weight, none of them filled. Splitting a glyph
   * across several paths rather than concatenating the subpaths into one `d`
   * costs nothing and lets the description below name what each stroke is.
   */
  readonly paths: readonly string[];
  /** What it draws. Read by nobody at runtime; read by everybody in a diff. */
  readonly description: string;
}

/**
 * The one box all four are drawn in.
 *
 * 24 units square, centred on (12, 12), which is where the dial centres it. A
 * shared box is what makes the four a set: a glyph that filled its box more
 * than its neighbours would read as heavier rather than as a different season.
 */
export const GLYPH_VIEW_BOX = '0 0 24 24';

/**
 * The four seasonal glyphs, in the engraving language the plates are drawn in:
 * **one ink weight, no fills**, and no shape that depends on a fill to be read.
 * A closed path here is an outline, not a silhouette.
 *
 * ## The vocabulary is deliberately four commands
 *
 * `M`, `L`, `C`, `Z`, and **absolute only** — no `A`, no `V`, no `H`, no
 * lowercase. That is not stylistic. In this subset every number that follows a
 * command is half of an `x y` pair, so the data can be measured by anything
 * that can split on whitespace, and `seasonGlyphs.test.ts` checks all four
 * against the view box without a path parser. Allow one arc and that check
 * needs to know that `A` takes seven numbers of which two are a point; allow
 * relative commands and a coordinate is no longer a coordinate. The summer sun
 * is therefore a circle written as four cubic Béziers with the usual 0.5523
 * kappa, which is what an arc would have compiled to anyway.
 *
 * ## Why these four shapes
 *
 * They have to be told apart at **48px**, where the glyph is about 22px across
 * and a stroke is a pixel and a third. That rules out anything with interior
 * detail — veins on the leaf, barbs on the snowflake — which turns to mud, and
 * it rules out two glyphs with the same skeleton. A sprout and a bare branch
 * are both a stem with two things on it, so only one of them can be here.
 *
 *   spring   a sprout: one stem, two leaves opening off it
 *   summer   a sun: a disc and eight rays
 *   autumn   a leaf, fallen — the same lens as the sprout's, tilted and given
 *            a stalk, so the pair reads as one plant at two ends of its year
 *   winter   a snowflake: three crossed axes
 *
 * The snowflake is worth a sentence, because this archive is scrupulous about
 * not importing a northern year. Thornfield is in Armidale, 1,000 m up in the
 * New England Tablelands, which is one of the few towns in Australia that
 * genuinely sees snow most winters. It is a local mark, not a borrowed one.
 */
export const SEASON_GLYPHS: Record<Season, SeasonGlyph> = {
  spring: {
    viewBox: GLYPH_VIEW_BOX,
    description: 'A sprout: an upright stem with a leaf opening to each side.',
    paths: [
      // The stem, rising from the foot of the box to just above the middle.
      'M12 21 L12 9',
      // Left leaf: a lens between (12, 15.4) and (6.2, 9.2), belly down.
      'M12 15.4 C8.8 15.4 6.2 12.6 6.2 9.2 C9.4 9.2 12 12 12 15.4 Z',
      // Right leaf, higher up the stem so the two do not read as a single
      // horizontal bar — which is what happens when they are opposite.
      'M12 12.6 C15.2 12.6 17.8 9.8 17.8 6.4 C14.6 6.4 12 9.2 12 12.6 Z',
    ],
  },
  summer: {
    viewBox: GLYPH_VIEW_BOX,
    description: 'A sun: a disc of radius 4.4 with eight rays around it.',
    paths: [
      // The disc, as four cubic Béziers. r = 4.4, so the control offset is
      // 4.4 * 0.5523 = 2.43.
      'M12 7.6 C14.43 7.6 16.4 9.57 16.4 12 C16.4 14.43 14.43 16.4 12 16.4 ' +
        'C9.57 16.4 7.6 14.43 7.6 12 C7.6 9.57 9.57 7.6 12 7.6 Z',
      // Four rays on the axes, from r = 6.4 to r = 9.6.
      'M12 5.6 L12 2.4',
      'M12 18.4 L12 21.6',
      'M5.6 12 L2.4 12',
      'M18.4 12 L21.6 12',
      // Four on the diagonals, at the same two radii: 6.4 / sqrt(2) = 4.53.
      'M16.53 7.47 L18.79 5.21',
      'M7.47 16.53 L5.21 18.79',
      'M16.53 16.53 L18.79 18.79',
      'M7.47 7.47 L5.21 5.21',
    ],
  },
  autumn: {
    viewBox: GLYPH_VIEW_BOX,
    description: 'A fallen leaf: one lens on the diagonal, with a stalk and a midrib.',
    paths: [
      // The blade, from the stalk end at (7.4, 16.6) to the tip at (18.4, 5.6).
      'M7.4 16.6 C7.4 10.5 12.3 5.6 18.4 5.6 C18.4 11.7 13.5 16.6 7.4 16.6 Z',
      // The midrib, which is also the axis the two curves are mirrored about.
      'M7.4 16.6 L18.4 5.6',
      // The stalk, carrying the same line on past the blade.
      'M7.4 16.6 L4.2 19.8',
    ],
  },
  winter: {
    viewBox: GLYPH_VIEW_BOX,
    description: 'A snowflake: three axes crossed at the centre, six arms.',
    paths: [
      'M12 2.6 L12 21.4',
      // The other two axes at 60 degrees: 9.4 * cos(30) = 8.14,
      // 9.4 * sin(30) = 4.7.
      'M3.86 7.3 L20.14 16.7',
      'M3.86 16.7 L20.14 7.3',
    ],
  },
};
