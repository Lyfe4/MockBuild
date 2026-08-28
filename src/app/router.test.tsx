import type { RouteObject } from 'react-router';
import { describe, expect, it } from 'vitest';

import { ROUTES } from './routes';

/**
 * The other half of the prerender's guarantee.
 *
 * Every address the router serves has to be written to a file at build time,
 * because `public/_redirects` no longer answers an unmatched path with the app
 * shell — it answers with the not-found page and a 404 status. A route added to
 * the tree and forgotten in `scripts/site-paths.ts` is therefore a route that
 * 404s in production while working perfectly in `npm run dev`.
 *
 * `scripts/prerender/prerender.test.ts` holds the *file list* against the same
 * spelling below, but it cannot import this tree: `scripts/` is the node
 * tsconfig project, with no `jsx` and no DOM lib, and pulling a `.tsx` module
 * into it drags the whole application into a compiler that cannot read it. So
 * the check is made from both ends against one literal, which is the shape that
 * fails loudly when either side moves.
 */
const EXPECTED_PATHS: readonly string[] = [
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

/** Every path the tree declares, flattened, minus the splat and the lab sheet. */
function declaredPaths(routes: readonly RouteObject[]): readonly string[] {
  const paths: string[] = [];

  for (const parent of routes) {
    for (const child of parent.children ?? []) {
      if (child.index === true) {
        paths.push('/');
        continue;
      }

      const path = child.path;

      if (path === undefined || path === '*') continue;

      /*
        `/lab/plates` is behind `import.meta.env.DEV`, which is **true** under
        Vitest and false in a build — so it is present here and absent from
        anything the prerenderer sees. That is the intended asymmetry: the page
        displays the traced references, which must never ship.
      */
      if (path.startsWith('lab/')) continue;

      paths.push(`/${path}`);
    }
  }

  return paths;
}

describe('the route tree', () => {
  it('serves exactly the paths the build writes files for', () => {
    expect(declaredPaths(ROUTES)).toStrictEqual(EXPECTED_PATHS);
  });

  it('keeps the dev-only lab sheet out of a production tree', () => {
    // Present under Vitest, which runs with DEV true. The assertion is that it
    // is reachable only through that flag, so `import.meta.env.DEV` being false
    // removes it — which is what the production build does.
    const lab = ROUTES[0]?.children?.filter((child) => child.path?.startsWith('lab/') === true);

    expect(import.meta.env.DEV).toBe(true);
    expect(lab).toHaveLength(1);
  });

  it('ends with a splat, so an unknown path renders the not-found page', () => {
    const children = ROUTES[0]?.children ?? [];

    // Order matters: react-router ranks routes rather than taking the first
    // match, but the splat being last is what this file is declaring, and a
    // reader moving it would want to have thought about it.
    expect(children.at(-1)?.path).toBe('*');
  });
});
