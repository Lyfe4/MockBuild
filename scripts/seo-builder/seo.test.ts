import { describe, expect, it } from 'vitest';

import { JOURNAL_ENTRIES } from '@/data/journal';
import { SITE, siteUrl } from '@/data/site';
import { SPECIES } from '@/data/species';

import { ROUTES, sitemapUrls } from './build.ts';

/**
 * The half of the sitemap's guarantee that the script cannot make on its own.
 *
 * `scripts/seo-builder/build.ts` reads its species and journal slugs off the
 * filesystem, because neither data module can be loaded under Node's type
 * stripping — one imports through extensionless specifiers, the other is built
 * on `import.meta.glob`. This file runs inside Vitest, where both resolve for
 * real, and asserts that what the script produced is exactly what the data says
 * it should be.
 *
 * That is the whole point of testing a sitemap. It is the one document on the
 * site that no human opens, so a specimen missing from it is invisible and
 * nothing looks broken.
 */
describe('the sitemap', () => {
  it('lists every species in the collection, and nothing that is not one', async () => {
    const urls = await sitemapUrls();
    const specimens = urls.filter((url) => url.includes('/specimen/'));

    expect(new Set(specimens)).toEqual(
      new Set(SPECIES.map((species) => siteUrl(`/specimen/${species.id}`))),
    );
    expect(specimens).toHaveLength(SPECIES.length);
  });

  it('lists every journal entry that parsed', async () => {
    const urls = await sitemapUrls();
    const entries = urls.filter((url) => url.includes('/journal/'));

    // The index route is `/journal` with no trailing slug, so it is filtered
    // out here by asking for one more path segment than it has.
    const entryUrls = entries.filter((url) => url !== siteUrl('/journal'));

    expect(new Set(entryUrls)).toEqual(
      new Set(JOURNAL_ENTRIES.map((entry) => siteUrl(`/journal/${entry.slug}`))),
    );
  });

  it('names only routes the router actually serves', () => {
    // `ROUTES` is copied from `src/app/router.tsx` rather than derived from it,
    // which is the one hand-maintained list in this pipeline. Importing the
    // router here would pull React and every route module into the check; what
    // is asserted instead is the property that matters — every fixed route in
    // the sitemap is one the app knows about, spelled the way it spells it.
    const known = new Set([
      '/',
      '/catalogue',
      '/key',
      '/calendar',
      '/about',
      '/journal',
      '/request',
    ]);

    for (const path of ROUTES) expect(known, path).toContain(path);
  });

  it('does not list the 404, the lab or both spellings of the catalogue', async () => {
    const urls = await sitemapUrls();

    expect(urls).not.toContain(siteUrl('/404'));
    expect(urls.some((url) => url.includes('/lab'))).toBe(false);
    // `/` and `/catalogue` render the same component. Listing both would be
    // asking a crawler to index one page twice.
    expect(urls).toContain(siteUrl('/'));
    expect(urls).not.toContain(siteUrl('/catalogue'));
  });

  it('is absolute, on this site, and free of duplicates', async () => {
    const urls = await sitemapUrls();

    expect(new Set(urls).size).toBe(urls.length);

    for (const url of urls) {
      expect(url.startsWith(`${SITE.origin}/`), url).toBe(true);
      // A sitemap entry with a query string or a fragment is an entry a crawler
      // will fetch and then be told, by the page's own canonical, to ignore.
      expect(url).not.toMatch(/[?#]/);
    }
  });
});
