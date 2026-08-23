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
 * ## The wire form, and why it is not a position
 *
 * Four base-36 characters per answer, hashed from the two *names* — the trait's
 * id and the `Morphology` value — and from nothing else.
 *
 * The first version of this file spent one character on the trait's index in
 * `KEY_TRAITS` and one on the value's index in that trait's option list, which
 * was two characters instead of four and wrong in a way that only showed up
 * later: an index is a statement about the *order of a union*, and unions grow
 * in the middle. Adding `iridescent` to `COLOUR_FAMILIES` between `green` and
 * `grey` renumbered `grey` and `metallic`, so every link anybody had shared
 * that named one of them silently came back as the other. A shared link that
 * decodes to a different animal is worse than one that fails.
 *
 * A hash of the name has no such neighbours. `elytra` is `elytra` wherever it
 * sits in the list, and the only thing that can change its code is renaming the
 * value — which is a change to the record vocabulary, is a rename anybody can
 * see, and is the one case where an old link *should* stop.
 *
 * Four characters rather than three is collision headroom. The whole vocabulary
 * is around forty pairs today and the codes have to be distinct, which
 * `answers.test.ts` asserts; three characters would leave a couple of per cent
 * of collision risk per new character state and make that assertion a coin
 * toss, and four makes it a backstop. Six answers is twenty-four characters,
 * which is shorter than the season parameter it sits beside.
 *
 * This module validates the *string*: syntax, and that every code names a pair
 * the vocabulary holds. Whether an answer makes sense where it appears in the
 * walk is `advance`'s question, and it is a different one — a decoded answer can
 * be perfectly well-formed and still not answer the question the tree asks at
 * that point.
 */

/** One answer: which question, and which of its options. */
export interface KeyAnswer {
  readonly trait: KeyTraitId;
  /** The `Morphology` value, not the label. */
  readonly value: string;
}

/** How many base-36 characters one answer spends. See the note above. */
export const ANSWER_CODE_LENGTH = 4;

/**
 * The parameter name. Short, because it sits beside `season` in a shared link.
 */
export const KEY_PARAM = 'k';

/**
 * The code for one answer, from the two names and nothing else.
 *
 * FNV-1a over `trait.value`, folded into 36^4. Chosen because it is four lines
 * long, has no dependencies and cannot drift: a link minted today has to decode
 * the same way in five years, so the derivation has to be something that can be
 * read off this file rather than a library version.
 *
 * Exported because it is the thing worth testing. A test can ask what
 * `answerCode('colourFamily', 'grey')` is without building a tree, and can
 * prove that the answer does not depend on what else is in the union — which is
 * the whole property this encoding exists for.
 */
export function answerCode(trait: string, value: string): string {
  const text = `${trait}.${value}`;
  // 32-bit FNV-1a. `>>> 0` after each step keeps it unsigned, and Math.imul is
  // what makes the multiply wrap at 32 bits rather than losing precision.
  let hash = 0x811c9dc5;

  for (let at = 0; at < text.length; at += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(at), 0x01000193) >>> 0;
  }

  return (hash % 36 ** ANSWER_CODE_LENGTH)
    .toString(36)
    .padStart(ANSWER_CODE_LENGTH, '0')
    .slice(-ANSWER_CODE_LENGTH);
}

/**
 * Every answer the vocabulary allows, by its code.
 *
 * Built once at module load from `KEY_TRAITS`, which is where the collision
 * check lives too: two pairs hashing to one code would make a link ambiguous,
 * so the map would silently hold one of them. `answers.test.ts` asserts the map
 * is as large as the vocabulary, which is the assertion that says so.
 */
const BY_CODE: ReadonlyMap<string, KeyAnswer> = new Map(
  KEY_TRAITS.flatMap((trait) =>
    trait.options.map(
      (option) =>
        [answerCode(trait.id, option.value), { trait: trait.id, value: option.value }] as const,
    ),
  ),
);

/** How many answers the vocabulary can express. For the collision assertion. */
export const ANSWER_VOCABULARY_SIZE = KEY_TRAITS.reduce(
  (total, trait) => total + trait.options.length,
  0,
);

/** Every code the vocabulary mints, so a test can ask them all at once. */
export function answerCodes(): Map<string, KeyAnswer> {
  return new Map(BY_CODE);
}

/**
 * Answers to a wire string.
 *
 * Stops at the first answer it cannot encode rather than dropping it and
 * carrying on: the answers are a path, and a path with a hole in it is not a
 * shorter path, it is a different one.
 *
 * A pair the vocabulary does not hold cannot be encoded even though
 * `answerCode` would happily hash it, because a code nothing can decode is not
 * a link, it is four characters that end the walk one step early.
 */
export function encodeAnswers(answers: readonly KeyAnswer[]): string {
  let encoded = '';

  for (const answer of answers) {
    const code = answerCode(answer.trait, answer.value);

    if (BY_CODE.get(code) === undefined) break;

    encoded += code;
  }

  return encoded;
}

/**
 * A wire string back to answers, dropping anything it cannot read.
 *
 * A URL is user input and user input arrives broken, so nothing here throws: a
 * length that is not a multiple of four, a code no pair hashes to, or a trait
 * answered twice all end the walk at the last code that made sense. The prefix
 * is kept because a prefix of a valid path is a valid path — it is the same key
 * with fewer questions answered.
 *
 * @param raw The parameter's value, or `null` when it is absent.
 */
export function decodeAnswers(raw: string | null): KeyAnswer[] {
  if (raw === null) return [];

  const answers: KeyAnswer[] = [];
  const seen = new Set<KeyTraitId>();
  const text = raw.trim().toLowerCase();

  // Four characters at a time; a trailing partial code is the end of the walk.
  for (let at = 0; at + ANSWER_CODE_LENGTH <= text.length; at += ANSWER_CODE_LENGTH) {
    const answer = BY_CODE.get(text.slice(at, at + ANSWER_CODE_LENGTH));

    if (answer === undefined) break;

    // A question is asked at most once on any path down the tree, so a repeat
    // is either a hand-edited URL or a stale link. Either way the walk ends.
    if (seen.has(answer.trait)) break;

    seen.add(answer.trait);
    answers.push(answer);
  }

  return answers;
}
