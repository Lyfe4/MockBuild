/**
 * `npm run plate:build` — rebuild every plate from its landmarks.
 * `npm run plate:verify` — check that no plate has drifted from its landmarks.
 *
 * The verify pass is the reason the build is worth having. A generated file
 * that nothing checks is a file somebody edits by hand the first time a wing
 * looks wrong at 600 pixels, and from then on the landmarks are fiction. So it
 * runs in `npm run check`, before the tests, and it compares bytes: the build
 * is deterministic — no clock, no randomness, fixed rounding, Prettier with the
 * project's own config — so byte equality is a fair thing to demand.
 *
 * Both modes build everything before reporting, so one broken landmark file
 * does not hide the state of the other seven.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import process from 'node:process';

import { emitPlate } from './emit.ts';
import { validateLandmarks } from './landmark.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const LANDMARKS = join(ROOT, 'src', 'data', 'species', 'landmarks');
const SPECIES = join(ROOT, 'src', 'data', 'species');

interface Built {
  readonly slug: string;
  readonly target: string;
  readonly source: string;
}

async function buildAll(): Promise<Built[]> {
  const files = (await readdir(LANDMARKS)).filter((name) => name.endsWith('.json')).sort();
  const built: Built[] = [];

  for (const file of files) {
    const raw: unknown = JSON.parse(await readFile(join(LANDMARKS, file), 'utf8'));
    const plate = validateLandmarks(raw, file);
    const slug = file.replace(/\.json$/, '');

    if (plate.species !== slug) {
      throw new Error(`${file} declares species '${plate.species}'; the file name must match`);
    }

    built.push({
      slug,
      target: join(SPECIES, `${slug}.plate.ts`),
      source: await emitPlate(plate, ROOT),
    });
  }

  return built;
}

async function main(): Promise<void> {
  const verify = process.argv.includes('--verify');
  const built = await buildAll();

  if (built.length === 0) {
    console.error(`no landmark files in ${LANDMARKS}`);
    process.exitCode = 1;

    return;
  }

  if (!verify) {
    for (const plate of built) await writeFile(plate.target, plate.source, 'utf8');

    console.log(`plate:build — wrote ${String(built.length)} plates`);

    return;
  }

  const drifted: string[] = [];

  for (const plate of built) {
    const committed = await readFile(plate.target, 'utf8').catch(() => undefined);

    if (committed === undefined) {
      drifted.push(`${plate.slug}: no committed plate — run npm run plate:build`);
      continue;
    }

    if (committed !== plate.source) {
      // The first differing line, which is nearly always the one part that was
      // hand-edited, and far more use than "the files differ".
      const a = committed.split('\n');
      const b = plate.source.split('\n');
      const at = a.findIndex((line, i) => line !== b[i]);

      drifted.push(
        `${plate.slug}: differs from its landmarks at line ${String(at + 1)}\n` +
          `    committed: ${(a[at] ?? '<end of file>').trim().slice(0, 100)}\n` +
          `    landmarks: ${(b[at] ?? '<end of file>').trim().slice(0, 100)}`,
      );
    }
  }

  if (drifted.length > 0) {
    console.error(
      `plate:verify — ${String(drifted.length)} plate(s) do not match their landmarks:`,
    );

    for (const problem of drifted) console.error(`  ${problem}`);

    console.error('\n  The plate files are generated. Edit src/data/species/landmarks/*.json');
    console.error('  and run npm run plate:build.');
    process.exitCode = 1;

    return;
  }

  console.log(`plate:verify — ${String(built.length)} plates match their landmarks`);
}

await main();
