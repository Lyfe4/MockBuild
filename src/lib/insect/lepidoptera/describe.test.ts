import { describe, expect, it } from 'vitest';

import { describeMoth } from './describe';
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
  fringe: true,
  dusting: false,
  dustingDensity: 0.4,
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

  it('mentions bands only when there are some', () => {
    expect(describeMoth(form({ bandCount: 2 }))).toContain('bands');
    expect(describeMoth(form({ bandCount: 0 }))).not.toContain('bands');
  });

  it('mentions eyespots only when there are some', () => {
    expect(describeMoth(form({ eyespotCount: 2 }))).toContain('eyespots');
    expect(describeMoth(form({ eyespotCount: 0 }))).not.toContain('eyespot');
  });

  it('mentions dusting only when it is drawn', () => {
    expect(describeMoth(form({ dusting: true }))).toContain('dusting');
    expect(describeMoth(form({ dusting: false }))).not.toContain('dusting');
  });

  it('still reads correctly with nothing optional to say', () => {
    const text = describeMoth(form({ bandCount: 0, eyespotCount: 0, dusting: false }));

    expect(text).not.toContain(' and .');
    expect(text).not.toContain(', .');
    expect(text).toMatch(/antennae\.$/);
  });

  it('is pure: the same form always gives the same sentence', () => {
    expect(describeMoth(form())).toBe(describeMoth(form()));
  });
});
