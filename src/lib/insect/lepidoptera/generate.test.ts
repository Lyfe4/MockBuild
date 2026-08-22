import { describe, expect, it } from 'vitest';

import {
  commandPoints,
  markPoints,
  PIGMENTS,
  type InsectGeometry,
  type InsectMark,
  type Point,
} from '../core';
import { generateMoth } from './generate';
import { MOTH_PRESETS, resolveMothPreset } from './presets';
import {
  FOREWING_SHAPES,
  HINDWING_SHAPES,
  MOTH_ANTENNA_TYPES,
  MOTH_VIEW_BOX,
  WING_COUNT,
  type MothForm,
} from './types';

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
  pigment: 3,
  fringe: true,
  dusting: true,
  dustingDensity: 0.4,
  scale: 0.94,
};

const form = (overrides: Partial<MothForm> = {}): MothForm => ({ ...BASE_FORM, ...overrides });

const allPoints = (geometry: InsectGeometry): Point[] => geometry.marks.flatMap(markPoints);

/** Distinct appendages of a part, counted by group across both sides. */
function appendageCount(geometry: InsectGeometry, part: InsectMark['part']): number {
  const keys = new Set<string>();

  for (const mark of geometry.marks) {
    if (mark.part !== part) continue;

    keys.add(`${mark.side}:${mark.group ?? 'ungrouped'}`);
  }

  return keys.size;
}

describe('generateMoth', () => {
  it('is deterministic: the same form and seed produce deeply equal geometry', () => {
    expect(generateMoth(form(), 808)).toStrictEqual(generateMoth(form(), 808));
  });

  it('produces different geometry for different seeds', () => {
    expect(generateMoth(form(), 1)).not.toStrictEqual(generateMoth(form(), 2));
  });

  it('returns plain data that survives a JSON round trip', () => {
    const geometry = generateMoth(form(), 5);

    expect(JSON.parse(JSON.stringify(geometry))).toStrictEqual(geometry);
  });

  it('uses the wide view box, not the beetle portrait one', () => {
    // A specimen with its wings spread is far wider than it is long; forcing it
    // into the beetle's frame would shrink it to nothing.
    expect(generateMoth(form(), 1).viewBox).toStrictEqual({
      width: MOTH_VIEW_BOX.width,
      height: MOTH_VIEW_BOX.height,
    });
    expect(MOTH_VIEW_BOX.width).toBeGreaterThan(MOTH_VIEW_BOX.height);
  });

  describe('bilateral symmetry', () => {
    const TOLERANCE = 0.02;

    function signature(mark: InsectMark, reflect: boolean): string {
      const sign = reflect ? -1 : 1;
      const fixed = (value: number): string => (Math.round(value * 100) / 100).toFixed(2);
      const mid = MOTH_VIEW_BOX.width / 2;

      if (mark.kind === 'dot') {
        return `dot|${mark.part}|${fixed(sign * (mark.center.x - mid))}|${fixed(mark.center.y)}|${fixed(mark.radius)}`;
      }

      const points = commandPoints(mark.commands)
        .map((p) => `${fixed(sign * (p.x - mid))},${fixed(p.y)}`)
        .join(' ');

      return `path|${mark.part}|${fixed(mark.width)}|${points}`;
    }

    it.each([...FOREWING_SHAPES])(
      'pairs every right mark with a left one (%s forewings)',
      (forewingShape) => {
        const geometry = generateMoth(form({ forewingShape }), 31);

        const right = geometry.marks.filter((mark) => mark.side === 'right');
        const left = geometry.marks.filter((mark) => mark.side === 'left');

        expect(right.length).toBeGreaterThan(0);
        expect(left).toHaveLength(right.length);
        expect(left.map((mark) => signature(mark, true)).sort()).toStrictEqual(
          right.map((mark) => signature(mark, false)).sort(),
        );
      },
    );

    it.each([...HINDWING_SHAPES])('stays symmetric with %s hindwings', (hindwingShape) => {
      const geometry = generateMoth(form({ hindwingShape }), 12);
      const right = geometry.marks.filter((mark) => mark.side === 'right');
      const left = geometry.marks.filter((mark) => mark.side === 'left');

      expect(left).toHaveLength(right.length);
      expect(left.map((mark) => signature(mark, true)).sort()).toStrictEqual(
        right.map((mark) => signature(mark, false)).sort(),
      );
    });

    it('keeps the body and its segments on the midline', () => {
      const geometry = generateMoth(form(), 6);
      const centre = geometry.marks.filter((mark) => mark.side === 'centre');

      expect(centre.length).toBeGreaterThan(0);

      for (const mark of centre) {
        const xs = markPoints(mark).map((p) => p.x - MOTH_VIEW_BOX.width / 2);
        const original = [...xs].sort((a, b) => a - b);
        const mirrored = xs.map((x) => -x).sort((a, b) => a - b);

        for (let i = 0; i < original.length; i += 1) {
          expect(Math.abs((original[i] ?? 0) - (mirrored[i] ?? 0))).toBeLessThan(TOLERANCE);
        }
      }
    });

    it('centres the animal on the frame', () => {
      const xs = allPoints(generateMoth(form(), 9)).map((p) => p.x);
      const midpoint = (Math.min(...xs) + Math.max(...xs)) / 2;

      expect(Math.abs(midpoint - MOTH_VIEW_BOX.width / 2)).toBeLessThan(TOLERANCE);
    });
  });

  describe('anatomy', () => {
    it('draws exactly four wings', () => {
      expect(appendageCount(generateMoth(form(), 3), 'wing')).toBe(WING_COUNT);
    });

    it.each([...MOTH_ANTENNA_TYPES])('draws exactly two antennae (%s)', (antennaType) => {
      expect(appendageCount(generateMoth(form({ antennaType }), 3), 'antenna')).toBe(2);
    });

    it('draws four wings whatever the wing shapes', () => {
      for (const forewingShape of FOREWING_SHAPES) {
        for (const hindwingShape of HINDWING_SHAPES) {
          expect(
            appendageCount(generateMoth(form({ forewingShape, hindwingShape }), 4), 'wing'),
          ).toBe(WING_COUNT);
        }
      }
    });

    it('draws the requested number of veins per wing', () => {
      for (const veinCount of [0, 3, 9]) {
        const geometry = generateMoth(form({ veinCount }), 3);

        // Two wings per side, both sides.
        expect(geometry.marks.filter((mark) => mark.part === 'vein')).toHaveLength(veinCount * 4);
      }
    });

    it('draws the fringe only when asked', () => {
      expect(generateMoth(form({ fringe: false }), 3).marks.some((m) => m.part === 'fringe')).toBe(
        false,
      );
      expect(generateMoth(form({ fringe: true }), 3).marks.some((m) => m.part === 'fringe')).toBe(
        true,
      );
    });

    it('segments the abdomen', () => {
      expect(
        generateMoth(form(), 3).marks.filter((mark) => mark.part === 'segment').length,
      ).toBeGreaterThan(2);
    });

    it('gives a tailed hindwing more reach than a rounded one', () => {
      const extent = (hindwingShape: MothForm['hindwingShape']): number => {
        const ys = allPoints(generateMoth(form({ hindwingShape, bandCount: 0 }), 7)).map(
          (p) => p.y,
        );

        return Math.max(...ys) - Math.min(...ys);
      };

      // The tail is the silhouette; it must actually change the outline.
      expect(extent('tailed')).not.toBeCloseTo(extent('rounded'), 1);
    });
  });

  describe('patterns', () => {
    it('draws none when everything is switched off', () => {
      const geometry = generateMoth(form({ bandCount: 0, eyespotCount: 0, dusting: false }), 3);

      expect(geometry.marks.some((mark) => mark.part === 'marking')).toBe(false);
    });

    it('names a clip surface on every pattern, so the renderer can confine it', () => {
      const geometry = generateMoth(form(), 3);
      const markings = geometry.marks.filter((mark) => mark.part === 'marking');

      expect(markings.length).toBeGreaterThan(0);

      for (const mark of markings) {
        expect(mark.clipTo).toBeDefined();
        expect(Object.keys(geometry.clips)).toContain(mark.clipTo);
      }
    });

    it('keeps every pattern inside the wing it belongs to', () => {
      /**
       * The renderer clips as well, but geometry that relies on the clip is
       * geometry that lies about itself: a pattern placed off the wing would be
       * invisible and still wrong. This checks the data.
       */
      for (const seed of [1, 2, 3, 44]) {
        for (const forewingShape of FOREWING_SHAPES) {
          for (const hindwingShape of HINDWING_SHAPES) {
            const geometry = generateMoth(
              form({ forewingShape, hindwingShape, eyespotSize: 1.4, bandCount: 4 }),
              seed,
            );

            for (const [clipName, outline] of Object.entries(geometry.clips)) {
              const bounds = commandPoints(outline);
              const minX = Math.min(...bounds.map((p) => p.x));
              const maxX = Math.max(...bounds.map((p) => p.x));
              const minY = Math.min(...bounds.map((p) => p.y));
              const maxY = Math.max(...bounds.map((p) => p.y));

              const confined = geometry.marks.filter((mark) => mark.clipTo === clipName);

              for (const mark of confined) {
                for (const point of markPoints(mark)) {
                  expect(point.x).toBeGreaterThanOrEqual(minX - 0.01);
                  expect(point.x).toBeLessThanOrEqual(maxX + 0.01);
                  expect(point.y).toBeGreaterThanOrEqual(minY - 0.01);
                  expect(point.y).toBeLessThanOrEqual(maxY + 0.01);
                }
              }
            }
          }
        }
      }
    });

    it('mirrors a pattern onto the matching wing, not the opposite one', () => {
      // `clipTo` has to be remapped when a mark is reflected, or the left
      // wing's spots would be clipped to the right wing and vanish.
      const geometry = generateMoth(form(), 3);
      const left = geometry.marks.filter((mark) => mark.part === 'marking' && mark.side === 'left');

      expect(left.length).toBeGreaterThan(0);

      for (const mark of left) {
        expect(mark.clipTo?.endsWith('-left')).toBe(true);
      }
    });

    it('builds concentric rings for an eyespot', () => {
      const geometry = generateMoth(form({ eyespotCount: 1, eyespotRings: 3 }), 3);
      const rings = geometry.marks.filter(
        (mark) => mark.part === 'marking' && mark.kind === 'dot' && mark.ring !== undefined,
      );

      // Three rings on each of four wings.
      expect(rings).toHaveLength(12);
    });
  });

  describe('stays inside the view box', () => {
    const cases: MothForm[] = [
      form(),
      form({ scale: 1, wingSpan: 1.4, wingAspect: 1, hindwingScale: 1 }),
      form({ scale: 1, wingSpan: 0.6, wingAspect: 0.35, bodyLength: 1.2, bodyThickness: 1.2 }),
      form({ scale: 1, hindwingShape: 'tailed', wingSpan: 1.4 }),
      ...FOREWING_SHAPES.map((forewingShape) => form({ forewingShape, scale: 1 })),
      ...HINDWING_SHAPES.map((hindwingShape) => form({ hindwingShape, scale: 1 })),
      ...MOTH_ANTENNA_TYPES.map((antennaType) => form({ antennaType, antennaLength: 1.1 })),
    ];

    it.each(cases.map((candidate, index) => [index, candidate] as const))(
      'case %i keeps every point within the frame',
      (_index, candidate) => {
        for (const seed of [1, 2, 3, 77, 4040]) {
          for (const point of allPoints(generateMoth(candidate, seed))) {
            expect(point.x).toBeGreaterThanOrEqual(0);
            expect(point.x).toBeLessThanOrEqual(MOTH_VIEW_BOX.width);
            expect(point.y).toBeGreaterThanOrEqual(0);
            expect(point.y).toBeLessThanOrEqual(MOTH_VIEW_BOX.height);
          }
        }
      },
    );
  });

  describe('pigment', () => {
    it("carries the form's pigment through to the geometry", () => {
      for (const pigment of PIGMENTS) {
        expect(generateMoth(form({ pigment }), 3).pigment).toBe(pigment);
      }
    });

    it('reports a pigment inside the range the renderer can map', () => {
      for (const seed of [1, 2, 3, 88]) {
        expect(PIGMENTS).toContain(generateMoth(form(), seed).pigment);
      }
    });

    it('pulls an impossible pigment onto a usable one rather than throwing', () => {
      for (const [given, expected] of [
        [0, 1],
        [9, 6],
        [Number.NaN, 1],
      ] as const) {
        expect(generateMoth(form({ pigment: given as never }), 1).pigment).toBe(expected);
      }
    });

    it('leaves the drawing itself alone', () => {
      const a = generateMoth(form({ pigment: 2 }), 3);
      const b = generateMoth(form({ pigment: 5 }), 3);

      expect(a.marks).toStrictEqual(b.marks);
    });
  });

  it('clamps out-of-range parameters rather than throwing', () => {
    const wild = form({
      wingSpan: 40,
      wingAspect: -2,
      hindwingScale: 90,
      bodyLength: 50,
      veinCount: 400,
      bandCount: 90,
      eyespotCount: 40,
      eyespotSize: 30,
      dustingDensity: 12,
      scale: 9,
    });

    const geometry = generateMoth(wild, 2);

    expect(geometry.marks.length).toBeGreaterThan(0);

    for (const point of allPoints(geometry)) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(MOTH_VIEW_BOX.width);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(MOTH_VIEW_BOX.height);
    }
  });
});

describe('resolveMothPreset', () => {
  const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

  it('is deterministic', () => {
    for (const spec of MOTH_PRESETS) {
      expect(resolveMothPreset(spec, 11)).toStrictEqual(resolveMothPreset(spec, 11));
    }
  });

  describe.each(MOTH_PRESETS.map((spec) => [spec.name, spec] as const))('%s', (_name, spec) => {
    const forms = SEEDS.map((seed) => resolveMothPreset(spec, seed));

    it('produces distinct individuals from eight seeds', () => {
      expect(new Set(forms.map((form) => JSON.stringify(form))).size).toBeGreaterThanOrEqual(6);
    });

    it('varies the silhouette measurably', () => {
      const aspects = forms.map((candidate, index) => {
        const points = allPoints(generateMoth(candidate, SEEDS[index]!));
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);

        return (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
      });

      expect(Math.max(...aspects) - Math.min(...aspects)).toBeGreaterThan(0.02);
    });

    it('only ever chooses traits the preset allows', () => {
      const choices = spec.choices ?? {};

      for (const candidate of forms) {
        if (choices.forewingShape !== undefined) {
          expect(choices.forewingShape).toContain(candidate.forewingShape);
        }
        if (choices.hindwingShape !== undefined) {
          expect(choices.hindwingShape).toContain(candidate.hindwingShape);
        }
        if (choices.antennaType !== undefined) {
          expect(choices.antennaType).toContain(candidate.antennaType);
        }
        if (choices.pigment !== undefined) expect(choices.pigment).toContain(candidate.pigment);
      }
    });

    it('names a pigment set, and moves inside it', () => {
      // A preset with no set would leave every specimen of the kind the same
      // colour, which is the failure this whole layer exists to avoid.
      expect(spec.choices?.pigment?.length ?? 0).toBeGreaterThan(1);
      expect(new Set(forms.map((candidate) => candidate.pigment)).size).toBeGreaterThan(1);
    });

    it('draws every resolved specimen inside the frame', () => {
      for (const [index, candidate] of forms.entries()) {
        for (const point of allPoints(generateMoth(candidate, SEEDS[index]!))) {
          expect(point.x).toBeGreaterThanOrEqual(0);
          expect(point.x).toBeLessThanOrEqual(MOTH_VIEW_BOX.width);
          expect(point.y).toBeGreaterThanOrEqual(0);
          expect(point.y).toBeLessThanOrEqual(MOTH_VIEW_BOX.height);
        }
      }
    });
  });

  it('keeps the hawkmoth narrower-winged than the others', () => {
    const meanAspect = (name: string): number => {
      const spec = MOTH_PRESETS.find((candidate) => candidate.name === name);
      const values = SEEDS.map((seed) => resolveMothPreset(spec!, seed).wingAspect);

      return values.reduce((total, value) => total + value, 0) / values.length;
    };

    expect(meanAspect('Hawkmoth')).toBeLessThan(meanAspect('Emperor'));
    expect(meanAspect('Hawkmoth')).toBeLessThan(meanAspect('Geometrid'));
  });
});
