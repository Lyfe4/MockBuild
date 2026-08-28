/**
 * Every path this site has, derived from the filesystem.
 *
 * Two build steps need the same list and must not be allowed to disagree about
 * it: `scripts/seo-builder` writes the sitemap, and `scripts/prerender` writes
 * one HTML file per route. A specimen missing from the first is invisible to a
 * crawler; a specimen missing from the second is a URL the deploy answers with
 * the not-found page. Both are silent, and they used to be two separate lists.
 *
 * The slugs are read **off the filesystem** rather than imported, and that is
 * not laziness. Node's type stripping runs these modules as written, and
 * neither data module can be loaded: `src/data/species/index.ts` imports its
 * eighteen records through extensionless specifiers, which Node will not
 * resolve, and `src/data/journal` is built on `import.meta.glob`, which exists
 * only inside Vite. Teaching a loader to resolve the alias and the extensions
 * would be a second module system maintained for two scripts.
 *
 * What makes reading the directory safe is that the file name *is* the slug in
 * both places — `findSpecies` keys on it, the landmark files and the reference
 * images are named for it, and `src/data/journal` derives it the same way. And
 * `scripts/seo-builder/seo.test.ts` and `scripts/prerender/prerender.test.ts`
 * both run inside Vitest, where the real modules resolve, and assert that these
 * lists are exactly what `SPECIES` and `JOURNAL_ENTRIES` imply.
 */

import { readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The fixed routes, in the order `src/app/routes.tsx` declares them.
 *
 * `/` and `/catalogue` render the same component and both are listed here,
 * because both are real addresses a reader can land on and each therefore needs
 * a file. The sitemap lists only one of them, which is a different question —
 * see `scripts/seo-builder`.
 *
 * `/lab/plates` is dev-only and never built. The 404 is not a route in this
 * sense; it is written separately, to `dist/404.html`.
 */
export const PAGE_ROUTES: readonly string[] = [
  '/',
  '/catalogue',
  '/key',
  '/calendar',
  '/about',
  '/journal',
  '/request',
];

/** `src/content/journal/five-legs.md` → `five-legs`, sorted for determinism. */
export async function journalSlugs(): Promise<readonly string[]> {
  const files = await readdir(join(ROOT, 'src', 'content', 'journal'));

  return files
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.replace(/\.md$/, ''))
    .sort();
}

/**
 * `src/data/species/lucanus-cervus.ts` → `lucanus-cervus`.
 *
 * One record per file, named for its slug. The generated plates, their tests,
 * the barrel and the plates index all live in the same directory and are
 * excluded by name — a new kind of file there would have to be added here, and
 * the tests are what notice if it is not.
 */
export async function speciesSlugs(): Promise<readonly string[]> {
  const files = await readdir(join(ROOT, 'src', 'data', 'species'));

  return files
    .filter(
      (name) =>
        name.endsWith('.ts') &&
        !name.endsWith('.plate.ts') &&
        !name.endsWith('.test.ts') &&
        name !== 'index.ts' &&
        name !== 'plates.ts',
    )
    .map((name) => name.replace(/\.ts$/, ''))
    .sort();
}

/** Every path that gets an HTML file, in the order they are written. */
export async function prerenderPaths(): Promise<readonly string[]> {
  return [
    ...PAGE_ROUTES,
    ...(await journalSlugs()).map((slug) => `/journal/${slug}`),
    ...(await speciesSlugs()).map((slug) => `/specimen/${slug}`),
  ];
}
