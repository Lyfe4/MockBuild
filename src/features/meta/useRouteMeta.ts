import { useEffect } from 'react';

import { SITE, siteUrl } from '@/data/site';
import type { RouteMeta } from '@/lib/meta';

import { collectRouteMeta } from './serverMeta';

/**
 * Writes one route's metadata into the document head.
 *
 * ## Why this is imperative rather than rendered
 *
 * React 19 hoists `<title>`, `<meta>` and `<link>` from anywhere in the tree
 * into the head, which is the obvious way to do this and the wrong one here.
 * Hoisting **appends**: `index.html` already ships a `<meta name="description">`
 * and a `<link rel="canonical">` so that a crawler which runs no JavaScript sees
 * something truthful, and a rendered tag would sit *after* those rather than
 * replace them. Every consumer that reads a description reads the first one, so
 * the static site-level copy would win on every route and the per-route text
 * would never be seen by anything.
 *
 * So each tag is found by selector and its content replaced. The tags that are
 * already in `index.html` are updated in place; the Open Graph ones that are not
 * are created once and then updated. Nothing is ever appended twice.
 *
 * ## Why nothing is restored on unmount
 *
 * Deliberately. Every route sets every field, so the next route overwrites all
 * of them before anything can read a stale value — and a cleanup that restored
 * the previous route's description would put it back for the moment between one
 * route unmounting and the next one mounting, which is the only window in which
 * a scraper could see it.
 */
function upsert(selector: string, create: () => HTMLElement, apply: (el: HTMLElement) => void) {
  const existing = document.head.querySelector<HTMLElement>(selector);
  const element = existing ?? create();

  apply(element);

  if (existing === null) document.head.append(element);
}

function meta(nameOrProperty: string, content: string, kind: 'name' | 'property') {
  upsert(
    `meta[${kind}="${nameOrProperty}"]`,
    () => {
      const el = document.createElement('meta');

      el.setAttribute(kind, nameOrProperty);

      return el;
    },
    (el) => {
      el.setAttribute('content', content);
    },
  );
}

export function useRouteMeta(route: RouteMeta): void {
  const { title, description, canonical, ogType } = route;

  /*
    Prerendering. There is no document and no effect will run, so the route
    records what it would have written and `scripts/prerender` puts it into the
    file instead. `serverMeta.ts` argues the case; the guard means this is dead
    in every browser and in every test.
  */
  if (typeof document === 'undefined') collectRouteMeta(route);

  useEffect(() => {
    // The title is what a screen reader announces after a navigation, as well
    // as what names a bookmark — which is why it was the first of these the
    // site had.
    document.title = title;

    meta('description', description, 'name');
    meta('og:title', title, 'property');
    meta('og:description', description, 'property');
    meta('og:url', canonical, 'property');
    meta('og:type', ogType, 'property');
    // Constant across routes, and set here anyway: `index.html` carries them
    // for the first paint, and re-applying costs nothing and means one place
    // decides what they are.
    meta('og:site_name', SITE.name, 'property');
    meta('og:locale', SITE.locale, 'property');
    meta('og:image', siteUrl(SITE.ogImagePath), 'property');
    meta('twitter:card', 'summary_large_image', 'name');

    upsert(
      'link[rel="canonical"]',
      () => {
        const el = document.createElement('link');

        el.setAttribute('rel', 'canonical');

        return el;
      },
      (el) => {
        el.setAttribute('href', canonical);
      },
    );
  }, [title, description, canonical, ogType]);
}
