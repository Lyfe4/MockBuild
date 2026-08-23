import { describe, expect, it } from 'vitest';

import { decodeAnswers, encodeAnswers, type KeyAnswer } from './answers';
import { KEY_TRAITS } from './traits';

/**
 * The wire form, checked the way a URL arrives: broken.
 *
 * Round trips first, then every way a hand-edited or stale link can be wrong.
 * Nothing throws — a query string is user input, and the answer to bad input
 * here is a shorter walk rather than an error page.
 */

/** The first option of the first trait, and so on — built, not hard-coded. */
const answerTo = (traitIndex: number, optionIndex: number): KeyAnswer => {
  const trait = KEY_TRAITS[traitIndex]!;

  return { trait: trait.id, value: trait.options[optionIndex]!.value };
};

describe('encodeAnswers', () => {
  it('spends two characters on an answer', () => {
    expect(encodeAnswers([answerTo(0, 0)])).toBe('a0');
    expect(encodeAnswers([answerTo(0, 0), answerTo(1, 2)])).toBe('a0b2');
  });

  it('encodes nothing as an empty string', () => {
    expect(encodeAnswers([])).toBe('');
  });

  it('spends two characters even on the widest question', () => {
    const widest = [...KEY_TRAITS].sort((a, b) => b.options.length - a.options.length)[0]!;
    const last = widest.options.at(-1)!;

    // Colour already has ten states. The option digit is base 36 rather than
    // base 10 so an eleventh would still be one character, and a two-character
    // answer stays two characters.
    expect(widest.options.length).toBeGreaterThanOrEqual(10);
    expect(encodeAnswers([{ trait: widest.id, value: last.value }])).toHaveLength(2);
  });

  it('stops at an answer it cannot encode, rather than leaving a hole', () => {
    const answers = [
      answerTo(0, 0),
      { trait: 'wingCover', value: 'nonsense' } as KeyAnswer,
      answerTo(2, 1),
    ];

    // The answers are a path. A path with a step missing is not a shorter path,
    // it is a different one.
    expect(encodeAnswers(answers)).toBe('a0');
  });
});

describe('decodeAnswers', () => {
  it('round-trips every answer', () => {
    const answers = [answerTo(0, 1), answerTo(3, 2), answerTo(5, 9)];

    expect(decodeAnswers(encodeAnswers(answers))).toStrictEqual(answers);
  });

  it('round-trips the string, so a link normalises to itself', () => {
    const encoded = 'a1d2f9';

    expect(encodeAnswers(decodeAnswers(encoded))).toBe(encoded);
  });

  it('reads an absent parameter as no answers', () => {
    expect(decodeAnswers(null)).toStrictEqual([]);
    expect(decodeAnswers('')).toStrictEqual([]);
  });

  it('is forgiving about case and surrounding space', () => {
    expect(decodeAnswers('  A0B2  ')).toStrictEqual([answerTo(0, 0), answerTo(1, 2)]);
  });

  it('drops a trailing half-answer', () => {
    expect(decodeAnswers('a0b')).toStrictEqual([answerTo(0, 0)]);
  });

  it('stops at a trait that does not exist', () => {
    // `z` is past the end of KEY_TRAITS, so everything from there is dropped.
    expect(decodeAnswers('a0z1b2')).toStrictEqual([answerTo(0, 0)]);
  });

  it('stops at an option that does not exist', () => {
    // The first trait has five states; `9` is not one of them.
    expect(decodeAnswers('a0a9')).toStrictEqual([answerTo(0, 0)]);
  });

  it('stops at a question asked twice', () => {
    // No path down the tree asks a trait twice, so this is a hand-edited or
    // stale link either way.
    expect(decodeAnswers('a0a1')).toStrictEqual([answerTo(0, 0)]);
  });

  it('drops characters that are not part of the alphabet at all', () => {
    expect(decodeAnswers('a0!!b2')).toStrictEqual([answerTo(0, 0)]);
    expect(decodeAnswers('%%%%')).toStrictEqual([]);
  });

  it('cannot return more answers than there are questions', () => {
    // Six traits, so six pairs at most however long the string is.
    const long = 'a0b0c0d0e0f0a0b0c0';

    expect(decodeAnswers(long).length).toBeLessThanOrEqual(KEY_TRAITS.length);
  });
});
