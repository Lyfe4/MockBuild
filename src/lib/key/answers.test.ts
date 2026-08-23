import { describe, expect, it } from 'vitest';

import {
  answerCode,
  answerCodes,
  ANSWER_CODE_LENGTH,
  ANSWER_VOCABULARY_SIZE,
  decodeAnswers,
  encodeAnswers,
  type KeyAnswer,
} from './answers';
import { KEY_TRAITS } from './traits';

/**
 * The wire form, checked the way a URL arrives: broken.
 *
 * Round trips first, then the property the encoding exists for — a code depends
 * on the two *names* and on nothing else, so a union can grow in the middle
 * without renumbering anybody — then every way a hand-edited or stale link can
 * be wrong. Nothing throws: a query string is user input, and the answer to bad
 * input here is a shorter walk rather than an error page.
 */

/** The first option of the first trait, and so on — built, not hard-coded. */
const answerTo = (traitIndex: number, optionIndex: number): KeyAnswer => {
  const trait = KEY_TRAITS[traitIndex]!;

  return { trait: trait.id, value: trait.options[optionIndex]!.value };
};

describe('answerCode', () => {
  it('spends the same four characters on every answer', () => {
    for (const trait of KEY_TRAITS) {
      for (const option of trait.options) {
        expect(answerCode(trait.id, option.value), `${trait.id}=${option.value}`).toHaveLength(
          ANSWER_CODE_LENGTH,
        );
        expect(answerCode(trait.id, option.value)).toMatch(/^[0-9a-z]{4}$/);
      }
    }
  });

  it('gives the whole vocabulary distinct codes', () => {
    // Two pairs hashing to one code would make a link ambiguous and the lookup
    // would silently hold one of them. Four base-36 characters is 1.7 million
    // slots against forty-odd pairs, so this is a backstop rather than a
    // gamble — but it is the assertion that says the gamble was not taken.
    expect(answerCodes().size).toBe(ANSWER_VOCABULARY_SIZE);
  });

  it('depends on the two names and on nothing around them', () => {
    // The property the whole encoding exists for. A value's code is a function
    // of its own name, so a union may grow at either end or in the middle and
    // every link already shared still means what it meant.
    const before = KEY_TRAITS.flatMap((trait) =>
      trait.options.map((option) => answerCode(trait.id, option.value)),
    );

    // A hypothetical eleventh colour, inserted between `green` and `grey` —
    // where an index-based encoding renumbered `grey` and `metallic` and turned
    // every link naming either of them into a link naming the other.
    const colours = KEY_TRAITS.find((trait) => trait.id === 'colourFamily')!;
    const at = colours.options.findIndex((option) => option.value === 'grey');
    const grown = [
      ...colours.options.slice(0, at),
      { value: 'iridescent', label: 'Shifting colour with the angle' },
      ...colours.options.slice(at),
    ];

    expect(at).toBeGreaterThan(0);
    expect(grown).toHaveLength(colours.options.length + 1);

    const after = KEY_TRAITS.flatMap((trait) =>
      (trait.id === 'colourFamily' ? grown : trait.options).flatMap((option) =>
        option.value === 'iridescent' ? [] : [answerCode(trait.id, option.value)],
      ),
    );

    expect(after).toStrictEqual(before);
  });

  it('gives the same value under two traits two codes', () => {
    // The trait is part of what is hashed, so `absent` under `wingCover` and a
    // hypothetical `absent` under `markings` cannot be confused for each other.
    expect(answerCode('wingCover', 'absent')).not.toBe(answerCode('markings', 'absent'));
  });

  it('mints the codes it minted when this test was written', () => {
    // Pinned, because the derivation is a promise to every link anybody has
    // shared. Changing FNV-1a, the separator, the width or the base breaks all
    // of them at once, and this is the line that says so out loud.
    expect(answerCode('wingCover', 'elytra')).toBe(answerCode('wingCover', 'elytra'));
    expect({
      elytra: answerCode('wingCover', 'elytra'),
      lamellate: answerCode('antennae', 'lamellate'),
      grey: answerCode('colourFamily', 'grey'),
      large: answerCode('sizeClass', 'large'),
    }).toStrictEqual({
      elytra: '4lpc',
      lamellate: 'p3by',
      grey: 'xh5a',
      large: 'gupl',
    });
  });
});

describe('encodeAnswers', () => {
  it('spends four characters on an answer', () => {
    expect(encodeAnswers([answerTo(0, 0)])).toHaveLength(4);
    expect(encodeAnswers([answerTo(0, 0), answerTo(1, 2)])).toHaveLength(8);
  });

  it('encodes nothing as an empty string', () => {
    expect(encodeAnswers([])).toBe('');
  });

  it('spends four characters even on the widest question', () => {
    const widest = [...KEY_TRAITS].sort((a, b) => b.options.length - a.options.length)[0]!;
    const last = widest.options.at(-1)!;

    // Colour already has ten states, and the code's width has nothing to do
    // with how many there are — which is the difference between this encoding
    // and the one it replaced.
    expect(widest.options.length).toBeGreaterThanOrEqual(10);
    expect(encodeAnswers([{ trait: widest.id, value: last.value }])).toHaveLength(
      ANSWER_CODE_LENGTH,
    );
  });

  it('spends the whole key on a link shorter than a sentence', () => {
    const everything = KEY_TRAITS.map((trait) => ({
      trait: trait.id,
      value: trait.options[0]!.value,
    }));

    // Six answers, four characters each. Worth a test because the encoding was
    // widened deliberately and "compact enough for a URL" was the constraint
    // that decided how far.
    expect(encodeAnswers(everything).length).toBeLessThanOrEqual(24);
  });

  it('stops at an answer it cannot encode, rather than leaving a hole', () => {
    const answers = [
      answerTo(0, 0),
      { trait: 'wingCover', value: 'nonsense' } as KeyAnswer,
      answerTo(2, 1),
    ];

    // The answers are a path. A path with a step missing is not a shorter path,
    // it is a different one.
    expect(encodeAnswers(answers)).toBe(encodeAnswers([answerTo(0, 0)]));
  });
});

describe('decodeAnswers', () => {
  it('round-trips every answer', () => {
    const answers = [answerTo(0, 1), answerTo(3, 2), answerTo(5, 9)];

    expect(decodeAnswers(encodeAnswers(answers))).toStrictEqual(answers);
  });

  it('round-trips the string, so a link normalises to itself', () => {
    const encoded = encodeAnswers([answerTo(0, 1), answerTo(3, 2), answerTo(5, 9)]);

    expect(encodeAnswers(decodeAnswers(encoded))).toBe(encoded);
  });

  it('reads an absent parameter as no answers', () => {
    expect(decodeAnswers(null)).toStrictEqual([]);
    expect(decodeAnswers('')).toStrictEqual([]);
  });

  it('is forgiving about case and surrounding space', () => {
    const encoded = encodeAnswers([answerTo(0, 0), answerTo(1, 2)]);

    expect(decodeAnswers(`  ${encoded.toUpperCase()}  `)).toStrictEqual([
      answerTo(0, 0),
      answerTo(1, 2),
    ]);
  });

  it('drops a trailing part-answer', () => {
    const one = encodeAnswers([answerTo(0, 0)]);

    expect(decodeAnswers(`${one}abc`)).toStrictEqual([answerTo(0, 0)]);
    expect(decodeAnswers(one.slice(0, 3))).toStrictEqual([]);
  });

  it('stops at a code nothing hashes to', () => {
    const one = encodeAnswers([answerTo(0, 0)]);

    // `zzzz` is a well-formed code for nothing, which is what a link built
    // against a renamed character state looks like.
    expect(decodeAnswers(`${one}zzzz${encodeAnswers([answerTo(1, 0)])}`)).toStrictEqual([
      answerTo(0, 0),
    ]);
  });

  it('stops at a question asked twice', () => {
    // No path down the tree asks a trait twice, so this is a hand-edited or
    // stale link either way.
    expect(
      decodeAnswers(encodeAnswers([answerTo(0, 0)]) + encodeAnswers([answerTo(0, 1)])),
    ).toStrictEqual([answerTo(0, 0)]);
  });

  it('drops characters that are not part of the alphabet at all', () => {
    expect(decodeAnswers(`${encodeAnswers([answerTo(0, 0)])}!!!!`)).toStrictEqual([answerTo(0, 0)]);
    expect(decodeAnswers('%%%%%%%%')).toStrictEqual([]);
  });

  it('cannot return more answers than there are questions', () => {
    const every = KEY_TRAITS.map((trait) => ({
      trait: trait.id,
      value: trait.options[0]!.value,
    }));
    const long = encodeAnswers(every).repeat(3);

    expect(decodeAnswers(long).length).toBeLessThanOrEqual(KEY_TRAITS.length);
  });
});
