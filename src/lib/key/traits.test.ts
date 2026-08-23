import { describe, expect, it } from 'vitest';

import { SPECIES } from '@/data';
import {
  ANTENNA_FORMS,
  BODY_SHAPES,
  COLOUR_FAMILIES,
  MARKING_FORMS,
  SIZE_CLASSES,
  WING_COVERS,
} from '@/types';

import { findTrait, KEY_TRAIT_IDS, KEY_TRAITS, traitValue } from './traits';

/**
 * The questions, checked against the vocabulary they are derived from.
 *
 * The point of the trait table is that it cannot drift from `Morphology`: every
 * field is a question, every state is an option, and a state with no words is a
 * build error rather than a slug on screen. These are the runtime half of that
 * — the half TypeScript cannot state, which is that the *list* is complete and
 * in the union's own order.
 */
const UNIONS: Record<string, readonly string[]> = {
  wingCover: WING_COVERS,
  antennae: ANTENNA_FORMS,
  markings: MARKING_FORMS,
  bodyShape: BODY_SHAPES,
  sizeClass: SIZE_CLASSES,
  colourFamily: COLOUR_FAMILIES,
};

describe('KEY_TRAITS', () => {
  it('asks about every morphology character and nothing else', () => {
    const characters = Object.keys(SPECIES[0]?.morphology ?? {});

    // A new character on the record is a new question here. Without this, one
    // could be added and the key would quietly go on asking the old six.
    expect([...KEY_TRAIT_IDS].sort()).toStrictEqual(characters.sort());
  });

  it('offers every state of each character, in the union’s order', () => {
    for (const trait of KEY_TRAITS) {
      expect(
        trait.options.map((option) => option.value),
        trait.id,
      ).toStrictEqual(UNIONS[trait.id]);
    }
  });

  it('gives every option words a reader could act on', () => {
    /*
     * The characters whose *states* are jargon, where a label repeating the
     * state would be asking the reader to already know the answer — "lamellate"
     * is a fact about the animal, not a question anybody can answer. Colour is
     * deliberately absent: `green` is the everyday word for green, and dressing
     * it up would be worse than plain.
     */
    const jargon = ['wingCover', 'antennae', 'markings', 'bodyShape', 'sizeClass'];

    for (const trait of KEY_TRAITS) {
      expect(trait.question, trait.id).toMatch(/\?$/);

      for (const option of trait.options) {
        expect(option.label, `${trait.id}.${option.value}`).not.toBe('');

        if (!jargon.includes(trait.id)) continue;

        expect(option.label.toLowerCase(), `${trait.id}.${option.value}`).not.toBe(
          option.value.toLowerCase(),
        );
      }
    }
  });

  it('has an option for everything the collection actually is', () => {
    // The other direction: a record whose state the key does not offer is a
    // record the key cannot reach.
    for (const species of SPECIES) {
      for (const trait of KEY_TRAITS) {
        const value = traitValue(species, trait.id);

        expect(
          trait.options.map((option) => option.value),
          `${species.id}.${trait.id}`,
        ).toContain(value);
      }
    }
  });

  it('reads a value straight off the record', () => {
    const species = SPECIES[0];

    expect(species).toBeDefined();
    expect(traitValue(species!, 'wingCover')).toBe(species!.morphology.wingCover);
  });
});

describe('findTrait', () => {
  it('finds a trait by id', () => {
    expect(findTrait('colourFamily')?.question).toBe(KEY_TRAITS.at(-1)?.question);
  });

  it('returns nothing for a character the key does not ask about', () => {
    expect(findTrait('sizeBasis')).toBeUndefined();
  });
});
