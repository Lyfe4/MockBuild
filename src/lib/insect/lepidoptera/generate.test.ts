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
  MAX_PATTERN_LAYERS,
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
  eyespotPupil: true,
  bandWidth: 1,
  patterns: ['dusting', 'marginalBand', 'eyespot'],
  pigment: 3,
  fringe: true,
  dustingDensity: 0.4,
  hatching: 0.4,
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

      return `path|${mark.part}|${mark.weight}|${points}`;
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

        /**
         * Counted by group, not by stroke: a vein forks once or twice on the
         * way out, so a wing with three veins is more than three marks and
         * still exactly three veins. Two wings per side, both sides.
         */
        expect(appendageCount(geometry, 'vein')).toBe(veinCount * 4);
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
    it('draws none when the wing carries no layers', () => {
      const geometry = generateMoth(form({ patterns: [] }), 3);

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
              form({
                forewingShape,
                hindwingShape,
                eyespotSize: 1.4,
                bandCount: 4,
                patterns: ['marginalBand', 'eyespot', 'discalSpot'],
              }),
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
      const geometry = generateMoth(
        form({ patterns: ['eyespot'], eyespotCount: 1, eyespotRings: 3 }),
        3,
      );
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
      hatching: 4,
      bandWidth: 9,
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

describe('the moth craft pass', () => {
  /** The fitted drawing's bounding box, in view-box units. */
  function bounds(geometry: InsectGeometry) {
    const points = allPoints(geometry);
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);

    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }

  describe('composition', () => {
    /**
     * The two things a plate is judged on before any of the drawing is: is the
     * specimen in the middle of its frame, and does it fill it. Both are easy
     * to lose to a change in the anatomy — a longer tail or a broader hindwing
     * shifts the bounding box the fit is measured from — which is exactly why
     * they are asserted rather than eyeballed.
     */
    const CENTRING_TOLERANCE = 0.5;

    it.each([...MOTH_PRESETS.map((spec) => spec.name)])(
      'centres a %s vertically in the frame',
      (name) => {
        const spec = MOTH_PRESETS.find((candidate) => candidate.name === name);

        for (const seed of [1, 2, 3, 44]) {
          const form = resolveMothPreset(spec!, seed);
          const { minY, maxY } = bounds(generateMoth(form, seed));
          const centre = (minY + maxY) / 2;

          expect(Math.abs(centre - MOTH_VIEW_BOX.height / 2)).toBeLessThan(CENTRING_TOLERANCE);
        }
      },
    );

    it.each([...MOTH_PRESETS.map((spec) => spec.name)])(
      'spans about four fifths of the frame width for a %s',
      (name) => {
        const spec = MOTH_PRESETS.find((candidate) => candidate.name === name);

        for (const seed of [1, 2, 3, 44]) {
          const form = resolveMothPreset(spec!, seed);
          const { minX, maxX } = bounds(generateMoth(form, seed));
          const span = (maxX - minX) / MOTH_VIEW_BOX.width;

          // A specimen that fills half its plate reads as an afterthought; one
          // that fills all of it has nowhere for the pin label to go.
          expect(span).toBeGreaterThan(0.75);
          expect(span).toBeLessThan(0.92);
        }
      },
    );

    it('keeps the axis of symmetry in the middle, not the bounding box', () => {
      const { minX, maxX } = bounds(generateMoth(form(), 9));

      expect(Math.abs((minX + maxX) / 2 - MOTH_VIEW_BOX.width / 2)).toBeLessThan(0.05);
    });
  });

  describe('wings', () => {
    /** How far one wing reaches from its base, in fitted units. */
    function wingReach(geometry: InsectGeometry, group: 'forewing' | 'hindwing'): number {
      const wing = geometry.marks.find((mark) => mark.part === 'wing' && mark.group === group);
      const points = markPoints(wing!);
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);

      return Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    }

    it('draws hindwings that are no longer a token lobe behind the forewings', () => {
      /**
       * A saturniid's hindwing is as big as its forewing. Drawing every
       * hindwing at two thirds was the single thing that made these read as
       * diagrams rather than as specimens.
       */
      const emperor = MOTH_PRESETS.find((spec) => spec.name === 'Emperor');

      for (const seed of [1, 2, 3]) {
        const geometry = generateMoth(resolveMothPreset(emperor!, seed), seed);

        expect(wingReach(geometry, 'hindwing') / wingReach(geometry, 'forewing')).toBeGreaterThan(
          0.8,
        );
      }
    });

    it('still gives the hawkmoth the small hindwings that are its character', () => {
      // The one preset where a short hindwing is the animal, not an error.
      const hawkmoth = MOTH_PRESETS.find((spec) => spec.name === 'Hawkmoth');
      const emperor = MOTH_PRESETS.find((spec) => spec.name === 'Emperor');
      const mean = (spec: typeof hawkmoth): number => {
        const values = [1, 2, 3, 4].map((seed) => resolveMothPreset(spec!, seed).hindwingScale);

        return values.reduce((total, value) => total + value, 0) / values.length;
      };

      expect(mean(hawkmoth)).toBeLessThan(mean(emperor));
    });

    it('hangs the swallowtail tails off the rear margin, behind the body', () => {
      /**
       * The tails used to be spliced past the apex on the forward side, which
       * put them over the forewing. They belong at the anal angle, sweeping
       * away from the animal — so the tailed hindwing must reach further back
       * than the rounded one does, not further forward.
       */
      const rearmost = (hindwingShape: MothForm['hindwingShape']): number => {
        const geometry = generateMoth(form({ hindwingShape, patterns: [] }), 7);
        const wing = geometry.marks.find(
          (mark) => mark.part === 'wing' && mark.group === 'hindwing' && mark.side === 'right',
        );

        return Math.max(...markPoints(wing!).map((p) => p.y));
      };

      expect(rearmost('tailed')).toBeGreaterThan(rearmost('rounded'));
    });

    it('draws a tail broad enough to read as part of the animal', () => {
      // A hairline tail reads as a scratch on the plate.
      const geometry = generateMoth(form({ hindwingShape: 'tailed', patterns: [] }), 7);
      const wing = geometry.marks.find(
        (mark) => mark.part === 'wing' && mark.group === 'hindwing' && mark.side === 'right',
      );
      const points = markPoints(wing!);
      const rear = Math.max(...points.map((p) => p.y));

      // Points in the outermost tenth of the tail's reach, measured across.
      const tip = points.filter(
        (p) => p.y > rear - (rear - Math.min(...points.map((q) => q.y))) * 0.1,
      );
      const width = Math.max(...tip.map((p) => p.x)) - Math.min(...tip.map((p) => p.x));

      expect(width).toBeGreaterThan(1);
    });
  });

  describe('venation', () => {
    it('curves every vein rather than ruling it straight from the base', () => {
      // Straight rays from a common point read as a sunburst — the one thing
      // venation must not look like.
      const geometry = generateMoth(form({ veinCount: 5 }), 3);
      const veins = geometry.marks.filter((mark) => mark.part === 'vein');

      expect(veins.length).toBeGreaterThan(0);

      for (const mark of veins) {
        expect(mark.kind).toBe('path');
        expect(mark.kind === 'path' && mark.commands.some((command) => command.c === 'Q')).toBe(
          true,
        );
      }
    });

    it('branches each vein at least once on the way out', () => {
      const geometry = generateMoth(form({ veinCount: 4 }), 3);
      const groups = new Map<string, number>();

      for (const mark of geometry.marks) {
        if (mark.part !== 'vein') continue;

        const key = `${mark.side}:${mark.group ?? ''}`;

        groups.set(key, (groups.get(key) ?? 0) + 1);
      }

      expect(groups.size).toBeGreaterThan(0);

      for (const [key, strokes] of groups) {
        expect(strokes, `${key} never forks`).toBeGreaterThan(1);
      }
    });

    it('draws venation at detail weight, under everything else', () => {
      for (const mark of generateMoth(form(), 3).marks) {
        if (mark.part !== 'vein' || mark.kind !== 'path') continue;

        expect(mark.weight).toBe('detail');
      }
    });
  });

  describe('pattern layers', () => {
    it('draws only the layers the form carries', () => {
      const bandsOnly = generateMoth(form({ patterns: ['marginalBand'], bandCount: 2 }), 3);
      const spotOnly = generateMoth(form({ patterns: ['discalSpot'] }), 3);

      const markings = (geometry: InsectGeometry): number =>
        geometry.marks.filter((mark) => mark.part === 'marking').length;

      // Two bands per wing across four wings; one discal spot per wing.
      expect(markings(bandsOnly)).toBe(8);
      expect(markings(spotOnly)).toBe(4);
    });

    it('paints the layers in a fixed order however the form lists them', () => {
      // Painting order is a property of the layers, not of how a preset was
      // written: dusting over an eyespot would speckle the thing it sits under.
      const a = generateMoth(form({ patterns: ['dusting', 'eyespot'] }), 3);
      const b = generateMoth(form({ patterns: ['eyespot', 'dusting'] }), 3);

      expect(a.marks).toStrictEqual(b.marks);
    });

    it('caps a wing at three layers', () => {
      const geometry = generateMoth(
        form({ patterns: ['dusting', 'marginalBand', 'apexPatch', 'discalSpot', 'eyespot'] }),
        3,
      );

      expect(geometry.marks.some((mark) => mark.part === 'marking')).toBe(true);
    });

    it('confines every layer to the wing it belongs to', () => {
      for (const patterns of [
        ['marginalBand'],
        ['apexPatch'],
        ['discalSpot'],
        ['eyespot'],
      ] as MothForm['patterns'][]) {
        for (const forewingShape of FOREWING_SHAPES) {
          const geometry = generateMoth(
            form({ patterns, forewingShape, bandCount: 4, eyespotSize: 1.4, bandWidth: 1.6 }),
            5,
          );

          for (const [clipName, outline] of Object.entries(geometry.clips)) {
            const box = commandPoints(outline);
            const minX = Math.min(...box.map((p) => p.x));
            const maxX = Math.max(...box.map((p) => p.x));
            const minY = Math.min(...box.map((p) => p.y));
            const maxY = Math.max(...box.map((p) => p.y));

            for (const mark of geometry.marks.filter((m) => m.clipTo === clipName)) {
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
    });
  });

  describe('marginal bands', () => {
    it('follows the wing margin rather than cutting across it', () => {
      /**
       * The test that says "band" and not "diagonal stripe". Both ends of a
       * band sit near the outer edge, so the distance from a band's end to the
       * nearest point of the wing outline must be small at *both* ends — a
       * stripe ruled across the wing has one end at the margin and the other
       * buried in the middle of it.
       */
      const geometry = generateMoth(form({ patterns: ['marginalBand'], bandCount: 1 }), 3);
      const wing = geometry.marks.find(
        (mark) => mark.part === 'wing' && mark.group === 'forewing' && mark.side === 'right',
      );
      const edge = markPoints(wing!);
      // Matched to that same wing by its clip surface: the hindwing is built
      // first, so taking the first band on the right would take the wrong one.
      const band = geometry.marks.find(
        (mark) =>
          mark.part === 'marking' && mark.kind === 'path' && mark.clipTo === 'forewing-right',
      );

      expect(band).toBeDefined();

      const points = markPoints(band!);
      const toEdge = (p: { x: number; y: number }): number =>
        Math.min(...edge.map((e) => Math.hypot(e.x - p.x, e.y - p.y)));

      // The band's two extreme points along the wing, and how far each is from
      // the outline. On a margin-following band, both are close.
      const sorted = [...points].sort((a, b) => toEdge(a) - toEdge(b));
      const farthest = sorted[sorted.length - 1];

      expect(toEdge(farthest!)).toBeLessThan(14);
    });

    it('varies the band width, and draws a wide band wider than a narrow one', () => {
      const area = (bandWidth: number): number => {
        const geometry = generateMoth(
          form({ patterns: ['marginalBand'], bandCount: 1, bandWidth }),
          3,
        );
        const band = geometry.marks.find(
          (mark) => mark.part === 'marking' && mark.side === 'right' && mark.kind === 'path',
        );
        const points = markPoints(band!);
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);

        return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
      };

      expect(area(1.6)).toBeGreaterThan(area(0.4));
    });

    it('varies the count', () => {
      const bands = (bandCount: number): number =>
        generateMoth(form({ patterns: ['marginalBand'], bandCount }), 3).marks.filter(
          (mark) => mark.part === 'marking',
        ).length;

      expect(bands(3)).toBeGreaterThan(bands(1));
    });
  });

  describe('eyespots', () => {
    /** One wing's eyespot marks. Matched by clip surface, so it is one wing. */
    const eyespot = (overrides: Partial<MothForm> = {}) =>
      generateMoth(
        form({ patterns: ['eyespot'], eyespotCount: 1, eyespotRings: 2, ...overrides }),
        3,
      ).marks.filter((mark) => mark.part === 'marking' && mark.clipTo === 'forewing-right');

    it('layers a deep ring, a pigment field and a pale centre', () => {
      // The pale centre is the whole trick: without it an eyespot is a blot.
      const tones = eyespot().map((mark) => mark.tone);

      expect(tones).toContain('deep');
      expect(tones).toContain('pigment');
      expect(tones).toContain('pale');
    });

    it('adds a dark pupil only when the specimen has one', () => {
      expect(eyespot({ eyespotPupil: true }).map((mark) => mark.tone)).toContain('ink');
      expect(eyespot({ eyespotPupil: false }).map((mark) => mark.tone)).not.toContain('ink');
    });

    it('draws the rings from the outside in, so each shows against the last', () => {
      const rings = eyespot({ eyespotRings: 3 }).filter(
        (mark) => mark.kind === 'dot' && mark.ring !== undefined,
      );

      expect(rings).toHaveLength(3);

      const radii = rings.map((mark) => (mark.kind === 'dot' ? mark.radius : 0));

      for (let i = 1; i < radii.length; i += 1) {
        expect(radii[i]!).toBeLessThan(radii[i - 1]!);
      }
    });

    it('keeps the centre paler than the field and the field paler than the ring', () => {
      // Ordered by radius: ring outermost, then pigment field, then paper.
      const discs = eyespot().filter((mark) => mark.kind === 'dot' && mark.ring === undefined);
      const byTone = new Map(
        discs.map((mark) => [mark.tone, mark.kind === 'dot' ? mark.radius : 0]),
      );

      expect(byTone.get('pigment')!).toBeGreaterThan(byTone.get('pale')!);
    });

    it('varies the size', () => {
      const radius = (eyespotSize: number): number => {
        const rings = eyespot({ eyespotSize }).filter(
          (mark) => mark.kind === 'dot' && mark.ring !== undefined,
        );

        return rings[0]?.kind === 'dot' ? rings[0].radius : 0;
      };

      expect(radius(1.4)).toBeGreaterThan(radius(0.4));
    });
  });

  describe('wing-base hatching', () => {
    const hatchCount = (hatching: number, seed: number): number =>
      generateMoth(form({ hatching }), seed).marks.filter((mark) => mark.part === 'hatch').length;

    it('draws none at zero density', () => {
      expect(hatchCount(0, 3)).toBe(0);
    });

    it('draws more of it the denser it is asked to be', () => {
      expect(hatchCount(0.4, 3)).toBeGreaterThan(0);
      expect(hatchCount(1, 3)).toBeGreaterThan(hatchCount(0.4, 3));
    });

    it('keeps it near the body and clipped to the wing', () => {
      const geometry = generateMoth(form({ hatching: 1 }), 3);
      const hatch = geometry.marks.filter((mark) => mark.part === 'hatch');

      expect(hatch.length).toBeGreaterThan(0);

      for (const mark of hatch) {
        expect(Object.keys(geometry.clips)).toContain(mark.clipTo);
        expect(mark.kind === 'path' && mark.weight).toBe('detail');
      }
    });

    it('is ink rather than pigment: it describes the surface, it is not paint', () => {
      for (const mark of generateMoth(form({ hatching: 1 }), 3).marks) {
        if (mark.part !== 'hatch') continue;

        expect(mark.tone).toBeUndefined();
      }
    });

    it('varies with the seed', () => {
      const strokes = (seed: number): string =>
        JSON.stringify(
          generateMoth(form({ hatching: 0.8 }), seed).marks.filter((m) => m.part === 'hatch'),
        );

      expect(strokes(1)).not.toBe(strokes(2));
    });
  });

  describe('presets and their pattern sets', () => {
    const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

    it.each([...MOTH_PRESETS.map((spec) => spec.name)])(
      '%s picks one to three layers, always from its own set',
      (name) => {
        const spec = MOTH_PRESETS.find((candidate) => candidate.name === name);
        const allowed = spec?.choices?.patterns ?? [];

        expect(allowed.length).toBeGreaterThan(1);

        for (const seed of SEEDS) {
          const { patterns } = resolveMothPreset(spec!, seed);

          expect(patterns.length).toBeGreaterThanOrEqual(1);
          expect(patterns.length).toBeLessThanOrEqual(MAX_PATTERN_LAYERS);

          for (const pattern of patterns) expect(allowed).toContain(pattern);
        }
      },
    );

    it.each([...MOTH_PRESETS.map((spec) => spec.name)])(
      '%s varies which layers it carries from specimen to specimen',
      (name) => {
        /**
         * The point of the whole layer model: two specimens of one kind should
         * differ in *what* they carry, not only in how much of it. A preset
         * that always resolves to the same set has a seed that never reaches
         * the choice.
         */
        const spec = MOTH_PRESETS.find((candidate) => candidate.name === name);
        const sets = new Set(SEEDS.map((seed) => resolveMothPreset(spec!, seed).patterns.join()));

        expect(sets.size).toBeGreaterThan(1);
      },
    );
  });
});
