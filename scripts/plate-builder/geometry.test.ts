import { describe, expect, it } from 'vitest';

import { capsule, curve, ellipse, fan, round, strip, type Point } from './geometry.ts';

/**
 * The arithmetic, checked.
 *
 * Nothing here asserts on a coordinate the way a plate test refuses to: these
 * *are* the coordinates, and the whole promise of `plate:verify` is that the
 * same landmarks produce the same bytes. So the tests ask the two questions
 * that promise rests on — is the output canonical, and does it stay put — plus
 * the three properties that were bugs before they were tests: control points
 * that fly out of the drawing, ink over the midline on a mirrored part, and a
 * curve that does not actually pass through the landmarks it was given.
 */

/** Every number in a path, as points. Control points included, which is the point. */
function numbersOf(d: string): Point[] {
  const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const points: Point[] = [];

  for (let i = 0; i + 1 < numbers.length; i += 2) {
    points.push({ x: numbers[i] ?? 0, y: numbers[i + 1] ?? 0 });
  }

  return points;
}

/** The curve itself, sampled — not its control points. */
function onCurve(d: string): Point[] {
  const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const points: Point[] = [];
  let cursor: Point = { x: numbers[0] ?? 0, y: numbers[1] ?? 0 };

  points.push(cursor);

  for (let i = 2; i + 5 < numbers.length; i += 6) {
    const p1 = { x: numbers[i] ?? 0, y: numbers[i + 1] ?? 0 };
    const p2 = { x: numbers[i + 2] ?? 0, y: numbers[i + 3] ?? 0 };
    const p3 = { x: numbers[i + 4] ?? 0, y: numbers[i + 5] ?? 0 };

    for (let step = 1; step <= 16; step += 1) {
      const t = step / 16;
      const u = 1 - t;

      points.push({
        x: u ** 3 * cursor.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x,
        y: u ** 3 * cursor.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y,
      });
    }

    cursor = p3;
  }

  return points;
}

const nearest = (points: readonly Point[], target: Point): number =>
  Math.min(...points.map((p) => Math.hypot(p.x - target.x, p.y - target.y)));

describe('round', () => {
  it('keeps two decimals', () => {
    expect(round(1.006)).toBe(1.01);
    expect(round(1.004)).toBe(1);
    expect(round(-12.3456)).toBe(-12.35);
  });

  it('is deterministic on a tie, which is all the verify pass needs', () => {
    // 1.005 is not 1.005 in binary and lands on 1. Chasing that with a decimal
    // library would buy nothing: a landmark is a measurement off a photograph,
    // a hundredth of a plate unit is far below what anyone can measure, and the
    // only property `plate:verify` rests on is that the answer never changes.
    expect(round(1.005)).toBe(round(1.005));
    expect(round(1.005)).toBe(1);
  });

  it('never produces negative zero', () => {
    // `-0` prints as `-0`, so a coordinate and its own reflection would differ
    // in the committed file and not in the browser.
    expect(Object.is(round(-0.001), 0)).toBe(true);
    expect(String(round(-0.004))).toBe('0');
  });
});

describe('curve', () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 100, y: 40 },
    { x: 180, y: 160 },
    { x: 120, y: 300 },
  ];

  it('emits absolute cubics and nothing else, which is what the plate contract allows', () => {
    expect(curve(points)).toMatch(/^M[-\d.\s]+(C[-\d.\s]+)+$/);
    expect(curve(points, { closed: true })).toMatch(/^M[-\d.\s]+(C[-\d.\s]+)+Z$/);
  });

  it('passes through every landmark it was given', () => {
    const sampled = onCurve(curve(points));

    for (const landmark of points) {
      expect(nearest(sampled, landmark)).toBeLessThan(0.02);
    }
  });

  it('is deterministic: the same landmarks, the same bytes', () => {
    expect(curve(points, { closed: true })).toBe(curve(points, { closed: true }));
  });

  it('keeps its control points near the curve, even where landmarks are uneven', () => {
    // The bug this replaced: uniform Catmull-Rom threw control points 130 units
    // outside the ladybird, `plateBounds` measured them, and the animal was
    // drawn a fifth too small in a frame that fitted its control points rather
    // than its ink.
    const uneven: Point[] = [
      { x: 0, y: 200 },
      { x: 20, y: 190 },
      { x: 340, y: 520 },
      { x: 300, y: 900 },
      { x: 0, y: 1000 },
    ];
    const d = curve(uneven, { closed: true });
    const ink = onCurve(d);
    const all = numbersOf(d);

    const spread = (get: (p: Point) => number): number =>
      Math.max(
        Math.max(...all.map(get)) - Math.max(...ink.map(get)),
        Math.min(...ink.map(get)) - Math.min(...all.map(get)),
      );

    // As a fraction of the drawing, because that is what it costs: the frame is
    // the bounding box of the control points, so ten per cent of sprawl is ten
    // per cent of the frame spent on nothing. Uniform Catmull-Rom measured 16%
    // on the wing case this is modelled on.
    const size = Math.max(...uneven.map((p) => p.y)) - Math.min(...uneven.map((p) => p.y));

    expect(spread((p) => p.x) / size).toBeLessThan(0.1);
    expect(spread((p) => p.y) / size).toBeLessThan(0.1);
  });

  it('meets the midline at a right angle when the part is mirrored', () => {
    // A mirrored part is joined to its own reflection on the axis. Any sideways
    // tangent there is a corner in the finished animal, and a control point a
    // hair to the left is a `negative-x` from `validatePlate` — ink on the half
    // the author did not draw.
    const half: Point[] = [
      { x: 0, y: 0 },
      { x: 160, y: 240 },
      { x: 120, y: 700 },
      { x: 0, y: 900 },
    ];

    expect(Math.min(...numbersOf(curve(half, { closed: true })).map((p) => p.x))).toBeLessThan(0);
    expect(
      Math.min(...numbersOf(curve(half, { closed: true, symmetric: true })).map((p) => p.x)),
    ).toBe(0);
  });

  it('refuses a curve with nothing to draw', () => {
    expect(() => curve([{ x: 0, y: 0 }])).toThrow(/at least two/);
  });
});

describe('capsule', () => {
  const spine: Point[] = [
    { x: 100, y: 100 },
    { x: 200, y: 220 },
    { x: 260, y: 380 },
  ];

  /**
   * How wide the ink is where it crosses the plane through `about`, square to
   * `along`. Measured across rather than from a bounding box, which reports the
   * pose of a limb drawn at an angle instead of its thickness.
   */
  function widthAcross(ink: readonly Point[], about: Point, along: Point): number {
    const length = Math.hypot(along.x, along.y) || 1;
    const unit = { x: along.x / length, y: along.y / length };
    const normal = { x: -unit.y, y: unit.x };
    const onPlane = ink.filter(
      (p) => Math.abs((p.x - about.x) * unit.x + (p.y - about.y) * unit.y) < 6,
    );

    return Math.max(...onPlane.map((p) => (p.x - about.x) * normal.x + (p.y - about.y) * normal.y));
  }

  it('is as wide as it was asked to be, measured across the spine', () => {
    const ink = onCurve(capsule(spine, { width: 60 }));
    const middle = spine[1];
    const head = spine[0];
    const tail = spine[2];

    if (middle === undefined || head === undefined || tail === undefined) {
      throw new Error('unreachable');
    }

    const half = widthAcross(ink, middle, { x: tail.x - head.x, y: tail.y - head.y });

    expect(half).toBeGreaterThan(27);
    expect(half).toBeLessThan(33);
  });

  it('tapers when given a width per spine point', () => {
    const ink = onCurve(capsule(spine, { width: [80, 50, 20] }));
    const head = spine[0];
    const middle = spine[1];
    const tail = spine[2];

    if (head === undefined || middle === undefined || tail === undefined) {
      throw new Error('unreachable');
    }

    const axis = { x: tail.x - head.x, y: tail.y - head.y };

    expect(widthAcross(ink, head, axis)).toBeGreaterThan(widthAcross(ink, middle, axis));
    expect(widthAcross(ink, middle, axis)).toBeGreaterThan(widthAcross(ink, tail, axis));
  });

  it('closes, because a limb is a shape and not a stroke', () => {
    expect(capsule(spine, { width: 40 })).toMatch(/Z$/);
  });
});

describe('ellipse', () => {
  it('draws four cubics through the four extremes', () => {
    const d = ellipse({ x: 50, y: 80 }, 30, 20);
    const ink = onCurve(d);

    expect((d.match(/C/g) ?? []).length).toBe(4);
    expect(nearest(ink, { x: 80, y: 80 })).toBeLessThan(0.02);
    expect(nearest(ink, { x: 20, y: 80 })).toBeLessThan(0.02);
    expect(nearest(ink, { x: 50, y: 100 })).toBeLessThan(0.02);
    expect(nearest(ink, { x: 50, y: 60 })).toBeLessThan(0.02);
  });

  it('rotates about its own centre', () => {
    const upright = ellipse({ x: 0, y: 0 }, 40, 10);
    const turned = ellipse({ x: 0, y: 0 }, 40, 10, 90);

    expect(Math.max(...onCurve(upright).map((p) => p.x))).toBeCloseTo(40, 1);
    expect(Math.max(...onCurve(turned).map((p) => p.y))).toBeCloseTo(40, 1);
  });
});

describe('strip', () => {
  it('keeps its depth round a corner, which is what makes it a band', () => {
    const edge: Point[] = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 200 },
    ];
    const ink = onCurve(strip(edge, { depth: 30 }));

    // The inner edge at the corner is 30 in from both sides — on the bisector,
    // at 30/sqrt(2) in each axis — not 30 in from one of them and 42 from the
    // other, which is what offsetting each segment on its own gives.
    expect(nearest(ink, { x: 200 - 30 / Math.SQRT2, y: 30 / Math.SQRT2 })).toBeLessThan(5);
  });

  it('closes back on itself', () => {
    expect(
      strip(
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        { depth: 10 },
      ),
    ).toMatch(/Z$/);
  });
});

describe('fan', () => {
  const from: Point[] = [
    { x: 20, y: 0 },
    { x: 60, y: 100 },
  ];
  const to: Point[] = [
    { x: 220, y: 0 },
    { x: 260, y: 100 },
  ];

  it('draws the two guides and everything between them', () => {
    const strokes = fan(from, to, { count: 5 });

    expect(strokes).toHaveLength(5);
    expect(strokes[0]).toBe(fan(from, to, { count: 2 })[0]);
    expect(strokes.at(-1)).toBe(fan(from, to, { count: 2 })[1]);
  });

  it('spaces them evenly', () => {
    const xs = fan(from, to, { count: 5 }).map((d) => onCurve(d)[0]?.x ?? 0);
    const gaps = xs.slice(1).map((x, i) => x - (xs[i] ?? 0));

    for (const gap of gaps) expect(gap).toBeCloseTo(50, 4);
  });

  it('refuses guides that do not match, rather than drawing half a fan', () => {
    expect(() => fan(from, [{ x: 0, y: 0 }], { count: 3 })).toThrow(/matching guides/);
  });
});
