import { describe, expect, it } from 'vitest';

import { JOURNAL_ENTRIES } from '@/data/journal';
import { SPECIES } from '@/data/species';

import { PAGE_ROUTES, prerenderPaths } from '../site-paths.ts';

/**
 * The half of the prerender's guarantee the script cannot make on its own.
 *
 * `scripts/site-paths.ts` reads its slugs off the filesystem, because neither
 * data module loads under Node's type stripping. This file runs inside Vitest,
 * where both resolve for real, and asserts that the list of files the build
 * writes is exactly the list of addresses the collection implies.
 *
 * It matters more since `public/_redirects` stopped answering unknown paths
 * with the app shell. A route in the tree with no file behind it used to be
 * client-rendered anyway; now it is a 404. This test is the thing standing
 * where that safety net was.
 */

/**
 * The fixed paths `src/app/routes.tsx` serves, spelled the way it spells them.
 *
 * Copied rather than imported, and for a tsconfig reason rather than a lazy
 * one: `scripts/` is the **node** project, which has no `jsx` and no DOM lib,
 * so importing the tree out of a `.tsx` module would pull the whole application
 * into a compiler that cannot read it. `scripts/seo-builder/seo.test.ts` copies
 * the same list for the same reason and says so.
 *
 * What that leaves unchecked is a route added to the tree and to neither list,
 * which is why `src/app/router.test.tsx` asserts the tree against this same
 * spelling from the other side.
 *
 * `/lab/plates` is absent deliberately. It is behind `import.meta.env.DEV`, so
 * the production build never emits it, and the page displays the traced
 * references — which must not ship.
 */
const ROUTER_PATHS: readonly string[] = [
  '/',
  '/catalogue',
  '/key',
  '/calendar',
  '/specimen/:id',
  '/about',
  '/journal',
  '/journal/:slug',
  '/request',
];

describe('the prerendered route list', () => {
  it('writes a file for every fixed route the router serves', async () => {
    const written = new Set(await prerenderPaths());

    for (const path of ROUTER_PATHS) {
      // The two parameterised routes are checked by the tests below, one file
      // per record rather than one file for the pattern.
      if (path.includes(':')) continue;

      expect(written, path).toContain(path);
    }
  });

  it('lists both spellings of the catalogue, because both are real addresses', async () => {
    const written = await prerenderPaths();

    /*
      The sitemap lists only one of these and this lists both, and the two are
      answering different questions. A crawler must not be told to index one
      page twice; a visitor who types either address must get a file. `/` and
      `/catalogue` render the same component, so the pages are identical apart
      from which navigation link is marked current.
    */
    expect(written).toContain('/');
    expect(written).toContain('/catalogue');
  });

  it('writes one file per specimen, and nothing that is not one', async () => {
    const written = await prerenderPaths();
    const specimens = written.filter((path) => path.startsWith('/specimen/'));

    expect(new Set(specimens)).toStrictEqual(
      new Set(SPECIES.map((species) => `/specimen/${species.id}`)),
    );
    expect(specimens).toHaveLength(SPECIES.length);
  });

  it('writes one file per journal entry that parsed', async () => {
    const written = await prerenderPaths();
    const entries = written.filter((path) => path.startsWith('/journal/'));

    expect(new Set(entries)).toStrictEqual(
      new Set(JOURNAL_ENTRIES.map((entry) => `/journal/${entry.slug}`)),
    );
  });

  it('never writes the dev-only lab sheet', async () => {
    const written = await prerenderPaths();

    // `/lab/plates` displays the traced references, which must not ship.
    expect(written.some((path) => path.startsWith('/lab'))).toBe(false);
    expect(PAGE_ROUTES.some((path) => path.startsWith('/lab'))).toBe(false);
  });

  it('is free of duplicates and of trailing slashes', async () => {
    const written = await prerenderPaths();

    // A duplicate would write the same file twice, which is harmless, and mean
    // the two lists had drifted, which is not.
    expect(new Set(written).size).toBe(written.length);

    for (const path of written) {
      expect(path.startsWith('/'), path).toBe(true);
      expect(path === '/' || !path.endsWith('/'), path).toBe(true);
      // A query string or a fragment is not a file name.
      expect(path).not.toMatch(/[?#]/);
    }
  });
});
