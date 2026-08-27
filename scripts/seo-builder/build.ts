/**
 * `npm run seo:build` — regenerate `public/robots.txt` and `public/sitemap.xml`.
 * `npm run seo:verify` — check the committed files have not drifted.
 *
 * Same shape and the same reasoning as the plate and sources builders: a
 * generated file that nothing checks is a file somebody edits by hand, and from
 * then on it is fiction. `seo:verify` runs inside `npm run check`, and compares
 * **bytes** — there is no clock and no randomness here, so byte equality is a
 * fair thing to demand.
 *
 * It matters more for a sitemap than for most generated files, because a
 * sitemap is the one document on the site that no human ever opens. A specimen
 * accessioned without its URL being listed is invisible, and nothing would look
 * broken.
 *
 * ## Where the URLs come from
 *
 * `ROUTES` below mirrors the tree in `src/app/router.tsx`, and the eighteen
 * specimen URLs and five journal URLs are read out of the data — so accessioning
 * a species or filing an entry updates the sitemap, and forgetting to rebuild
 * fails the check.
 *
 * The route list is the one part that is copied rather than derived. Reading
 * `router.tsx` would mean importing React, react-router and every route module
 * into a Node script; the list is six lines and `seo.test.ts` asserts it against
 * the live router, which is the cheaper half of the same guarantee.
 *
 * Both sets of slugs are read **off the filesystem** rather than imported, and
 * that is not laziness. Node's type stripping runs these modules as written, and
 * neither can be loaded: `src/data/species/index.ts` imports its eighteen
 * records through extensionless specifiers, which Node will not resolve, and
 * `src/data/journal` is built on `import.meta.glob`, which exists only inside
 * Vite. Teaching a loader to resolve the alias and the extensions would be a
 * second module system maintained for one script.
 *
 * What makes reading the directory safe is that the file name *is* the slug in
 * both places — `findSpecies` keys on it, the landmark files and the reference
 * images are named for it, and `src/data/journal` derives it the same way. And
 * `scripts/seo-builder/seo.test.ts` runs inside Vitest, where the real modules
 * do resolve, and asserts that this sitemap holds exactly the URLs `SPECIES`
 * and `JOURNAL_ENTRIES` imply — so a drift fails a test rather than dropping a
 * specimen out of the sitemap quietly.
 *
 * ## What is deliberately absent
 *
 * No `lastmod`, no `changefreq`, no `priority`. `lastmod` would have to come
 * from a clock or from git, and either makes the output non-deterministic and
 * the verify step a lie; Google ignores the other two outright. A sitemap that
 * carries three fields nobody reads and one that cannot be checked is worse
 * than a plain list of URLs, which is what this is.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { siteUrl } from '../../src/data/site.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUBLIC = join(ROOT, 'public');

/**
 * The fixed routes, in the order `src/app/router.tsx` declares them.
 *
 * `/` and `/catalogue` render the same component, and only `/` is listed:
 * two URLs for one page is the duplicate-content problem a sitemap should not
 * be creating. The catalogue's own canonical link points at `/catalogue`, and
 * the home page's at `/` — which is the pair a crawler needs, and neither is
 * helped by listing both here.
 *
 * `/lab/plates` is dev-only and never built. `*` is the 404, which must not be
 * in a sitemap at all.
 */
export const ROUTES: readonly string[] = [
  '/',
  '/key',
  '/calendar',
  '/about',
  '/journal',
  '/request',
];

/** `src/content/journal/five-legs.md` → `five-legs`, sorted for determinism. */
async function journalSlugs(): Promise<readonly string[]> {
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
 * `seo.test.ts` is what notices if it is not.
 */
async function speciesSlugs(): Promise<readonly string[]> {
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

export async function sitemapUrls(): Promise<readonly string[]> {
  return [
    ...ROUTES.map((path) => siteUrl(path)),
    ...(await speciesSlugs()).map((slug) => siteUrl(`/specimen/${slug}`)),
    ...(await journalSlugs()).map((slug) => siteUrl(`/journal/${slug}`)),
  ];
}

async function sitemap(): Promise<string> {
  const urls = (await sitemapUrls())
    .map((url) => `  <url>\n    <loc>${url}</loc>\n  </url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function robots(): string {
  return `# Generated by \`npm run seo:build\`. Do not edit; \`npm run seo:verify\`
# fails the check if this file and src/data/site.ts drift apart.
#
# Everything here is public and static, so everything is crawlable. The two
# disallowed paths are not secrets — they are URLs that would waste a crawl:
#
#   /lab/       the plate contact sheet. Dev-only and never built, so this is a
#               belt-and-braces line rather than a live rule.
#   /*?k=       the identification key mid-answer. Every state of the key lives
#               at /key with its answers in the query string, and there are
#               hundreds of them; they are steps through one document, and the
#               page's own canonical link already says so.

User-agent: *
Allow: /
Disallow: /lab/
Disallow: /*?k=

Sitemap: ${siteUrl('/sitemap.xml')}
`;
}

async function main(): Promise<void> {
  const verify = process.argv.includes('--verify');
  const files: readonly (readonly [string, string])[] = [
    ['robots.txt', robots()],
    ['sitemap.xml', await sitemap()],
  ];
  const count = (await sitemapUrls()).length;

  for (const [name, expected] of files) {
    const path = join(PUBLIC, name);

    if (verify) {
      const actual = await readFile(path, 'utf8').catch(() => null);

      if (actual !== expected) {
        console.error(
          `seo:verify — public/${name} has drifted from src/data/site.ts.\n` +
            '  Run `npm run seo:build` and commit the result.',
        );
        process.exitCode = 1;

        return;
      }
    } else {
      await writeFile(path, expected, 'utf8');
    }
  }

  console.log(
    verify
      ? `seo:verify — robots.txt and sitemap.xml match (${String(count)} URLs)`
      : `seo:build — wrote public/robots.txt and public/sitemap.xml (${String(count)} URLs)`,
  );
}

await main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
