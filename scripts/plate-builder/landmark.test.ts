import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { emitPlate } from './emit.ts';
import { drawShape, validateLandmarks, type LandmarkPlate } from './landmark.ts';

/**
 * The landmark file, and the file it becomes.
 *
 * `plate:verify` already proves that the committed plates match their
 * landmarks, and it runs in `npm run check`. What it cannot prove is that the
 * *build* is worth trusting: that a malformed landmark file is rejected loudly
 * rather than quietly drawn, that building twice gives the same bytes twice,
 * and that the prose survives the round trip. Those are here.
 */

const ROOT = resolve(import.meta.dirname, '..', '..');
const LANDMARKS = join(ROOT, 'src', 'data', 'species', 'landmarks');

const MINIMAL: LandmarkPlate = {
  species: 'test-species',
  constant: 'TEST_SPECIES_PLATE',
  order: 'coleoptera',
  sex: 'unsexed',
  reference: {
    title: 'A plate',
    artist: 'Somebody',
    year: 1900,
    source: 'https://example.invalid/plate',
    licence: 'Public domain',
  },
  doc: ['*Test species*, dorsal.'],
  parts: [
    {
      id: 'elytron',
      rank: 'outline',
      fill: 'pigment',
      shape: {
        kind: 'curve',
        closed: true,
        points: [
          [0, 200],
          [200, 400],
          [160, 900],
          [0, 1000],
        ],
      },
    },
  ],
};

const withPart = (part: unknown): unknown => ({ ...MINIMAL, parts: [part] });

describe('validateLandmarks', () => {
  it('accepts a well-formed file', () => {
    expect(validateLandmarks(MINIMAL, 'test.json')).toBe(MINIMAL);
  });

  it('names every problem at once rather than the first one', () => {
    // An author fixing a landmark file one error per run is an author running
    // the build eleven times.
    expect(() => validateLandmarks({ ...MINIMAL, species: '', order: '' }, 'test.json')).toThrow(
      /species must be a slug[\s\S]*order must be a plate order/,
    );
  });

  it('rejects a shape with no kind, which JSON otherwise draws as nothing', () => {
    expect(() => validateLandmarks(withPart({ ...MINIMAL.parts[0], shape: {} }), 'x.json')).toThrow(
      /shape\.kind is missing or unknown/,
    );
  });

  it('rejects a point that is not a pair, before it becomes NaN in a path', () => {
    const broken = {
      ...MINIMAL.parts[0],
      shape: { kind: 'curve', closed: true, points: [[0, 200], [200], [0, 1000]] },
    };

    expect(() => validateLandmarks(withPart(broken), 'x.json')).toThrow(
      /points\[1\] is not an \[x, y\] pair/,
    );
  });

  it('rejects a fan whose guides do not match, rather than drawing half of it', () => {
    const broken = {
      ...MINIMAL.parts[0],
      shape: {
        kind: 'fan',
        from: [
          [10, 10],
          [20, 200],
        ],
        to: [[100, 10]],
        count: 4,
      },
    };

    expect(() => validateLandmarks(withPart(broken), 'x.json')).toThrow(/same number of points/);
  });

  it('rejects mirror: true, which reads as a instruction and is not one', () => {
    expect(() =>
      validateLandmarks(withPart({ ...MINIMAL.parts[0], mirror: true }), 'x.json'),
    ).toThrow(/mirror may only be false/);
  });

  it('rejects an opacity that is not a plate opacity', () => {
    expect(() =>
      validateLandmarks(withPart({ ...MINIMAL.parts[0], opacity: 'ghost' }), 'x.json'),
    ).toThrow(/opacity must be solid or membrane/);
  });
});

describe('drawShape', () => {
  it('gives a fan one path per stroke and everything else exactly one', () => {
    expect(drawShape({ kind: 'ellipse', at: [0, 0], radii: [10, 10] }, true)).toHaveLength(1);
    expect(
      drawShape(
        {
          kind: 'fan',
          from: [
            [10, 0],
            [10, 100],
          ],
          to: [
            [90, 0],
            [90, 100],
          ],
          count: 6,
        },
        true,
      ),
    ).toHaveLength(6);
  });
});

describe('emitPlate', () => {
  it('writes a file that says it is generated', async () => {
    const source = await emitPlate(MINIMAL, ROOT);

    expect(source.startsWith('// Generated from ../landmarks/test-species.json')).toBe(true);
    expect(source).toContain('npm run plate:build');
  });

  it('carries the prose across, because JSON cannot hold a comment', async () => {
    const source = await emitPlate(
      {
        ...MINIMAL,
        doc: ['A first line.', '', 'A second paragraph.'],
        parts: [{ ...MINIMAL.parts[0]!, note: ['Why this part is drawn this way.'] }],
      },
      ROOT,
    );

    expect(source).toContain(' * A first line.');
    expect(source).toContain(' * A second paragraph.');
    expect(source).toContain('// Why this part is drawn this way.');
  });

  it('is deterministic, which is the whole premise of plate:verify', async () => {
    expect(await emitPlate(MINIMAL, ROOT)).toBe(await emitPlate(MINIMAL, ROOT));
  });

  it('emits the constant and the schema import the plate index expects', async () => {
    const source = await emitPlate(MINIMAL, ROOT);

    expect(source).toContain("import type { SpeciesPlate } from '@/lib/plate';");
    expect(source).toContain('export const TEST_SPECIES_PLATE: SpeciesPlate = {');
  });
});

describe('the committed landmark files', () => {
  it('every one of them validates', async () => {
    const files = (await readdir(LANDMARKS)).filter((name) => name.endsWith('.json'));

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const raw: unknown = JSON.parse(await readFile(join(LANDMARKS, file), 'utf8'));
      const plate = validateLandmarks(raw, file);

      // The file name is the join between a record and its drawing, so a
      // mismatch is a plate that silently belongs to nothing.
      expect(`${plate.species}.json`, file).toBe(file);
    }
  });
});
