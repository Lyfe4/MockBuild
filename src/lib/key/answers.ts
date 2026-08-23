import { KEY_TRAITS, type KeyTraitId } from './traits';

/**
 * Answers as they travel in a URL.
 *
 * A key in progress is a link, on the same reasoning as the catalogue's
 * filters: it survives a reload and a back button, and it can be sent to
 * somebody who will see the same three questions answered the same way. So the
 * answers are in the query string and nothing about the walk lives in component
 * state.
 *
 * ## Why the trait travels with the value
 *
 * The obvious encoding is the branch taken at each node — `?k=021` — and it is
 * shorter than this one. It is also silently wrong the moment the collection
 * changes: the tree is derived, so adding a species can move a question, and an
 * old link would then answer a question nobody asked and key out a different
 * animal without saying so. Encoding *which question* was answered as well as
 * *what* means a link into a tree that has since changed stops at the point
 * where the two disagree, which `advance` treats as the end of the walk.
 *
 * ## The wire form
 *
 * Two characters per answer: a letter for the trait, its position in
 * `KEY_TRAITS`, and one base-36 digit for the option, its position in that
 * trait's own list. `?k=a0e3` is "hard wing cases, over 30 mm". Compact enough
 * not to dominate the URL, and readable enough to debug.
 *
 * This module validates the *string*: syntax, and that both halves of every
 * pair name something. Whether an answer makes sense where it appears in the
 * walk is `advance`'s question, and it is a different one — a decoded answer
 * can be perfectly well-formed and still not belong to the question the tree
 * asks at that point.
 */

/** One answer: which question, and which of its options. */
export interface KeyAnswer {
  readonly trait: KeyTraitId;
  /** The `Morphology` value, not the label. */
  readonly value: string;
}

/** Base 36, so a trait with more than ten states still fits in one character. */
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

/** `a` for the first trait. Six today; the alphabet holds twenty-six. */
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/**
 * The parameter name. Short, because it sits beside `season` in a shared link.
 */
export const KEY_PARAM = 'k';

/**
 * Answers to a wire string.
 *
 * Stops at the first answer it cannot encode rather than dropping it and
 * carrying on: the answers are a path, and a path with a hole in it is not a
 * shorter path, it is a different one.
 */
export function encodeAnswers(answers: readonly KeyAnswer[]): string {
  let encoded = '';

  for (const answer of answers) {
    const traitIndex = KEY_TRAITS.findIndex((trait) => trait.id === answer.trait);
    const trait = KEY_TRAITS[traitIndex];

    if (trait === undefined) break;

    const optionIndex = trait.options.findIndex((option) => option.value === answer.value);
    const letter = LETTERS[traitIndex];
    const digit = DIGITS[optionIndex];

    if (letter === undefined || digit === undefined) break;

    encoded += letter + digit;
  }

  return encoded;
}

/**
 * A wire string back to answers, dropping anything it cannot read.
 *
 * A URL is user input and user input arrives broken, so nothing here throws: an
 * odd number of characters, a letter past the end of `KEY_TRAITS`, a digit past
 * the end of a trait's options, or a trait answered twice all end the walk at
 * the last pair that made sense. The prefix is kept because a prefix of a valid
 * path is a valid path — it is the same key with fewer questions answered.
 *
 * @param raw The parameter's value, or `null` when it is absent.
 */
export function decodeAnswers(raw: string | null): KeyAnswer[] {
  if (raw === null) return [];

  const answers: KeyAnswer[] = [];
  const seen = new Set<KeyTraitId>();
  const text = raw.trim().toLowerCase();

  // Two characters at a time; a trailing odd character is the end of the walk.
  for (let at = 0; at + 1 < text.length; at += 2) {
    const letter = text[at];
    const digit = text[at + 1];

    if (letter === undefined || digit === undefined) break;

    const traitIndex = LETTERS.indexOf(letter);
    const trait = traitIndex < 0 ? undefined : KEY_TRAITS[traitIndex];

    if (trait === undefined) break;

    const optionIndex = DIGITS.indexOf(digit);
    const option = optionIndex < 0 ? undefined : trait.options[optionIndex];

    if (option === undefined) break;

    // A question is asked at most once on any path down the tree, so a repeat
    // is either a hand-edited URL or a stale link. Either way the walk ends.
    if (seen.has(trait.id)) break;

    seen.add(trait.id);
    answers.push({ trait: trait.id, value: option.value });
  }

  return answers;
}
