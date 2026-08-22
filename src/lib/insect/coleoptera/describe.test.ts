import { describe, expect, it } from 'vitest';

import { describeBeetle } from './describe';
import { ANTENNA_TYPES, MARKING_TYPES, type BeetleForm } from './types';

const BASE_FORM: BeetleForm = {
  bodyLength: 0.9,
  bodyWidth: 0.8,
  headWidth: 0.6,
  eyeSize: 0.6,
  antennaType: 'filiform',
  antennaLength: 1,
  mandibleSize: 0.2,
  pronotumShape: 'rounded',
  pronotumWidth: 0.85,
  pronotumRidge: true,
  horn: false,
  hornLength: 0.5,
  elytraLength: 0.85,
  elytraWidth: 1,
  elytraTaper: 0.3,
  striaeCount: 5,
  punctures: true,
  legLength: 1,
  femurThickness: 1,
  legSpread: 0.6,
  tibialSpines: true,
  marking: 'spots',
  markingCount: 4,
  markingSize: 0.9,
  scale: 0.95,
};

const form = (overrides: Partial<BeetleForm> = {}): BeetleForm => ({ ...BASE_FORM, ...overrides });

describe('describeBeetle', () => {
  it('reads as one plain sentence', () => {
    const text = describeBeetle(form());

    expect(text.startsWith('A')).toBe(true);
    expect(text.endsWith('.')).toBe(true);
    expect(text.slice(0, -1)).not.toContain('.');
  });

  it('says it is drawn from above, which is the whole convention of the plate', () => {
    expect(describeBeetle(form())).toContain('from above');
  });

  it('gets the article right in front of a vowel', () => {
    // "A oval beetle" is exactly the tell that a sentence was assembled rather
    // than written.
    expect(describeBeetle(form({ bodyWidth: 0.9, elytraWidth: 0.9 }))).toMatch(/^An oval/);
    expect(describeBeetle(form({ bodyWidth: 0.5, elytraWidth: 0.6 }))).toMatch(/^A slender/);
  });

  describe('antennae', () => {
    it.each([...ANTENNA_TYPES])('describes %s antennae', (antennaType) => {
      expect(describeBeetle(form({ antennaType }))).toContain('antennae');
    });

    it('gives each type its own wording', () => {
      const descriptions = ANTENNA_TYPES.map((antennaType) =>
        describeBeetle(form({ antennaType })),
      );

      // Four types that all read the same would make the description useless
      // for telling one drawing from another.
      expect(new Set(descriptions).size).toBe(ANTENNA_TYPES.length);
    });

    it.each([
      ['filiform', 'thread-like'],
      ['clavate', 'club'],
      ['lamellate', 'fan of flat plates'],
      ['serrate', 'saw-toothed'],
    ] as const)('names the %s character', (antennaType, phrase) => {
      expect(describeBeetle(form({ antennaType }))).toContain(phrase);
    });
  });

  describe('markings', () => {
    it.each(MARKING_TYPES.filter((type) => type !== 'none'))('describes %s', (marking) => {
      const text = describeBeetle(form({ marking }));

      expect(text).toMatch(/spots|bands|stripe/);
    });

    it('gives each marking type its own wording', () => {
      const withMarkings = MARKING_TYPES.filter((type) => type !== 'none');
      const descriptions = withMarkings.map((marking) => describeBeetle(form({ marking })));

      expect(new Set(descriptions).size).toBe(withMarkings.length);
    });

    it('says nothing about markings when there are none', () => {
      const text = describeBeetle(form({ marking: 'none' }));

      expect(text).not.toMatch(/spots|bands|stripe/);
    });

    it.each([
      [1, 'a single'],
      [2, 'a pair of'],
      [3, 'a few'],
      [8, 'numerous'],
    ] as const)('counts %i as "%s"', (markingCount, phrase) => {
      expect(describeBeetle(form({ marking: 'spots', markingCount }))).toContain(phrase);
    });
  });

  describe('the showy characters', () => {
    it('mentions enlarged mandibles only when they are enlarged', () => {
      expect(describeBeetle(form({ mandibleSize: 1.3 }))).toContain('antler-like jaws');
      expect(describeBeetle(form({ mandibleSize: 0.1 }))).not.toContain('antler-like jaws');
    });

    it('mentions the horn only when there is one', () => {
      expect(describeBeetle(form({ horn: true }))).toContain('horn');
      expect(describeBeetle(form({ horn: false }))).not.toContain('horn');
    });
  });

  it('describes grooving in proportion to the striae', () => {
    expect(describeBeetle(form({ striaeCount: 8 }))).toContain('deeply grooved');
    expect(describeBeetle(form({ striaeCount: 2 }))).toContain('finely grooved');
    expect(describeBeetle(form({ striaeCount: 0 }))).not.toContain('grooved');
  });

  it('still reads correctly with only one clause to say', () => {
    const text = describeBeetle(
      form({ striaeCount: 0, marking: 'none', mandibleSize: 0, horn: false }),
    );

    // No stray "and" and no dangling comma when everything optional is off.
    expect(text).not.toContain(' and .');
    expect(text).not.toContain(', .');
    expect(text).toMatch(/with .+ antennae\.$/);
  });

  it('is pure: the same form always gives the same sentence', () => {
    expect(describeBeetle(form())).toBe(describeBeetle(form()));
  });
});
