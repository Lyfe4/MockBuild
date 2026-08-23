import { describe, expect, it } from 'vitest';

import {
  boundsOf,
  formatPathData,
  parsePathData,
  PathSyntaxError,
  pathPoints,
  type PlateSegment,
} from './pathData';

/**
 * The parser is the plate schema's foundation: the validator, the mirror check
 * and the fitted view box all read geometry through it, so a path it
 * misunderstands is a plate that is checked against the wrong numbers. These
 * cover the two things that matter — that every spelling of a path arrives as
 * the same commands, and that everything it cannot represent is rejected loudly
 * rather than guessed at.
 */
describe('parsePathData', () => {
  it('reads a move, a line and a close', () => {
    expect(parsePathData('M0 0 L10 20 Z')).toEqual([
      { c: 'M', x: 0, y: 0 },
      { c: 'L', x: 10, y: 20 },
      { c: 'Z' },
    ]);
  });

  it('reads a cubic with all six arguments', () => {
    expect(parsePathData('M0 0 C1 2 3 4 5 6')).toEqual([
      { c: 'M', x: 0, y: 0 },
      { c: 'C', x1: 1, y1: 2, x2: 3, y2: 4, x: 5, y: 6 },
    ]);
  });

  it('reads negative and fractional numbers', () => {
    expect(parsePathData('M-1.5 0.25 L.5 -.75')).toEqual([
      { c: 'M', x: -1.5, y: 0.25 },
      { c: 'L', x: 0.5, y: -0.75 },
    ]);
  });

  it('needs no separators at all — a minus sign is one', () => {
    // Legal SVG, and the form a minifier emits. A parser that split on
    // whitespace would read this as two numbers instead of four.
    expect(parsePathData('M0 0L10-20L-30 40')).toEqual([
      { c: 'M', x: 0, y: 0 },
      { c: 'L', x: 10, y: -20 },
      { c: 'L', x: -30, y: 40 },
    ]);
  });

  it('accepts commas as separators', () => {
    expect(parsePathData('M0,0 L10,20')).toEqual(parsePathData('M0 0 L10 20'));
  });

  it('repeats a command when its arguments are repeated', () => {
    expect(parsePathData('M0 0 L1 1 2 2 3 3')).toEqual([
      { c: 'M', x: 0, y: 0 },
      { c: 'L', x: 1, y: 1 },
      { c: 'L', x: 2, y: 2 },
      { c: 'L', x: 3, y: 3 },
    ]);
  });

  it('treats a coordinate pair repeated after a move as an implicit line', () => {
    expect(parsePathData('M0 0 5 5')).toEqual([
      { c: 'M', x: 0, y: 0 },
      { c: 'L', x: 5, y: 5 },
    ]);
  });

  it('resolves relative commands to absolute', () => {
    expect(parsePathData('M10 10 l5 5 c1 1 2 2 3 3')).toEqual([
      { c: 'M', x: 10, y: 10 },
      { c: 'L', x: 15, y: 15 },
      { c: 'C', x1: 16, y1: 16, x2: 17, y2: 17, x: 18, y: 18 },
    ]);
  });

  it('returns the pen to the start of the subpath after a close', () => {
    expect(parsePathData('M10 10 L20 20 Z l5 5')).toEqual([
      { c: 'M', x: 10, y: 10 },
      { c: 'L', x: 20, y: 20 },
      { c: 'Z' },
      { c: 'L', x: 15, y: 15 },
    ]);
  });

  it('rejects empty path data', () => {
    expect(() => parsePathData('   ')).toThrow(PathSyntaxError);
  });

  it('rejects a path that does not begin with a move', () => {
    expect(() => parsePathData('L10 10')).toThrow(/must begin with a move/);
  });

  it('rejects a path that begins with a number', () => {
    expect(() => parsePathData('10 10 L20 20')).toThrow(/must begin with a command/);
  });

  it.each(['A', 'Q', 'S', 'T', 'H', 'V'])('rejects the unsupported command %s', (verb) => {
    expect(() => parsePathData(`M0 0 ${verb}1 1 2 2`)).toThrow(/unsupported command/);
  });

  it('rejects a command with too few arguments', () => {
    expect(() => parsePathData('M0 0 C1 2 3 4 5')).toThrow(/needs 6 numbers/);
  });

  it('rejects a stray character', () => {
    expect(() => parsePathData('M0 0 L10 #20')).toThrow(/unexpected character/);
  });

  it('rejects arguments after a close rather than looping for ever', () => {
    // `Z` consumes nothing, so a number after it can never be eaten: falling
    // through would push a close and advance no index. This test is here to
    // fail in milliseconds instead of hanging the suite.
    expect(() => parsePathData('M0 0 Z 5 5')).toThrow(/Z takes no arguments/);
  });

  it('rounds to two decimal places', () => {
    expect(parsePathData('M1.23456 0')).toEqual([{ c: 'M', x: 1.23, y: 0 }]);
  });
});

describe('formatPathData', () => {
  it('round-trips structured commands through text unchanged', () => {
    const segments: PlateSegment[] = [
      { c: 'M', x: 139.6, y: 7.3 },
      { c: 'C', x1: 156.2, y1: 42.7, x2: 174, y2: 71.9, x: 190.6, y: 105.2 },
      { c: 'L', x: -0.5, y: 1000 },
      { c: 'Z' },
    ];

    expect(parsePathData(formatPathData(segments))).toEqual(segments);
  });

  it('normalises any accepted spelling to one canonical form', () => {
    const compact = 'M0 0L10-20l5 5Z';
    const spaced = 'M 0,0 L 10,-20 L 15,-15 Z';

    expect(formatPathData(parsePathData(compact))).toBe(formatPathData(parsePathData(spaced)));
    expect(formatPathData(parsePathData(compact))).toBe('M0 0 L10 -20 L15 -15 Z');
  });

  it('is idempotent — formatting a normalised path changes nothing', () => {
    const once = formatPathData(parsePathData('M0 0 C1 1 2 2 3 3 Z'));

    expect(formatPathData(parsePathData(once))).toBe(once);
  });
});

describe('pathPoints', () => {
  it('collects anchors and control points alike', () => {
    // Control points included on purpose: the midline check should complain
    // about a control point that has strayed across the axis, because a curve
    // pulled by one is a curve that crosses.
    expect(pathPoints(parsePathData('M0 0 C1 2 3 4 5 6 Z'))).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 3, y: 4 },
      { x: 5, y: 6 },
    ]);
  });

  it('contributes nothing for a close', () => {
    expect(pathPoints(parsePathData('M1 1 Z'))).toEqual([{ x: 1, y: 1 }]);
  });
});

describe('boundsOf', () => {
  it('measures the extent of a set of points', () => {
    expect(boundsOf(pathPoints(parsePathData('M0 10 L40 -5 L20 300')))).toEqual({
      minX: 0,
      minY: -5,
      maxX: 40,
      maxY: 300,
    });
  });

  it('returns undefined for no points, rather than an inverted box', () => {
    expect(boundsOf([])).toBeUndefined();
  });
});
