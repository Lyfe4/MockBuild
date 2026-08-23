import { describe, expect, it } from 'vitest';

import { REQUIRED_PARTS, type PlatePart, type SpeciesPlate } from './types';
import { isValidPlate, validatePlate, type PlateErrorCode } from './validate';

/**
 * Every error class, provoked deliberately.
 *
 * The validator earns its place only if each of these fires, so each gets a
 * test that makes exactly one mistake — a plate with two problems proves
 * nothing about which check caught which.
 */

const REFERENCE = {
  title: 'Test reference',
  artist: 'Nobody',
  year: 1900,
  source: 'https://example.invalid/plate',
  licence: 'Public domain',
} as const;

/** A leg group, so the required-parts list can be satisfied in one line. */
function legs(pair: 'foreleg' | 'midleg' | 'hindleg'): PlatePart[] {
  return (['femur', 'tibia', 'tarsus'] as const).map((segment) => ({
    id: `${pair}-${segment}` as const,
    rank: 'structure' as const,
    fill: 'none' as const,
    d: 'M100 400 C120 420 140 440 160 460',
  }));
}

/** A complete, valid beetle plate. Each test spoils exactly one thing about it. */
function beetlePlate(overrides: readonly PlatePart[] = []): SpeciesPlate {
  return {
    species: 'test-beetle',
    order: 'coleoptera',
    sex: 'male',
    reference: REFERENCE,
    parts: [
      { id: 'head', rank: 'outline', fill: 'pigment', d: 'M0 0 C60 20 80 80 60 140 L0 150 Z' },
      { id: 'eye', rank: 'detail', fill: 'ink', d: 'M70 90 L76 90 L76 96 L70 96 Z' },
      { id: 'antenna', rank: 'structure', fill: 'none', d: 'M70 100 C90 120 110 140 120 160' },
      { id: 'pronotum', rank: 'outline', fill: 'pigment', d: 'M0 150 L110 150 L100 320 L0 320 Z' },
      { id: 'elytron', rank: 'outline', fill: 'pigment', d: 'M0 330 L140 360 L120 980 L0 1000 Z' },
      ...legs('foreleg'),
      ...legs('midleg'),
      ...legs('hindleg'),
      ...overrides,
    ],
  };
}

function codes(plate: SpeciesPlate): PlateErrorCode[] {
  return validatePlate(plate).map((problem) => problem.code);
}

describe('validatePlate', () => {
  it('passes a complete beetle plate', () => {
    expect(validatePlate(beetlePlate())).toEqual([]);
    expect(isValidPlate(beetlePlate())).toBe(true);
  });

  describe('empty-plate', () => {
    it('reports a plate with no parts, and reports nothing else', () => {
      const plate: SpeciesPlate = { ...beetlePlate(), parts: [] };

      // Not "and also every required part is missing": one useful sentence
      // beats fourteen restatements of it.
      expect(codes(plate)).toEqual(['empty-plate']);
    });
  });

  describe('path-syntax', () => {
    it('reports path data that does not parse', () => {
      const plate = beetlePlate([
        { id: 'marking', rank: 'detail', fill: 'pigment-deep', d: 'M0 0 A5 5 0 0 1 10 10' },
      ]);

      expect(codes(plate)).toEqual(['path-syntax']);
    });

    it('names the part the bad path belongs to', () => {
      const plate = beetlePlate([
        { id: 'hatching', rank: 'detail', fill: 'none', d: 'not a path' },
      ]);
      const [problem] = validatePlate(plate);

      expect(problem?.partId).toBe('hatching');
      expect(problem?.partIndex).toBe(plate.parts.length - 1);
    });

    it('says nothing further about a part whose path did not parse', () => {
      // A path that cannot be read cannot also be reported for straying across
      // the midline; guessing at its coordinates would be inventing errors.
      const plate = beetlePlate([
        { id: 'marking', rank: 'detail', fill: 'pigment', d: 'Q1 1 2 2', clipTo: 'antenna' },
      ]);

      expect(codes(plate)).toEqual(['path-syntax']);
    });
  });

  describe('negative-x', () => {
    it('reports a mirrored part reaching into the left half', () => {
      const plate = beetlePlate([
        { id: 'marking', rank: 'detail', fill: 'pigment-deep', d: 'M40 500 L-40 520' },
      ]);

      expect(codes(plate)).toEqual(['negative-x']);
    });

    it('reports a control point that strays even when both anchors are right of the axis', () => {
      const plate = beetlePlate([
        { id: 'marking', rank: 'detail', fill: 'pigment', d: 'M10 500 C-60 510 -60 530 10 540' },
      ]);

      expect(codes(plate)).toEqual(['negative-x']);
    });

    it('tolerates a part authored right on the midline', () => {
      // An elytron's inner edge is drawn at x = 0 and lands a fraction either
      // side of it. Complaining about that would make the check unusable.
      const plate = beetlePlate([
        { id: 'marking', rank: 'detail', fill: 'pigment', d: 'M-0.4 500 L60 520' },
      ]);

      expect(codes(plate)).toEqual([]);
    });

    it('allows a midline part to cross the axis, because it is never mirrored', () => {
      const plate = beetlePlate([
        {
          id: 'seam',
          rank: 'structure',
          fill: 'none',
          d: 'M-30 600 L30 600',
          mirror: false,
        },
      ]);

      expect(codes(plate)).toEqual([]);
    });
  });

  describe('midline-off-axis', () => {
    it('reports a midline part that is not centred on the axis', () => {
      // It says it needs no reflection, so nothing downstream will straighten
      // it: a scutellum authored 80 units to the right stays there.
      const plate = beetlePlate([
        {
          id: 'scutellum',
          rank: 'structure',
          fill: 'pigment-deep',
          d: 'M60 600 L100 600 L80 640 Z',
          mirror: false,
        },
      ]);

      expect(codes(plate)).toEqual(['midline-off-axis']);
    });

    it('passes a midline part that is symmetric about the axis', () => {
      const plate = beetlePlate([
        {
          id: 'scutellum',
          rank: 'structure',
          fill: 'pigment-deep',
          d: 'M-26 600 L26 600 L0 645 Z',
          mirror: false,
        },
      ]);

      expect(codes(plate)).toEqual([]);
    });
  });

  describe('missing-clip-target', () => {
    it('reports clipTo naming a part the plate does not contain', () => {
      const plate = beetlePlate([
        {
          id: 'hatching',
          rank: 'detail',
          fill: 'none',
          d: 'M40 500 L60 520',
          clipTo: 'scutellum',
        },
      ]);

      expect(codes(plate)).toEqual(['missing-clip-target']);
    });

    it('accepts clipTo naming a part that is present', () => {
      const plate = beetlePlate([
        { id: 'hatching', rank: 'detail', fill: 'none', d: 'M40 500 L60 520', clipTo: 'elytron' },
      ]);

      expect(codes(plate)).toEqual([]);
    });
  });

  describe('self-clip', () => {
    it('reports a part clipped to its own id', () => {
      const plate = beetlePlate([
        { id: 'hatching', rank: 'detail', fill: 'none', d: 'M40 500 L60 520', clipTo: 'hatching' },
      ]);

      expect(codes(plate)).toEqual(['self-clip']);
    });
  });

  describe('missing-part', () => {
    it.each(REQUIRED_PARTS.coleoptera)('reports a beetle plate with no %s', (required) => {
      const complete = beetlePlate();
      const plate: SpeciesPlate = {
        ...complete,
        parts: complete.parts.filter((part) => part.id !== required),
      };

      const problems = validatePlate(plate);

      expect(problems.map((problem) => problem.code)).toEqual(['missing-part']);
      expect(problems[0]?.message).toContain(required);
    });

    it('does not ask a moth plate for elytra', () => {
      const complete = beetlePlate();
      const plate: SpeciesPlate = {
        ...complete,
        order: 'lepidoptera',
        parts: complete.parts.filter((part) => part.id !== 'elytron' && part.id !== 'pronotum'),
      };

      expect(codes(plate)).toEqual([]);
    });
  });

  it('reports every problem at once rather than stopping at the first', () => {
    const complete = beetlePlate([
      { id: 'marking', rank: 'detail', fill: 'pigment', d: 'M-90 500 L60 520' },
      { id: 'hatching', rank: 'detail', fill: 'none', d: 'M40 500 L60 520', clipTo: 'palp' },
    ]);
    const plate: SpeciesPlate = {
      ...complete,
      parts: complete.parts.filter((part) => part.id !== 'eye'),
    };

    // An author fixing a plate wants the whole list, and wants the plate-wide
    // problems after the per-part ones.
    expect(codes(plate)).toEqual(['negative-x', 'missing-clip-target', 'missing-part']);
    expect(isValidPlate(plate)).toBe(false);
  });
});
