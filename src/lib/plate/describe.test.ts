import { describe, expect, it } from 'vitest';

import { LUCANUS_CERVUS } from '@/data/species';
import type { Species } from '@/types';

import { describePlate } from './describe';

/**
 * The alt text is the only part of the plate a screen reader ever gets, and it
 * is the part nobody looking at the page will notice is wrong. So it is checked
 * for the thing that actually matters — that it reads as a sentence about an
 * animal — rather than only for the presence of substrings.
 */
describe('describePlate', () => {
  it('describes the spike species as a sentence', () => {
    expect(
      describePlate(LUCANUS_CERVUS, {
        sex: 'male',
        hallmark: 'large antler-like mandibles',
      }),
    ).toBe(
      'Dorsal view of a male European stag beetle, dark brown, with large antler-like mandibles and lamellate antennae.',
    );
  });

  it('says nothing about sex when the animal is drawn unsexed', () => {
    const sentence = describePlate(LUCANUS_CERVUS);

    expect(sentence).not.toMatch(/male|female/);
    expect(sentence.startsWith('Dorsal view of a European stag beetle,')).toBe(true);
  });

  it('falls back to size, shape and wing covering when no hallmark is named', () => {
    expect(describePlate(LUCANUS_CERVUS, { sex: 'female' })).toBe(
      'Dorsal view of a female European stag beetle, dark brown, with large, elongate body and hardened wing cases and lamellate antennae.',
    );
  });

  it('is always one sentence, ending in a full stop', () => {
    const sentence = describePlate(LUCANUS_CERVUS, { hallmark: 'antler-like mandibles' });

    expect(sentence.endsWith('.')).toBe(true);
    expect(sentence.slice(0, -1)).not.toContain('.');
  });

  it('reads the morphology out of the record, so the two cannot drift', () => {
    const recoloured: Species = {
      ...LUCANUS_CERVUS,
      morphology: { ...LUCANUS_CERVUS.morphology, colourFamily: 'metallic', antennae: 'serrate' },
    };

    expect(describePlate(recoloured)).toContain('metallic');
    expect(describePlate(recoloured)).toContain('saw-toothed antennae');
  });

  it('adds a marking clause only when there is something to say', () => {
    const spotted: Species = {
      ...LUCANUS_CERVUS,
      morphology: { ...LUCANUS_CERVUS.morphology, markings: 'spots' },
    };

    expect(describePlate(LUCANUS_CERVUS)).not.toContain('spotted');
    expect(describePlate(spotted)).toMatch(/, spotted\.$/);
  });

  it('picks the article from the word that follows it', () => {
    // "a male" but "an oil beetle": the article has to look at whichever word
    // comes next, which is the sex when there is one and the name when not.
    const vowel: Species = { ...LUCANUS_CERVUS, commonName: 'oil beetle' };

    expect(describePlate(vowel)).toMatch(/^Dorsal view of an oil beetle/);
    expect(describePlate(vowel, { sex: 'male' })).toMatch(/^Dorsal view of a male oil beetle/);
  });

  it('picks the article by sound, not by spelling', () => {
    // The spike species breaks the naive rule on its first word: "a European",
    // never "an European".
    expect(describePlate(LUCANUS_CERVUS)).toMatch(/^Dorsal view of a European/);

    const unicorn: Species = { ...LUCANUS_CERVUS, commonName: 'unicorn beetle' };

    expect(describePlate(unicorn)).toMatch(/^Dorsal view of a unicorn beetle/);
  });
});
