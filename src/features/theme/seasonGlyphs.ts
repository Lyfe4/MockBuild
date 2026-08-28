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
 * How much of that box each glyph's longest dimension spans: 19.2 of 24, four
 * fifths. See the note on filling the box equally, below — this is the number
 * that keeps the four at one distance from the rim as they orbit it.
 */
export const GLYPH_FILL = 19.2;

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
 *
 * ## They are centred in the box, and they fill it equally
 *
 * Both because of where the dial puts them. The mark rides a box that swings
 * around the outside of the circle, so the box's centre is the point it orbits
 * on and the box's edge is what sets its distance from the rim.
 *
 * Centred, because a glyph sitting a unit and a half low in its own box — which
 * the sprout and the leaf both were, being drawn from the ground up — would
 * orbit about a point that is not its middle and wobble as it went.
 *
 * Equally filled, because four marks on one orbit have to sit at one distance.
 * Drawn at whatever size each shape wanted, the sun filled 80 per cent of its
 * box and the leaf 59, and the leaf then read as floating a third of its own
 * width further out — the same orbit, four apparent radii. So each is scaled
 * about the centre until its **longest** dimension spans `GLYPH_FILL`, which is
 * where the sun already was. The sprout stays narrower than it is tall, because
 * that is what a sprout is; what is equalised is the extent, not the shape.
 *
 * Scaling about the centre leaves the stroke width alone, so one ink weight
 * still means one ink weight. `seasonGlyphs.test.ts` holds all four to both
 * rules.
 */
export const SEASON_GLYPHS: Record<Season, SeasonGlyph> = {
  spring: {
    viewBox: GLYPH_VIEW_BOX,
    description: 'A sprout: an upright stem with a leaf opening to each side.',
    paths: [
      // The stem, rising from low in the box to just above the middle.
      'M12 21.6 L12 5.82',
      // Left leaf: a lens between (12, 14.24) and (4.37, 6.08), belly down.
      'M12 14.24 C7.79 14.24 4.37 10.55 4.37 6.08 C8.58 6.08 12 9.76 12 14.24 Z',
      // Right leaf, higher up the stem so the two do not read as a single
      // horizontal bar — which is what happens when they are opposite.
      'M12 10.55 C16.21 10.55 19.63 6.87 19.63 2.4 C15.42 2.4 12 6.08 12 10.55 Z',
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
      // The blade, from the stalk end at (6.73, 17.27) to the tip at (21.6, 2.4).
      'M6.73 17.27 C6.73 9.03 13.35 2.4 21.6 2.4 C21.6 10.65 14.97 17.27 6.73 17.27 Z',
      // The midrib, which is also the axis the two curves are mirrored about.
      'M6.73 17.27 L21.6 2.4',
      // The stalk, carrying the same line on past the blade.
      'M6.73 17.27 L2.4 21.6',
    ],
  },
  winter: {
    viewBox: GLYPH_VIEW_BOX,
    description: 'A snowflake: three axes crossed at the centre, six arms.',
    paths: [
      'M12 2.4 L12 21.6',
      // The other two axes at 60 degrees: 9.6 * cos(30) = 8.31,
      // 9.6 * sin(30) = 4.8.
      'M3.69 7.2 L20.31 16.8',
      'M3.69 16.8 L20.31 7.2',
    ],
  },
};
