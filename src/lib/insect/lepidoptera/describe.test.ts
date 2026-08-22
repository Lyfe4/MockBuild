import { describe, expect, it } from 'vitest';

import { describeMoth } from './describe';
import { PIGMENTS, pigmentWord } from '../core';
import { FOREWING_SHAPES, HINDWING_SHAPES, MOTH_ANTENNA_TYPES, type MothForm } from './types';

const BASE_FORM: MothForm = {
  forewingShape: 'triangular',
  hindwingShape: 'rounded',
  wingSpan: 1,
  wingAspect: 0.62,
  hindwingScale: 0.78,
  bodyLength: 0.85,
  bodyThickness: 0.7,
  antennaType: 'filiform',
  antennaLength: 0.7,
  veinCount: 5,
  bandCount: 2,
  eyespotCount: 1,
  eyespotSize: 0.8,
  eyespotRings: 2,
  eyespotPupil: true,
  bandWidth: 1,
  patterns: ['marginalBand', 'eyespot'],
  pigment: 3,
  fringe: true,
  dustingDensity: 0.4,
  hatching: 0.3,
  scale: 0.94,
};

const form = (overrides: Partial<MothForm> = {}): MothForm => ({ ...BASE_FORM, ...overrides });

describe('describeMoth', () => {
  it('reads as one plain sentence', () => {
    const text = describeMoth(form());

    expect(text.startsWith('A ')).toBe(true);
    expect(text.endsWith('.')).toBe(true);
    expect(text.slice(0, -1)).not.toContain('.');
  });

  it('says the wings are spread, which is the convention of the plate', () => {
    expect(describeMoth(form())).toContain('wings spread');
  });

  it.each([...FOREWING_SHAPES])('describes %s forewings', (forewingShape) => {
    expect(describeMoth(form({ forewingShape }))).toContain('forewings');
  });

  it('gives each forewing shape its own wording', () => {
    const descriptions = FOREWING_SHAPES.map((forewingShape) =>
      describeMoth(form({ forewingShape })),
    );

    expect(new Set(descriptions).size).toBe(FOREWING_SHAPES.length);
  });

  it.each([...HINDWING_SHAPES])('describes %s hindwings', (hindwingShape) => {
    expect(describeMoth(form({ hindwingShape }))).toContain('hindwings');
  });

  it('gives each hindwing shape its own wording', () => {
    const descriptions = HINDWING_SHAPES.map((hindwingShape) =>
      describeMoth(form({ hindwingShape })),
    );

    expect(new Set(descriptions).size).toBe(HINDWING_SHAPES.length);
  });

  it.each([...MOTH_ANTENNA_TYPES])('describes %s antennae', (antennaType) => {
    expect(describeMoth(form({ antennaType }))).toContain('antennae');
  });

  it('gives each antenna type its own wording', () => {
    const descriptions = MOTH_ANTENNA_TYPES.map((antennaType) =>
      describeMoth(form({ antennaType })),
    );

    expect(new Set(descriptions).size).toBe(MOTH_ANTENNA_TYPES.length);
  });

  it('names the tails, which are the whole silhouette when present', () => {
    expect(describeMoth(form({ hindwingShape: 'tailed' }))).toContain('tails');
  });

  it('mentions bands only when the layer is carried and there are some', () => {
    expect(describeMoth(form({ patterns: ['marginalBand'], bandCount: 2 }))).toContain('bands');
    expect(describeMoth(form({ patterns: ['marginalBand'], bandCount: 0 }))).not.toContain('bands');
    expect(describeMoth(form({ patterns: ['dusting'], bandCount: 2 }))).not.toContain('bands');
  });

  it('says the bands follow the margin, which is the whole point of them', () => {
    expect(describeMoth(form({ patterns: ['marginalBand'], bandCount: 2 }))).toContain(
      'following the wing margins',
    );
  });

  it('mentions eyespots only when the layer is carried and there are some', () => {
    expect(describeMoth(form({ patterns: ['eyespot'], eyespotCount: 2 }))).toContain('eyespots');
    expect(describeMoth(form({ patterns: ['eyespot'], eyespotCount: 0 }))).not.toContain('eyespot');
    expect(describeMoth(form({ patterns: ['dusting'], eyespotCount: 2 }))).not.toContain('eyespot');
  });

  it('mentions dusting only when it is drawn', () => {
    expect(describeMoth(form({ patterns: ['dusting'] }))).toContain('dusting');
    expect(describeMoth(form({ patterns: ['discalSpot'] }))).not.toContain('dusting');
  });

  it('names the new pattern layers', () => {
    expect(describeMoth(form({ patterns: ['apexPatch'] }))).toContain('wing tip');
    expect(describeMoth(form({ patterns: ['discalSpot'] }))).toContain(
      'in the middle of each wing',
    );
  });

  it('describes the layers in painting order, so it reads as the wing was built', () => {
    const text = describeMoth(form({ patterns: ['dusting', 'apexPatch', 'eyespot'] }));

    expect(text.indexOf('dusting')).toBeLessThan(text.indexOf('wing tip'));
    expect(text.indexOf('wing tip')).toBeLessThan(text.indexOf('eyespots'));
  });

  it('still reads correctly with nothing optional to say', () => {
    const text = describeMoth(form({ patterns: [] }));

    expect(text).not.toContain(' and .');
    expect(text).not.toContain(', .');
    expect(text).toMatch(/antennae[.]$/);
  });

  describe('colouring', () => {
    it.each([...PIGMENTS])('names the colour for pigment %i', (pigment) => {
      expect(describeMoth(form({ pigment }))).toContain(pigmentWord(pigment));
    });

    it('gives every pigment its own wording', () => {
      const descriptions = PIGMENTS.map((pigment) => describeMoth(form({ pigment })));

      expect(new Set(descriptions).size).toBe(PIGMENTS.length);
    });

    it('puts the colour with the size, before the wing characters', () => {
      expect(describeMoth(form({ pigment: 3 }))).toMatch(
        /^A .+ moth in olive, drawn from above with wings spread: /,
      );
    });
  });

  it('is pure: the same form always gives the same sentence', () => {
    expect(describeMoth(form())).toBe(describeMoth(form()));
  });
});
