import { describe, expect, it } from 'vitest';

import {
  PLATE_ORDERS,
  REQUIRED_PARTS,
  type PlateOrder,
  type PlatePart,
  type SpeciesPlate,
} from './types';
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

/** The body of a winged insect: thorax, abdomen and four wings with veins. */
function winged(species: string, order: PlateOrder, parts: readonly PlatePart[]): SpeciesPlate {
  return { species, order, sex: 'unsexed', reference: REFERENCE, parts };
}

const THORAX: PlatePart = {
  id: 'thorax',
  rank: 'outline',
  fill: 'pigment-deep',
  d: 'M-60 180 C-60 120 60 120 60 180 C60 260 -60 260 -60 180 Z',
  mirror: false,
};

const ABDOMEN: PlatePart = {
  id: 'abdomen',
  rank: 'outline',
  fill: 'pigment',
  d: 'M-40 270 L40 270 C50 600 20 980 0 1000 C-20 980 -50 600 -40 270 Z',
  mirror: false,
};

const HEAD_AND_EYE: PlatePart[] = [
  { id: 'head', rank: 'outline', fill: 'pigment-deep', d: 'M0 40 C50 40 60 120 0 130 Z' },
  { id: 'eye', rank: 'detail', fill: 'ink', d: 'M30 70 C44 70 44 90 30 90 Z' },
];

/**
 * A butterfly with its wings spread: four wings, veins, and no legs, because
 * from above there are none to draw.
 */
function mothPlate(overrides: readonly PlatePart[] = []): SpeciesPlate {
  return winged('test-moth', 'lepidoptera', [
    ...HEAD_AND_EYE,
    { id: 'antenna', rank: 'structure', fill: 'none', d: 'M20 60 C90 20 160 -20 200 -40' },
    THORAX,
    ABDOMEN,
    { id: 'forewing', rank: 'outline', fill: 'pigment', d: 'M50 190 C300 60 460 200 300 330 Z' },
    { id: 'hindwing', rank: 'outline', fill: 'pigment', d: 'M50 300 C260 300 320 520 120 560 Z' },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M70 210 C180 180 260 200 300 240',
      clipTo: 'forewing',
    },
    ...overrides,
  ]);
}

/** A dragonfly: eyes meeting on the head, no antennae, a segmented abdomen. */
function dragonflyPlate(overrides: readonly PlatePart[] = []): SpeciesPlate {
  return winged('test-dragonfly', 'odonata', [
    { id: 'head', rank: 'outline', fill: 'pigment-deep', d: 'M0 30 C70 30 80 110 0 120 Z' },
    { id: 'compound-eye', rank: 'structure', fill: 'pigment', d: 'M10 45 C64 45 64 100 10 100 Z' },
    THORAX,
    ABDOMEN,
    { id: 'abdomen-segment', rank: 'detail', fill: 'none', d: 'M-38 420 L38 420', mirror: false },
    {
      id: 'forewing',
      rank: 'outline',
      fill: 'pigment',
      d: 'M40 190 C320 150 520 200 340 300 Z',
      opacity: 'membrane',
    },
    {
      id: 'hindwing',
      rank: 'outline',
      fill: 'pigment',
      d: 'M40 260 C320 230 500 290 330 370 Z',
      opacity: 'membrane',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M60 210 C200 190 300 210 330 250',
      clipTo: 'forewing',
    },
    ...legs('foreleg'),
    ...legs('midleg'),
    ...legs('hindleg'),
    ...overrides,
  ]);
}

/** A bee: four wings, six legs, and no stinger showing from above. */
function beePlate(overrides: readonly PlatePart[] = []): SpeciesPlate {
  return winged('test-bee', 'hymenoptera', [
    ...HEAD_AND_EYE,
    { id: 'antenna', rank: 'structure', fill: 'none', d: 'M25 80 C70 110 100 150 110 190' },
    THORAX,
    ABDOMEN,
    { id: 'forewing', rank: 'outline', fill: 'pigment', d: 'M45 200 C240 170 340 260 200 340 Z' },
    { id: 'hindwing', rank: 'outline', fill: 'pigment', d: 'M45 250 C180 240 230 320 130 360 Z' },
    ...legs('foreleg'),
    ...legs('midleg'),
    ...legs('hindleg'),
    ...overrides,
  ]);
}

/** A shield bug: the scutellum between the folded forewings is the order. */
function bugPlate(overrides: readonly PlatePart[] = []): SpeciesPlate {
  return winged('test-bug', 'hemiptera', [
    ...HEAD_AND_EYE,
    { id: 'antenna', rank: 'structure', fill: 'none', d: 'M25 70 C80 90 130 130 150 180' },
    {
      id: 'pronotum',
      rank: 'outline',
      fill: 'pigment-deep',
      d: 'M0 140 L120 170 L100 300 L0 300 Z',
    },
    {
      id: 'scutellum',
      rank: 'structure',
      fill: 'pigment-deep',
      d: 'M-70 310 L70 310 L0 620 Z',
      mirror: false,
    },
    { id: 'forewing', rank: 'outline', fill: 'pigment', d: 'M0 310 L110 320 L90 800 L0 820 Z' },
    ABDOMEN,
    ...legs('foreleg'),
    ...legs('midleg'),
    ...legs('hindleg'),
    ...overrides,
  ]);
}

/** One complete plate per order, so the required-parts lists are satisfiable. */
const COMPLETE: Record<PlateOrder, () => SpeciesPlate> = {
  coleoptera: () => beetlePlate(),
  lepidoptera: () => mothPlate(),
  odonata: () => dragonflyPlate(),
  hymenoptera: () => beePlate(),
  hemiptera: () => bugPlate(),
};

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
    it.each(PLATE_ORDERS)('passes a complete %s plate', (order) => {
      // Hand-built above, not generated from REQUIRED_PARTS — a fixture derived
      // from the list under test would pass whatever the list said.
      expect(validatePlate(COMPLETE[order]())).toEqual([]);
    });

    for (const order of PLATE_ORDERS) {
      it.each(REQUIRED_PARTS[order])(`reports a ${order} plate with no %s`, (required) => {
        const complete = COMPLETE[order]();
        const plate: SpeciesPlate = {
          ...complete,
          // Anything clipped to the removed part goes with it, or the plate
          // would report a dangling clip as well and prove two things at once.
          parts: complete.parts.filter((part) => part.id !== required && part.clipTo !== required),
        };

        const problems = validatePlate(plate);

        // Every problem is a missing part and one of them names this one.
        // Not exactly one problem: taking away a wing takes its veins with it,
        // and the veins are required too, so a cascade is the right answer.
        expect(new Set(problems.map((problem) => problem.code))).toEqual(new Set(['missing-part']));
        expect(problems.some((problem) => problem.message.includes(required))).toBe(true);
        expect(problems[0]?.message).toContain(order);
      });
    }

    /*
     * The other half of the map's job: what each order is *not* asked for. A
     * required-parts list that quietly required everything of everyone would
     * pass every test above and make four of the five orders undrawable.
     */
    it('does not ask a moth for elytra, a pronotum, or legs it does not show', () => {
      const drawn = new Set(mothPlate().parts.map((part) => part.id));

      for (const absent of ['elytron', 'pronotum', 'foreleg-femur', 'hindleg-tarsus'] as const) {
        expect(drawn.has(absent), absent).toBe(false);
      }

      expect(codes(mothPlate())).toEqual([]);
    });

    it('does not ask a dragonfly for antennae, which are two bristles', () => {
      expect(REQUIRED_PARTS.odonata).not.toContain('antenna');
      expect(dragonflyPlate().parts.some((part) => part.id === 'antenna')).toBe(false);
      expect(codes(dragonflyPlate())).toEqual([]);
    });

    it('does not ask a bee for a stinger, which most do not show from above', () => {
      expect(REQUIRED_PARTS.hymenoptera).not.toContain('stinger');
      expect(codes(beePlate())).toEqual([]);
    });

    it('does not ask a true bug for the hindwings folded underneath it', () => {
      expect(REQUIRED_PARTS.hemiptera).not.toContain('hindwing');
      expect(bugPlate().parts.some((part) => part.id === 'hindwing')).toBe(false);
      expect(codes(bugPlate())).toEqual([]);
    });

    it('asks a true bug for the scutellum, which is what identifies it', () => {
      const complete = bugPlate();
      const plate: SpeciesPlate = {
        ...complete,
        parts: complete.parts.filter((part) => part.id !== 'scutellum'),
      };

      expect(codes(plate)).toEqual(['missing-part']);
    });

    it('asks every winged order for both wings, and a beetle for neither', () => {
      for (const order of ['lepidoptera', 'odonata', 'hymenoptera'] as const) {
        expect(REQUIRED_PARTS[order], order).toContain('forewing');
        expect(REQUIRED_PARTS[order], order).toContain('hindwing');
      }

      expect(REQUIRED_PARTS.coleoptera).not.toContain('forewing');
      expect(REQUIRED_PARTS.coleoptera).toContain('elytron');
    });
  });

  describe('solid-part-as-membrane', () => {
    it('allows a wing to be a membrane', () => {
      expect(codes(dragonflyPlate())).toEqual([]);
      // Both wings of the fixture carry it, so this is not passing by accident.
      expect(dragonflyPlate().parts.filter((part) => part.opacity === 'membrane')).toHaveLength(2);
    });

    it('rejects it on the abdomen, which is a typo rather than a decision', () => {
      const complete = dragonflyPlate();
      const plate: SpeciesPlate = {
        ...complete,
        parts: complete.parts.map((part) =>
          part.id === 'abdomen' ? { ...part, opacity: 'membrane' as const } : part,
        ),
      };

      const problems = validatePlate(plate);

      expect(problems.map((problem) => problem.code)).toEqual(['solid-part-as-membrane']);
      expect(problems[0]?.partId).toBe('abdomen');
      // The message names what may carry it, so the fix does not need the source.
      expect(problems[0]?.message).toContain('forewing');
    });

    it('rejects it on an elytron, which is a wing case and not a window', () => {
      expect(codes(beetlePlate().parts.length > 0 ? withMembraneElytron() : beetlePlate())).toEqual(
        ['solid-part-as-membrane'],
      );
    });

    it('treats an absent opacity as solid rather than as an error', () => {
      expect(beetlePlate().parts.every((part) => part.opacity === undefined)).toBe(true);
      expect(codes(beetlePlate())).toEqual([]);
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

/** A beetle whose wing case has been marked see-through. */
function withMembraneElytron(): SpeciesPlate {
  const complete = beetlePlate();

  return {
    ...complete,
    parts: complete.parts.map((part) =>
      part.id === 'elytron' ? { ...part, opacity: 'membrane' as const } : part,
    ),
  };
}
