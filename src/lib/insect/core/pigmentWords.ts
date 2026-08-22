import type { Pigment } from './types';

/**
 * What each pigment is called out loud.
 *
 * The one place the generator is allowed an opinion about colour, and it is a
 * *name* rather than a value: a description has to say something a listener can
 * picture, and "pigment 4" is not it. The renderer still owns the actual hues,
 * so these words and the CSS must be changed together — the fixed order in
 * `PIGMENTS` is what keeps them in step.
 */
const PIGMENT_WORDS: Record<Pigment, string> = {
  1: 'ochre',
  2: 'russet',
  3: 'olive',
  4: 'slate grey',
  5: 'warm umber',
  6: 'chalky bone',
};

/** The colour word for a pigment, for use in a description. */
export function pigmentWord(pigment: Pigment): string {
  return PIGMENT_WORDS[pigment];
}
