import { describe, expect, it } from 'vitest';

import { commandPoints, markPoints } from '../core';
import { generateBeetle } from './generate';
import { BEETLE_PRESETS, resolveBeetlePreset } from './presets';
import type { BeetleForm } from './types';

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

/** The drawing's overall proportion — how the contact sheet reads a specimen. */
function aspect(form: BeetleForm, seed: number): number {
  const points = generateBeetle(form, seed).marks.flatMap(markPoints);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  return (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
}

describe('resolveBeetlePreset', () => {
  it('is deterministic', () => {
    for (const spec of BEETLE_PRESETS) {
      expect(resolveBeetlePreset(spec, 42)).toStrictEqual(resolveBeetlePreset(spec, 42));
    }
  });

  describe.each(BEETLE_PRESETS.map((spec) => [spec.name, spec] as const))('%s', (_name, spec) => {
    const forms = SEEDS.map((seed) => resolveBeetlePreset(spec, seed));

    it('produces distinct individuals from eight seeds', () => {
      /**
       * The failure this exists to catch: a seed that reaches only the details
       * which consume randomness downstream, so a sheet of sixteen beetles
       * renders as four drawings repeated four times.
       */
      const distinct = new Set(forms.map((form) => JSON.stringify(form)));

      expect(distinct.size).toBeGreaterThanOrEqual(6);
    });

    it('varies the silhouette measurably, not just the details', () => {
      // Distinct forms are not enough — two forms differing only in a puncture
      // radius would pass the check above and look identical on the page.
      const aspects = SEEDS.map((seed, index) => aspect(forms[index]!, seed));
      const spread = Math.max(...aspects) - Math.min(...aspects);

      expect(spread).toBeGreaterThan(0.02);
    });

    it('still reads as one kind of beetle', () => {
      // The other half of the bargain. Variety within a preset must not be so
      // wide that two specimens read as different animals.
      const aspects = SEEDS.map((seed, index) => aspect(forms[index]!, seed));
      const mean = aspects.reduce((total, value) => total + value, 0) / aspects.length;

      for (const value of aspects) {
        expect(Math.abs(value - mean) / mean).toBeLessThan(0.3);
      }
    });

    it('only ever chooses traits the preset allows', () => {
      const choices = spec.choices ?? {};

      for (const form of forms) {
        if (choices.antennaType !== undefined) {
          expect(choices.antennaType).toContain(form.antennaType);
        }
        if (choices.marking !== undefined) expect(choices.marking).toContain(form.marking);
        if (choices.pronotumShape !== undefined) {
          expect(choices.pronotumShape).toContain(form.pronotumShape);
        }
        if (choices.pigment !== undefined) expect(choices.pigment).toContain(form.pigment);
      }
    });

    it('names a pigment set, and moves inside it', () => {
      // Without a set every specimen of the kind would be one colour, which is
      // the failure the whole pigment layer exists to avoid.
      expect(spec.choices?.pigment?.length ?? 0).toBeGreaterThan(1);
      expect(new Set(forms.map((form) => form.pigment)).size).toBeGreaterThan(1);
    });

    it('keeps every sampled parameter inside its declared range', () => {
      for (const [key, range] of Object.entries(spec.ranges ?? {})) {
        const [min, max] = range;

        for (const form of forms) {
          const value = form[key as keyof BeetleForm];

          expect(typeof value).toBe('number');
          // Normalisation may tighten a range but must never widen it.
          expect(value as number).toBeGreaterThanOrEqual(min - 1e-9);
          expect(value as number).toBeLessThanOrEqual(max + 1e-9);
        }
      }
    });

    it('draws every resolved specimen inside the frame', () => {
      for (const [index, form] of forms.entries()) {
        const geometry = generateBeetle(form, SEEDS[index]!);

        for (const mark of geometry.marks) {
          for (const point of markPoints(mark)) {
            expect(point.x).toBeGreaterThanOrEqual(0);
            expect(point.x).toBeLessThanOrEqual(geometry.viewBox.width);
            expect(point.y).toBeGreaterThanOrEqual(0);
            expect(point.y).toBeLessThanOrEqual(geometry.viewBox.height);
          }
        }
      }
    });
  });

  it('keeps the four presets distinguishable from one another', () => {
    // Variation within a kind must not swamp the difference between kinds.
    const meanAspect = BEETLE_PRESETS.map((spec) => {
      const values = SEEDS.map((seed) => aspect(resolveBeetlePreset(spec, seed), seed));

      return values.reduce((total, value) => total + value, 0) / values.length;
    });

    const spread = Math.max(...meanAspect) - Math.min(...meanAspect);

    expect(spread).toBeGreaterThan(0.05);
  });

  it('gives the ladybird a spot count that actually moves', () => {
    const ladybird = BEETLE_PRESETS.find((spec) => spec.name === 'Ladybird');

    expect(ladybird).toBeDefined();

    const counts = new Set(SEEDS.map((seed) => resolveBeetlePreset(ladybird!, seed).markingCount));

    expect(counts.size).toBeGreaterThanOrEqual(3);
  });

  it('gives the stag a mandible size that actually moves', () => {
    const stag = BEETLE_PRESETS.find((spec) => spec.name === 'Stag');

    expect(stag).toBeDefined();

    const sizes = SEEDS.map((seed) => resolveBeetlePreset(stag!, seed).mandibleSize);

    expect(Math.max(...sizes) - Math.min(...sizes)).toBeGreaterThan(0.2);
  });
});

describe('refined beetle anatomy', () => {
  it('curves the leg segments rather than drawing them straight', () => {
    const stag = BEETLE_PRESETS.find((spec) => spec.name === 'Stag');
    const geometry = generateBeetle(resolveBeetlePreset(stag!, 3), 3);
    const legs = geometry.marks.filter((mark) => mark.part === 'leg' && mark.kind === 'path');

    expect(legs.length).toBeGreaterThan(0);

    // The three main segments are quadratics now; only the tarsal ticks are
    // straight, and a leg made entirely of straight lines reads as a mechanism.
    const curved = legs.filter((mark) =>
      mark.kind === 'path' ? mark.commands.some((command) => command.c === 'Q') : false,
    );

    expect(curved.length).toBeGreaterThanOrEqual(6);
  });

  it('closes the stag mandibles towards the midline', () => {
    /**
     * The character that makes an antler read as a jaw rather than a horn: the
     * tips must end up *closer* to the midline than the widest point of the
     * mandible's outward bow.
     */
    const stag = BEETLE_PRESETS.find((spec) => spec.name === 'Stag');
    const form = { ...resolveBeetlePreset(stag!, 5), mandibleSize: 1.5 };
    const geometry = generateBeetle(form, 5);

    const mandible = geometry.marks.find(
      (mark) => mark.part === 'mandible' && mark.side === 'right' && mark.kind === 'path',
    );

    expect(mandible).toBeDefined();

    const points = commandPoints(mandible!.kind === 'path' ? mandible!.commands : []);
    const midline = geometry.viewBox.width / 2;

    // Distance from the midline, at the front of the animal versus at its widest.
    const widest = Math.max(...points.map((p) => p.x - midline));
    const frontmost = points.reduce((best, p) => (p.y < best.y ? p : best), points[0]!);

    expect(frontmost.x - midline).toBeLessThan(widest * 0.8);
  });
});

describe('the longhorn', () => {
  const longhorn = BEETLE_PRESETS.find((spec) => spec.name === 'Longhorn');

  it('varies its antennae visibly from specimen to specimen', () => {
    /**
     * The defining character of the group, and the one a contact sheet is
     * meant to show moving. At the bottom of the range the antennae reach the
     * apex of the elytra; at the top they are half again as long as the whole
     * beetle.
     */
    const lengths = SEEDS.map((seed) => resolveBeetlePreset(longhorn!, seed).antennaLength);

    expect(Math.min(...lengths)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...lengths)).toBeLessThanOrEqual(1.8);
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeGreaterThan(0.35);
  });

  it('draws broad, near parallel-sided wing cases', () => {
    // Longhorns are elongate, not narrow: the sides run close to straight from
    // shoulder to apex. A pinched wedge is a ground beetle.
    for (const seed of SEEDS) {
      const form = resolveBeetlePreset(longhorn!, seed);

      expect(form.elytraTaper).toBeLessThan(0.2);
      expect(form.bodyWidth).toBeGreaterThan(0.6);
    }
  });

  it('is broader than it used to be, and than the tapered ground beetle', () => {
    const ground = BEETLE_PRESETS.find((spec) => spec.name === 'Ground');
    const mean = (spec: typeof longhorn, key: 'elytraTaper' | 'bodyWidth'): number => {
      const values = SEEDS.map((seed) => resolveBeetlePreset(spec!, seed)[key]);

      return values.reduce((total, value) => total + value, 0) / values.length;
    };

    expect(mean(longhorn, 'elytraTaper')).toBeLessThan(mean(ground, 'elytraTaper'));
    expect(mean(longhorn, 'bodyWidth')).toBeLessThan(mean(ground, 'bodyWidth') + 0.2);
  });
});

describe('marking types', () => {
  it('lets the seed pick the kind of marking, not only how many', () => {
    /**
     * A preset that allows three kinds of marking and always resolves to one
     * of them has a seed that never reaches the choice — which is the same
     * failure as a range too narrow to see, and less obvious.
     */
    for (const spec of BEETLE_PRESETS) {
      const allowed = spec.choices?.marking ?? [];

      if (allowed.length < 2) continue;

      const chosen = new Set(SEEDS.map((seed) => resolveBeetlePreset(spec, seed).marking));

      expect(chosen.size, `${spec.name} never varies its marking`).toBeGreaterThan(1);

      for (const marking of chosen) expect(allowed).toContain(marking);
    }
  });

  it('gives more than one preset a choice to make', () => {
    const varying = BEETLE_PRESETS.filter((spec) => (spec.choices?.marking?.length ?? 0) > 1);

    expect(varying.length).toBeGreaterThanOrEqual(2);
  });
});

describe('hatching across the presets', () => {
  it('models the stag heavily and the ladybird barely at all', () => {
    // A matt rugose stag against a varnished ladybird: the difference is most
    // of what tells the two shells apart before any outline resolves.
    const mean = (name: string): number => {
      const spec = BEETLE_PRESETS.find((candidate) => candidate.name === name);
      const values = SEEDS.map((seed) => resolveBeetlePreset(spec!, seed).hatching);

      return values.reduce((total, value) => total + value, 0) / values.length;
    };

    expect(mean('Stag')).toBeGreaterThan(mean('Ladybird'));
    expect(mean('Stag')).toBeGreaterThan(0.3);
    expect(mean('Ladybird')).toBeLessThan(0.2);
  });

  it('keeps hatching off the presets that are already striated', () => {
    // Grooving under hatching turns a wing case to noise.
    const ground = BEETLE_PRESETS.find((spec) => spec.name === 'Ground');

    for (const seed of SEEDS) {
      expect(resolveBeetlePreset(ground!, seed).hatching).toBeLessThan(0.3);
    }
  });
});
