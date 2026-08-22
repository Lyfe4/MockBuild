import { describe, expect, it } from 'vitest';

import { generateBeetle } from './generate';
import type { InsectGeometry, InsectMark, Point } from '../core';
import { commandPoints, LINE_WEIGHTS, markPoints, PIGMENTS } from '../core';
import {
  ANTENNA_TYPES,
  BEETLE_VIEW_BOX as VIEW_BOX,
  LEG_PAIRS,
  MARKING_TYPES,
  PRONOTUM_SHAPES,
  type BeetleForm,
} from './types';

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
  hatching: 0.4,
  pigment: 2,
  marking: 'spots',
  markingCount: 4,
  markingSize: 0.9,
  scale: 0.95,
};

const form = (overrides: Partial<BeetleForm> = {}): BeetleForm => ({ ...BASE_FORM, ...overrides });

function pointsOf(mark: InsectMark): Point[] {
  return mark.kind === 'dot'
    ? [
        { x: mark.center.x - mark.radius, y: mark.center.y - mark.radius },
        { x: mark.center.x + mark.radius, y: mark.center.y + mark.radius },
      ]
    : commandPoints(mark.commands);
}

const allPoints = (geometry: InsectGeometry): Point[] => geometry.marks.flatMap(pointsOf);

/** Distinct appendages of a part, counted by group across both sides. */
function appendageCount(geometry: InsectGeometry, part: InsectMark['part']): number {
  const keys = new Set<string>();

  for (const mark of geometry.marks) {
    if (mark.part !== part) continue;

    keys.add(`${mark.side}:${mark.group ?? 'ungrouped'}`);
  }

  return keys.size;
}

describe('generateBeetle', () => {
  it('is deterministic: the same form and seed produce deeply equal geometry', () => {
    expect(generateBeetle(form(), 4242)).toStrictEqual(generateBeetle(form(), 4242));
  });

  it('produces different geometry for different seeds', () => {
    expect(generateBeetle(form(), 1)).not.toStrictEqual(generateBeetle(form(), 2));
  });

  it('returns plain data that survives a JSON round trip', () => {
    const geometry = generateBeetle(form(), 9);

    expect(JSON.parse(JSON.stringify(geometry))).toStrictEqual(geometry);
  });

  it('reports the fixed view box', () => {
    expect(generateBeetle(form(), 3).viewBox).toStrictEqual({
      width: VIEW_BOX.width,
      height: VIEW_BOX.height,
    });
  });

  describe('bilateral symmetry', () => {
    /**
     * The invariant the whole generator is built around: parts are authored on
     * the right and reflected, so every right-hand mark must have a left-hand
     * twin that is its exact mirror. A plate of a pinned beetle that is even
     * slightly lopsided looks wrong before anything else is noticed.
     */
    const MIRROR_TOLERANCE = 0.02;

    /** A mark's geometry, reflected, as a comparable string. */
    function signature(mark: InsectMark, reflect: boolean): string {
      const sign = reflect ? -1 : 1;
      const fixed = (value: number): string => (Math.round(value * 100) / 100).toFixed(2);

      if (mark.kind === 'dot') {
        return `dot|${mark.part}|${fixed(sign * (mark.center.x - VIEW_BOX.width / 2))}|${fixed(mark.center.y)}|${fixed(mark.radius)}`;
      }

      const points = commandPoints(mark.commands)
        .map((p) => `${fixed(sign * (p.x - VIEW_BOX.width / 2))},${fixed(p.y)}`)
        .join(' ');

      return `path|${mark.part}|${mark.weight}|${points}`;
    }

    it.each([...ANTENNA_TYPES])(
      'pairs every right mark with a left one (%s antennae)',
      (antennaType) => {
        const geometry = generateBeetle(form({ antennaType, horn: true }), 77);

        const right = geometry.marks.filter((mark) => mark.side === 'right');
        const left = geometry.marks.filter((mark) => mark.side === 'left');

        expect(right.length).toBeGreaterThan(0);
        expect(left).toHaveLength(right.length);

        // Reflecting the left half must reproduce the right half exactly.
        expect(left.map((mark) => signature(mark, true)).sort()).toStrictEqual(
          right.map((mark) => signature(mark, false)).sort(),
        );
      },
    );

    it('keeps midline marks symmetric within themselves', () => {
      const geometry = generateBeetle(form({ horn: true, pronotumRidge: true }), 8);
      const centre = geometry.marks.filter((mark) => mark.side === 'centre');

      expect(centre.length).toBeGreaterThan(0);

      for (const mark of centre) {
        const xs = pointsOf(mark).map((p) => p.x - VIEW_BOX.width / 2);
        const mirrored = xs.map((x) => -x).sort((a, b) => a - b);
        const original = [...xs].sort((a, b) => a - b);

        for (let i = 0; i < original.length; i += 1) {
          expect(Math.abs((original[i] ?? 0) - (mirrored[i] ?? 0))).toBeLessThan(MIRROR_TOLERANCE);
        }
      }
    });

    it('centres the animal on the frame rather than on its bounding box', () => {
      // Centring on the bounding box would shift the body sideways to
      // compensate for an asymmetric sweep; the axis must stay in the middle.
      const geometry = generateBeetle(form({ antennaType: 'lamellate' }), 12);
      const xs = allPoints(geometry).map((p) => p.x);
      const midpoint = (Math.min(...xs) + Math.max(...xs)) / 2;

      expect(Math.abs(midpoint - VIEW_BOX.width / 2)).toBeLessThan(MIRROR_TOLERANCE);
    });
  });

  describe('anatomy', () => {
    it('draws exactly six legs', () => {
      expect(appendageCount(generateBeetle(form(), 5), 'leg')).toBe(LEG_PAIRS * 2);
    });

    it.each([...ANTENNA_TYPES])('draws exactly two antennae (%s)', (antennaType) => {
      expect(appendageCount(generateBeetle(form({ antennaType }), 5), 'antenna')).toBe(2);
    });

    it('draws six legs whatever the leg parameters', () => {
      for (const legLength of [0.5, 1.4]) {
        for (const tibialSpines of [true, false]) {
          const geometry = generateBeetle(form({ legLength, tibialSpines }), 6);

          expect(appendageCount(geometry, 'leg')).toBe(6);
        }
      }
    });

    it('draws two eyes, two mandibles and two elytra', () => {
      const geometry = generateBeetle(form(), 5);
      const count = (part: InsectMark['part']): number =>
        geometry.marks.filter((mark) => mark.part === part).length;

      expect(count('eye')).toBe(2);
      expect(count('mandible')).toBe(2);
      expect(count('elytron')).toBe(2);
      // One seam, on the midline, shared by both wing cases.
      expect(count('seam')).toBe(1);
    });

    it('omits the horn unless asked, and draws it on the midline when asked', () => {
      expect(generateBeetle(form({ horn: false }), 5).marks.some((m) => m.part === 'horn')).toBe(
        false,
      );

      const horned = generateBeetle(form({ horn: true }), 5).marks.filter((m) => m.part === 'horn');

      expect(horned).toHaveLength(1);
      expect(horned[0]?.side).toBe('centre');
    });

    it('draws the requested number of striae per wing case', () => {
      for (const striaeCount of [0, 3, 8]) {
        const geometry = generateBeetle(form({ striaeCount, punctures: false }), 5);

        expect(geometry.marks.filter((m) => m.part === 'stria')).toHaveLength(striaeCount * 2);
      }
    });

    it('only punctures when asked', () => {
      const plain = generateBeetle(form({ punctures: false }), 5);
      const punctate = generateBeetle(form({ punctures: true }), 5);

      expect(plain.marks.some((m) => m.part === 'puncture')).toBe(false);
      expect(punctate.marks.some((m) => m.part === 'puncture')).toBe(true);
    });
  });

  describe('markings', () => {
    it('draws none when the marking is none', () => {
      expect(
        generateBeetle(form({ marking: 'none' }), 5).marks.some((m) => m.part === 'marking'),
      ).toBe(false);
    });

    it.each(MARKING_TYPES.filter((type) => type !== 'none'))(
      'keeps %s inside the wing case it belongs to',
      (marking) => {
        /**
         * The renderer also clips to the elytron outline, but geometry that
         * relies on the clip is geometry that lies about itself — a marking
         * placed outside the wing case would be invisible and still wrong. This
         * checks the data, not the picture.
         */
        for (const seed of [1, 2, 3, 40]) {
          for (const elytraTaper of [0, 0.5, 1]) {
            const geometry = generateBeetle(
              form({ marking, elytraTaper, markingCount: 6, markingSize: 1.5 }),
              seed,
            );

            for (const side of ['right', 'left'] as const) {
              const elytron = geometry.marks.find(
                (mark) => mark.part === 'elytron' && mark.side === side,
              );

              expect(elytron).toBeDefined();

              const bounds = pointsOf(elytron!);
              const minX = Math.min(...bounds.map((p) => p.x));
              const maxX = Math.max(...bounds.map((p) => p.x));
              const minY = Math.min(...bounds.map((p) => p.y));
              const maxY = Math.max(...bounds.map((p) => p.y));

              const markings = geometry.marks.filter(
                (mark) => mark.part === 'marking' && mark.side === side,
              );

              expect(markings.length).toBeGreaterThan(0);

              for (const mark of markings) {
                for (const point of pointsOf(mark)) {
                  expect(point.x).toBeGreaterThanOrEqual(minX - 0.01);
                  expect(point.x).toBeLessThanOrEqual(maxX + 0.01);
                  expect(point.y).toBeGreaterThanOrEqual(minY - 0.01);
                  expect(point.y).toBeLessThanOrEqual(maxY + 0.01);
                }
              }
            }
          }
        }
      },
    );

    it('draws the requested number of spots on a smooth wing case', () => {
      for (const markingCount of [1, 3, 7]) {
        const geometry = generateBeetle(
          form({ marking: 'spots', markingCount, striaeCount: 0 }),
          5,
        );

        expect(geometry.marks.filter((m) => m.part === 'marking')).toHaveLength(markingCount * 2);
      }
    });

    it('thins the markings out over a deeply striated wing case', () => {
      /**
       * Eight grooves plus seven spots is noise: the striae stop reading as
       * engraving and the spots stop reading as pattern. Sparse, not absent —
       * one or two marks over grooving is a real beetle and a handsome one.
       */
      const smooth = generateBeetle(form({ marking: 'spots', markingCount: 7, striaeCount: 0 }), 5);
      const grooved = generateBeetle(
        form({ marking: 'spots', markingCount: 7, striaeCount: 8 }),
        5,
      );

      const count = (geometry: InsectGeometry): number =>
        geometry.marks.filter((m) => m.part === 'marking').length;

      expect(count(grooved)).toBeLessThan(count(smooth));
      expect(count(grooved)).toBeGreaterThan(0);
    });

    it('paints the markings over the striae, not under them', () => {
      // Build order is painting order: a spot laid over a groove is what a real
      // elytron looks like; a groove ruled across a spot is a diagram.
      const geometry = generateBeetle(form({ marking: 'spots', striaeCount: 6 }), 5);
      const lastStria = geometry.marks.findLastIndex((m) => m.part === 'stria');
      const firstMarking = geometry.marks.findIndex((m) => m.part === 'marking');

      expect(lastStria).toBeGreaterThanOrEqual(0);
      expect(firstMarking).toBeGreaterThan(lastStria);
    });
  });

  describe('stays inside the view box', () => {
    const cases: BeetleForm[] = [
      form(),
      form({ scale: 1, bodyLength: 1, bodyWidth: 1.2, legLength: 1.4, legSpread: 1 }),
      form({ scale: 1, bodyLength: 0.6, bodyWidth: 0.4, elytraTaper: 1 }),
      form({ scale: 1, mandibleSize: 1.5, horn: true, hornLength: 1, antennaLength: 1.6 }),
      ...ANTENNA_TYPES.map((antennaType) => form({ antennaType, antennaLength: 1.6, scale: 1 })),
      ...MARKING_TYPES.map((marking) => form({ marking, markingSize: 1.5, markingCount: 8 })),
      ...PRONOTUM_SHAPES.map((pronotumShape) => form({ pronotumShape, pronotumWidth: 1.2 })),
    ];

    it.each(cases.map((candidate, index) => [index, candidate] as const))(
      'case %i keeps every point within the frame',
      (_index, candidate) => {
        for (const seed of [1, 2, 3, 500, 90210]) {
          for (const point of allPoints(generateBeetle(candidate, seed))) {
            expect(point.x).toBeGreaterThanOrEqual(0);
            expect(point.x).toBeLessThanOrEqual(VIEW_BOX.width);
            expect(point.y).toBeGreaterThanOrEqual(0);
            expect(point.y).toBeLessThanOrEqual(VIEW_BOX.height);
          }
        }
      },
    );
  });

  describe('pigment', () => {
    it("carries the form's pigment through to the geometry", () => {
      for (const pigment of PIGMENTS) {
        expect(generateBeetle(form({ pigment }), 5).pigment).toBe(pigment);
      }
    });

    it('reports a pigment inside the range the renderer can map', () => {
      // The renderer turns this into `data-pigment`, and the stylesheet only
      // has rules for 1..6 — anything else would render unpainted.
      for (const seed of [1, 2, 3, 99]) {
        const { pigment } = generateBeetle(form(), seed);

        expect(PIGMENTS).toContain(pigment);
      }
    });

    it('pulls an impossible pigment onto a usable one rather than throwing', () => {
      for (const [given, expected] of [
        [0, 1],
        [-4, 1],
        [7, 6],
        [99, 6],
        [Number.NaN, 1],
      ] as const) {
        expect(generateBeetle(form({ pigment: given as never }), 1).pigment).toBe(expected);
      }
    });

    it('leaves the drawing itself alone', () => {
      // Colour is the renderer's business; changing it must not move a line.
      const a = generateBeetle(form({ pigment: 1 }), 5);
      const b = generateBeetle(form({ pigment: 6 }), 5);

      expect(a.marks).toStrictEqual(b.marks);
    });
  });

  it('clamps out-of-range parameters rather than throwing', () => {
    const wild = form({
      bodyLength: 40,
      bodyWidth: -3,
      antennaLength: 90,
      mandibleSize: 12,
      striaeCount: 500,
      legLength: 60,
      markingCount: 99,
      markingSize: 30,
      scale: 8,
    });

    const geometry = generateBeetle(wild, 4);

    expect(geometry.marks.length).toBeGreaterThan(0);

    for (const point of allPoints(geometry)) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(VIEW_BOX.width);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(VIEW_BOX.height);
    }
  });
});

describe('the beetle craft pass', () => {
  describe('mandibles', () => {
    /** A mandible's own path commands, on the right-hand side. */
    function mandibleCommands(candidate: BeetleForm) {
      const mark = generateBeetle(candidate, 5).marks.find(
        (m) => m.part === 'mandible' && m.side === 'right' && m.kind === 'path',
      );

      expect(mark).toBeDefined();

      return mark?.kind === 'path' ? mark.commands : [];
    }

    it('is drawn entirely in curves — no zigzag anywhere', () => {
      /**
       * The teeth used to be cut as pairs of straight segments, and at plate
       * size the eye read the sawtooth before it read the jaw. A stag beetle's
       * inner teeth are blunt lobes; every one of them is a curve now.
       */
      for (const mandibleSize of [0, 0.5, 1, 1.5]) {
        const commands = mandibleCommands(form({ mandibleSize }));

        expect(commands.length).toBeGreaterThan(0);
        expect(commands.some((command) => command.c === 'L')).toBe(false);
      }
    });

    it('cuts two teeth into a modest jaw and three into a full antler', () => {
      const teeth = (mandibleSize: number): number =>
        mandibleCommands(form({ mandibleSize })).filter((command) => command.c === 'Q').length;

      // One quadratic per tooth, plus the closing curve back to the head.
      expect(teeth(0.5)).toBe(3);
      expect(teeth(1.4)).toBe(4);
    });

    it('closes the tips further the larger the jaws get', () => {
      /**
       * The character that makes an antler read as a jaw rather than a horn.
       * A major male's tips stop a hair apart; a minor male's stay wide.
       */
      const gap = (mandibleSize: number): number => {
        const geometry = generateBeetle(form({ mandibleSize }), 5);
        const midline = geometry.viewBox.width / 2;
        const mark = geometry.marks.find((m) => m.part === 'mandible' && m.side === 'right');
        const points = markPoints(mark!);
        const frontmost = points.reduce((best, p) => (p.y < best.y ? p : best), points[0]!);

        return frontmost.x - midline;
      };

      expect(gap(1.5)).toBeLessThan(gap(0.8));
      expect(gap(0.8)).toBeLessThan(gap(0.2));
      // Never over the midline: two jaws that cross read as one closed loop.
      expect(gap(1.5)).toBeGreaterThan(0);
    });

    it('leaves no straight segment anywhere in the drawing but the flat plates', () => {
      /**
       * "No zigzags" is a rule about the whole plate, not only the jaws. The
       * lamellate antenna's blades are the one exception and are meant to be
       * straight: they are flat plates seen edge-on.
       */
      const geometry = generateBeetle(form({ antennaType: 'serrate', mandibleSize: 1.2 }), 5);

      for (const mark of geometry.marks) {
        if (mark.kind !== 'path') continue;
        if (mark.part === 'mandible' || mark.part === 'antenna') {
          expect(mark.commands.some((command) => command.c === 'L')).toBe(false);
        }
      }
    });
  });

  describe('the line hierarchy', () => {
    it('ranks every line, and never leaves one unranked', () => {
      const geometry = generateBeetle(form({ horn: true }), 5);
      const paths = geometry.marks.filter((mark) => mark.kind === 'path');

      expect(paths.length).toBeGreaterThan(0);

      for (const mark of paths) {
        expect(LINE_WEIGHTS).toContain(mark.weight);
      }
    });

    it('cuts the silhouette at outline weight and the texture at detail weight', () => {
      const geometry = generateBeetle(form({ striaeCount: 6, hatching: 0.6 }), 5);
      const weightOf = (part: InsectMark['part']): string[] => [
        ...new Set(
          geometry.marks
            .filter((m) => m.part === part && m.kind === 'path')
            .map((m) => (m.kind === 'path' ? m.weight : '')),
        ),
      ];

      expect(weightOf('elytron')).toStrictEqual(['outline']);
      expect(weightOf('head')).toStrictEqual(['outline']);
      expect(weightOf('pronotum')).toContain('outline');
      expect(weightOf('stria')).toStrictEqual(['detail']);
      expect(weightOf('hatch')).toStrictEqual(['detail']);
    });

    it('uses all three ranks, so the hierarchy is actually a hierarchy', () => {
      const geometry = generateBeetle(form({ striaeCount: 6, hatching: 0.6 }), 5);
      const used = new Set(
        geometry.marks.filter((mark) => mark.kind === 'path').map((mark) => mark.weight),
      );

      expect([...used].sort()).toStrictEqual([...LINE_WEIGHTS].sort());
    });

    it('draws a heavy femur at a heavier rank than a slender one', () => {
      // The parameter used to set a stroke width outright; it now picks a rank.
      const femurWeight = (femurThickness: number): string | undefined => {
        const mark = generateBeetle(form({ femurThickness }), 5).marks.find(
          (candidate) => candidate.part === 'leg' && candidate.kind === 'path',
        );

        return mark?.kind === 'path' ? mark.weight : undefined;
      };

      expect(femurWeight(1.4)).toBe('outline');
      expect(femurWeight(1)).toBe('structure');
      expect(femurWeight(0.5)).toBe('detail');
    });
  });

  describe('hatching', () => {
    const hatchCount = (candidate: BeetleForm, seed: number): number =>
      generateBeetle(candidate, seed).marks.filter((mark) => mark.part === 'hatch').length;

    it('draws none at zero density', () => {
      expect(hatchCount(form({ hatching: 0 }), 5)).toBe(0);
    });

    it('draws more of it the denser it is asked to be', () => {
      expect(hatchCount(form({ hatching: 0.3 }), 5)).toBeGreaterThan(0);
      expect(hatchCount(form({ hatching: 1 }), 5)).toBeGreaterThan(
        hatchCount(form({ hatching: 0.3 }), 5),
      );
    });

    it('confines every stroke to a surface the geometry defines', () => {
      const geometry = generateBeetle(form({ hatching: 0.8 }), 5);
      const hatch = geometry.marks.filter((mark) => mark.part === 'hatch');

      expect(hatch.length).toBeGreaterThan(0);

      for (const mark of hatch) {
        expect(mark.clipTo).toBeDefined();
        expect(Object.keys(geometry.clips)).toContain(mark.clipTo);
      }
    });

    it('hatches the wing cases and the pronotum, both sides of each', () => {
      const geometry = generateBeetle(form({ hatching: 0.8 }), 5);
      const surfaces = new Set(
        geometry.marks.filter((mark) => mark.part === 'hatch').map((mark) => mark.clipTo),
      );

      expect([...surfaces].sort()).toStrictEqual([
        'elytron-left',
        'elytron-right',
        'pronotum-left',
        'pronotum-right',
      ]);
    });

    it('keeps every stroke inside the wing case it is laid on', () => {
      // Generated within the surface's own profile, not merely clipped to it.
      for (const seed of [1, 2, 3, 40]) {
        const geometry = generateBeetle(form({ hatching: 1, elytraTaper: 1 }), seed);
        const elytron = geometry.marks.find((m) => m.part === 'elytron' && m.side === 'right');
        const bounds = markPoints(elytron!);
        const minX = Math.min(...bounds.map((p) => p.x));
        const maxX = Math.max(...bounds.map((p) => p.x));

        const strokes = geometry.marks.filter(
          (mark) => mark.part === 'hatch' && mark.clipTo === 'elytron-right',
        );

        expect(strokes.length).toBeGreaterThan(0);

        for (const mark of strokes) {
          for (const point of markPoints(mark)) {
            expect(point.x).toBeGreaterThanOrEqual(minX - 0.01);
            expect(point.x).toBeLessThanOrEqual(maxX + 0.01);
          }
        }
      }
    });

    it('varies with the seed', () => {
      // Identical hatching on every specimen would be a texture swatch rather
      // than a drawing of this particular animal.
      const strokes = (seed: number): string =>
        JSON.stringify(
          generateBeetle(form({ hatching: 0.7 }), seed).marks.filter((m) => m.part === 'hatch'),
        );

      expect(strokes(1)).not.toBe(strokes(2));
    });

    it('is the finest weight, and always a line rather than a fill', () => {
      // Hatching describes a surface; it is the engraver's line, not paint.
      for (const mark of generateBeetle(form({ hatching: 0.8 }), 5).marks) {
        if (mark.part !== 'hatch' || mark.kind !== 'path') continue;

        expect(mark.closed).toBe(false);
        expect(mark.weight).toBe('detail');
      }
    });
  });

  describe('leg pose', () => {
    /** Where every leg point sits, as a comparable string. */
    const pose = (seed: number): string =>
      JSON.stringify(
        generateBeetle(form(), seed)
          .marks.filter((mark) => mark.part === 'leg')
          .flatMap(markPoints),
      );

    it('varies the spread and the per-pair angle with the seed', () => {
      // A pinned specimen is set by hand; three pairs fanning out at exactly
      // the tabulated angles read as drawn rather than as pinned.
      expect(new Set([1, 2, 3, 4].map(pose)).size).toBe(4);
    });

    it('still mirrors exactly, however the pose came out', () => {
      for (const seed of [1, 2, 3, 40]) {
        const geometry = generateBeetle(form(), seed);
        const midline = geometry.viewBox.width / 2;
        const legX = (side: 'left' | 'right'): number[] =>
          geometry.marks
            .filter((mark) => mark.part === 'leg' && mark.side === side)
            .flatMap(markPoints)
            .map((p) => Math.round(Math.abs(p.x - midline) * 100) / 100)
            .sort((a, b) => a - b);

        expect(legX('left')).toStrictEqual(legX('right'));
      }
    });
  });
});
