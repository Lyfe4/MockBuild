/**
 * `npm run sources:build` — regenerate `references/SOURCES.md`.
 * `npm run sources:verify` — check the committed file has not drifted.
 *
 * Same shape and the same reasoning as the plate builder: a generated file that
 * nothing checks is a file somebody edits by hand, and from then on the data
 * module is fiction. So verify runs inside `npm run check` and in CI, and it
 * compares bytes — the build is deterministic, with no clock and no randomness,
 * so byte equality is a fair thing to demand.
 *
 * What makes it worth having here rather than just keeping the markdown by hand
 * is that the same records are rendered twice: once into this file for a reader
 * of the repository, and once into the About page's credits list for a visitor.
 * A licence that is right in one place and stale in the other is worse than one
 * that is wrong in both, because nothing looks broken.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import process from 'node:process';

import { emitSources } from './emit.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const TARGET = join(ROOT, 'references', 'SOURCES.md');

async function main(): Promise<void> {
  const verify = process.argv.includes('--verify');
  const generated = await emitSources(ROOT);

  if (!verify) {
    await writeFile(TARGET, generated, 'utf8');
    console.log('sources:build — wrote references/SOURCES.md');

    return;
  }

  const committed = await readFile(TARGET, 'utf8').catch(() => undefined);

  if (committed === generated) {
    console.log('sources:verify — references/SOURCES.md matches src/data/references/sources.ts');

    return;
  }

  if (committed === undefined) {
    console.error('sources:verify — references/SOURCES.md is missing. Run npm run sources:build.');
    process.exitCode = 1;

    return;
  }

  // The first differing line, which is nearly always the one field that was
  // hand-edited, and far more use than "the files differ".
  const a = committed.split('\n');
  const b = generated.split('\n');
  const at = a.findIndex((line, index) => line !== b[index]);

  console.error('sources:verify — references/SOURCES.md has drifted from its data module:');
  console.error(`  first difference at line ${String(at + 1)}`);
  console.error(`    committed: ${(a[at] ?? '<end of file>').trim().slice(0, 100)}`);
  console.error(`    generated: ${(b[at] ?? '<end of file>').trim().slice(0, 100)}`);
  console.error('\n  SOURCES.md is generated. Edit src/data/references/sources.ts');
  console.error('  and run npm run sources:build.');
  process.exitCode = 1;
}

await main();
