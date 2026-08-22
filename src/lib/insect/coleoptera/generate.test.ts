import { describe, expect, it } from 'vitest';

import { generateBeetle } from './generate';
import type { InsectGeometry, InsectMark, Point } from '../core';
import { commandPoints, PIGMENTS } from '../core';
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

      return `path|${mark.part}|${fixed(mark.width)}|${points}`;
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

    it('draws the requested number of spots on each wing case', () => {
      for (const markingCount of [1, 3, 7]) {
        const geometry = generateBeetle(form({ marking: 'spots', markingCount }), 5);

        expect(geometry.marks.filter((m) => m.part === 'marking')).toHaveLength(markingCount * 2);
      }
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
