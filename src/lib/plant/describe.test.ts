import { describe, expect, it } from 'vitest';

import { describePlant } from './describe';
import { FLOWER_TYPES, LEAF_SHAPES, PLANT_HABITS, type PlantForm } from './types';

const BASE_FORM: PlantForm = {
  habit: 'upright',
  branchCount: 3,
  branchDepth: 3,
  branchAngle: 28,
  stemCurve: 0.12,
  leafShape: 'ovate',
  leafDensity: 0.6,
  leafArrangement: 'alternate',
  lobeCount: 5,
  flowerType: 'cluster',
  flowerSize: 1,
  petalCount: 5,
  roots: false,
  height: 0.7,
  scale: 0.9,
};

const form = (overrides: Partial<PlantForm> = {}): PlantForm => ({ ...BASE_FORM, ...overrides });

describe('describePlant', () => {
  it('reads as one plain sentence', () => {
    const text = describePlant(form());

    expect(text.startsWith('A ')).toBe(true);
    expect(text.endsWith('.')).toBe(true);
    // One sentence: no full stop other than the closing one.
    expect(text.slice(0, -1)).not.toContain('.');
  });

  it('describes each leaf shape distinctly', () => {
    const descriptions = LEAF_SHAPES.map((leafShape) => describePlant(form({ leafShape })));

    // Every shape produces a different sentence — no two collapse to the same
    // wording, which would make the alt text useless for telling them apart.
    expect(new Set(descriptions).size).toBe(LEAF_SHAPES.length);
  });

  it.each(LEAF_SHAPES)('mentions leaves for the %s shape', (leafShape) => {
    expect(describePlant(form({ leafShape, leafDensity: 0.6 }))).toContain('leaves');
  });

  it('describes each flower arrangement distinctly', () => {
    const withFlowers = FLOWER_TYPES.filter((type) => type !== 'none');
    const descriptions = withFlowers.map((flowerType) => describePlant(form({ flowerType })));

    expect(new Set(descriptions).size).toBe(withFlowers.length);
  });

  it.each(FLOWER_TYPES.filter((type) => type !== 'none'))(
    'mentions flowers for the %s arrangement',
    (flowerType) => {
      expect(describePlant(form({ flowerType }))).toContain('flower');
    },
  );

  it('says nothing about flowers when there are none', () => {
    expect(describePlant(form({ flowerType: 'none' }))).not.toContain('flower');
  });

  it('says the stems are bare rather than describing absent leaves', () => {
    const text = describePlant(form({ leafDensity: 0 }));

    expect(text).toContain('bare stems');
    expect(text).not.toContain('leaves');
  });

  it.each([
    [0.9, 'tall'],
    [0.6, 'medium-height'],
    [0.35, 'low'],
  ] as const)('describes height %s as %s', (height, expected) => {
    expect(describePlant(form({ height }))).toContain(expected);
  });

  it.each([
    [1.5, 'large'],
    [1, 'medium-sized'],
    [0.5, 'small'],
  ] as const)('describes flower size %s as %s', (flowerSize, expected) => {
    expect(describePlant(form({ flowerSize, flowerType: 'single' }))).toContain(expected);
  });

  it.each([
    [{ branchDepth: 1 }, 'barely branched'],
    [{ branchCount: 1, branchDepth: 2 }, 'sparsely branched'],
    [{ branchCount: 5, branchDepth: 4 }, 'densely branched'],
  ] as const)('describes the branching habit as %o -> %s', (overrides, expected) => {
    expect(describePlant(form(overrides))).toContain(expected);
  });

  it('is pure: the same form always gives the same sentence', () => {
    expect(describePlant(form())).toBe(describePlant(form()));
  });

  describe('habit', () => {
    it.each(PLANT_HABITS)('describes the %s habit distinctly', (habit) => {
      const others = PLANT_HABITS.filter((other) => other !== habit).map((other) =>
        describePlant(form({ habit: other })),
      );

      expect(others).not.toContain(describePlant(form({ habit })));
    });

    it.each([
      ['upright', 'upright'],
      ['arching', 'arching'],
      ['rosette', 'rosette'],
      ['tuft', 'tuft'],
      ['trailing', 'trailing'],
    ] as const)('names the %s habit in the sentence', (habit, word) => {
      expect(describePlant(form({ habit }))).toContain(word);
    });

    it('does not claim a rosette or a tuft is branched', () => {
      // Neither habit branches at all, so a branching phrase would be a lie
      // rather than merely unhelpful.
      for (const habit of ['rosette', 'tuft'] as const) {
        expect(describePlant(form({ habit, branchCount: 5, branchDepth: 5 }))).not.toContain(
          'branched',
        );
      }
    });
  });

  describe('roots', () => {
    it('mentions exposed roots when they are drawn', () => {
      expect(describePlant(form({ roots: true }))).toContain('roots');
    });

    it('says nothing about roots when they are not', () => {
      expect(describePlant(form({ roots: false }))).not.toContain('roots');
    });

    it('still reads as one sentence with roots and no flowers', () => {
      const text = describePlant(form({ roots: true, flowerType: 'none' }));

      expect(text).toContain('and shown with its roots exposed.');
      expect(text.slice(0, -1)).not.toContain('.');
      // A missing conjunction would leave a double space where the clause joins.
      expect(text).not.toContain('  ');
    });

    it('still reads as one sentence with roots and flowers', () => {
      const text = describePlant(form({ roots: true, flowerType: 'spike' }));

      expect(text).toContain('flowers');
      expect(text).toContain('roots exposed.');
      expect(text).not.toContain('  ');
    });
  });
});
