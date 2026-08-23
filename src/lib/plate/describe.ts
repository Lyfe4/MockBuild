import type { AntennaForm, BodyShape, MarkingForm, SizeClass, Species, WingCover } from '@/types';

import type { PlateSex } from './types';

/**
 * The one sentence a screen reader gets.
 *
 * Built from the species record rather than written by hand, on the same
 * reasoning as the generator's `describe`: two hand-maintained descriptions of
 * the same animal drift, and the one that drifts is always the one nobody can
 * see. Read the drawing's morphology out of the record the drawing was traced
 * against and they cannot disagree.
 *
 * It is deliberately a *description*, not a caption. The caption beside the
 * plate already gives the name, the authority and the size; repeating those
 * here would make the alt text a duplicate of the text next to it, which is
 * worse than useless to somebody listening to both.
 */

/**
 * Vowel sounds that are spelled with a vowel but begin with a consonant.
 *
 * The a/an rule is about sound, not spelling, and the very first name in the
 * collection breaks the spelling version of it: *a* European stag beetle, not
 * *an*. `uni-` is here for the unicorn beetles, which are the other family of
 * names where the two rules disagree. Two prefixes rather than a pronunciation
 * dictionary — add a third when one turns up.
 */
const CONSONANT_ONSET = /^(eu|uni)/i;

/** The article for a word, by the sound it starts with rather than the letter. */
function article(word: string): string {
  if (CONSONANT_ONSET.test(word)) return 'a';

  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

/** How each antennal form is said out loud. */
const ANTENNA_WORDS: Record<AntennaForm, string> = {
  filiform: 'thread-like',
  clavate: 'club-tipped',
  lamellate: 'lamellate',
  serrate: 'saw-toothed',
  bipectinate: 'feathered',
  setaceous: 'tapering',
};

/**
 * How each wing covering reads as a phrase.
 *
 * The fallback clause when a plate names no hallmark, so it has to describe
 * something a listener can picture rather than name a character state.
 */
const WING_COVER_WORDS: Record<WingCover, string> = {
  elytra: 'hardened wing cases',
  membranous: 'clear wings',
  scaled: 'scaled wings',
  absent: 'no wings',
};

const BODY_SHAPE_WORDS: Record<BodyShape, string> = {
  elongate: 'elongate',
  oval: 'oval',
  round: 'rounded',
  slender: 'slender',
};

const SIZE_CLASS_WORDS: Record<SizeClass, string> = {
  tiny: 'very small',
  small: 'small',
  medium: 'medium-sized',
  large: 'large',
};

/** The marking clause, or nothing at all when there is nothing to say. */
const MARKING_WORDS: Record<MarkingForm, string> = {
  none: '',
  spots: 'spotted',
  bands: 'banded across the wings',
  stripes: 'striped lengthwise',
  eyespots: 'marked with eyespots',
};

export interface DescribeOptions {
  /**
   * Which sex is drawn.
   *
   * On the plate rather than on the species, because it is a fact about *this
   * drawing*: a male and a female stag beetle are the same species and not
   * remotely the same picture. `unsexed` says nothing, which is the right
   * default for an animal whose sexes look alike.
   */
  readonly sex?: PlateSex;
  /**
   * The feature the drawing takes care over, in the author's words.
   *
   * The one clause not derived from the record. Morphology characters are
   * chosen to be filterable, which makes them too coarse to name what a reader
   * is actually looking at — "lamellate antennae" is a character, "large
   * antler-like mandibles" is the animal.
   */
  readonly hallmark?: string;
}

/**
 * Alt text for a plate of this species.
 *
 * @param species The record the plate was traced against.
 * @param options What this particular drawing shows, from the plate.
 */
export function describePlate(species: Species, options: DescribeOptions = {}): string {
  const { morphology } = species;
  const { sex = 'unsexed', hallmark } = options;

  // Used verbatim. `commonName` is stored in the form it takes mid-sentence —
  // capitalised only where a word is a proper noun — so "European stag beetle"
  // keeps its capital and "oil beetle" never gains one. Lower-casing the whole
  // string here would demote Europe.
  const name = species.commonName;
  const sexWord = sex === 'unsexed' ? '' : `${sex} `;

  // When the plate names no hallmark, fall back to what the record can say:
  // size, silhouette and what covers the back.
  const feature =
    hallmark ??
    `${SIZE_CLASS_WORDS[morphology.sizeClass]}, ${BODY_SHAPE_WORDS[morphology.bodyShape]} body and ${WING_COVER_WORDS[morphology.wingCover]}`;

  const clauses = [
    `Dorsal view of ${article(sexWord === '' ? name : sex)} ${sexWord}${name}`,
    morphology.colourFamily,
    `with ${feature} and ${ANTENNA_WORDS[morphology.antennae]} antennae`,
  ];

  const markings = MARKING_WORDS[morphology.markings];

  if (markings !== '') clauses.push(markings);

  return `${clauses.join(', ')}.`;
}
