import { createBrowserRouter } from 'react-router';

import { RootLayout } from './RootLayout';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { CatalogueRoute } from './routes/CatalogueRoute';
import { NotFoundRoute } from './routes/NotFoundRoute';

/**
 * The route tree, declared with react-router's data router API.
 *
 * `createBrowserRouter` rather than `<BrowserRouter>`: it is the form that
 * supports loaders, actions, deferred data and per-route error boundaries. The
 * catalogue's data is a module constant today, but the moment any of it is
 * fetched this is the shape that will need no rewriting.
 *
 * ## What is eager and what is split
 *
 * Every route was eagerly imported until the tree was large enough for it to
 * matter, and one build later it was: a single 741 kB bundle, past Vite's 500 kB
 * warning, in which a reader landing on the catalogue downloaded the request
 * form's validation schema, the markdown parser, five journal entries and the
 * identification key before seeing a beetle.
 *
 * Two things stay eager, and both for the same reason — they are what the first
 * paint needs, so splitting them would buy a round trip and nothing else:
 *
 *   · `CatalogueRoute`, which is the index route. A lazy route blocks the first
 *     render until its chunk arrives, so making the landing page lazy moves the
 *     whole cost into a second request and delays the largest contentful paint
 *     by exactly one network round trip. It is also the one route almost every
 *     visitor sees.
 *   · `NotFoundRoute`, which is 2 kB, is rendered *inside* two other routes as
 *     their empty state (`SpecimenRoute`, `JournalEntryRoute`), and would
 *     otherwise be duplicated into both of their chunks.
 *
 * Everything else is `lazy`. The species records and the eighteen plates are
 * shared by nearly all of them and end up in a chunk of their own — see
 * `build.rolldownOptions.output.advancedChunks` in vite.config.ts, which is
 * where that grouping is declared and argued.
 *
 * `lazy` rather than `React.lazy`: it is the data router's own mechanism, it
 * runs during the navigation rather than during render, and it therefore needs
 * no Suspense boundary and produces no flash of a fallback. react-router keeps
 * the current page on screen until the next route's module has loaded.
 */

/** One lazily loaded route, by the name of its exported component. */
function route(path: string, load: () => Promise<Record<string, unknown>>, name: string) {
  return {
    path,
    lazy: async () => {
      const module = await load();

      return { Component: module[name] as React.ComponentType };
    },
  };
}

/**
 * TEMPORARY — the plate contact sheet at `/lab/plates`.
 *
 * Two things keep it out of production. `import.meta.env.DEV` is replaced by a
 * literal `false` at build time, so the spread collapses to `[]` and the branch
 * is dead code. And the route is loaded through a dynamic `import()` inside
 * that branch, so once the branch is eliminated nothing references the module
 * at all and it is never emitted — rather than being bundled and merely
 * unreachable. That matters more here than it looks: the page displays the
 * traced references from `references/`, which must not ship.
 *
 * Delete this, `routes/PlateLabRoute.tsx` and its stylesheet once the plates
 * are judged good enough that the sheet has nothing left to say.
 */
const devOnlyRoutes = import.meta.env.DEV
  ? [route('lab/plates', () => import('./routes/PlateLabRoute'), 'PlateLabRoute')]
  : [];

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      // The catalogue is the home page for now; `/catalogue` is its permanent
      // address, and both render the same component rather than redirecting so
      // a link to either keeps working when a real landing page arrives.
      { index: true, element: <CatalogueRoute /> },
      { path: 'catalogue', element: <CatalogueRoute /> },
      // The key keeps its answers in the query string rather than the path, so
      // one route serves the intro, every question and every leaf. See
      // `KeyRoute` for why the parameter's absence is the intro.
      route('key', () => import('./routes/KeyRoute'), 'KeyRoute'),
      // The phenology calendar, whose row order lives in the query string for
      // the same reason the catalogue's filters do: a link to the chart should
      // be a link to the chart somebody was looking at.
      route('calendar', () => import('./routes/CalendarRoute'), 'CalendarRoute'),
      route('specimen/:id', () => import('./routes/SpecimenRoute'), 'SpecimenRoute'),
      // The institution's own pages. `/about` is where the fiction is owned up
      // to in full, which is why the footer's disclaimer links to it.
      route('about', () => import('./routes/AboutRoute'), 'AboutRoute'),
      // The journal is a real path per entry rather than a query parameter: an
      // entry is a document with an address, and the index is a list of them.
      route('journal', () => import('./routes/JournalRoute'), 'JournalRoute'),
      route('journal/:slug', () => import('./routes/JournalEntryRoute'), 'JournalEntryRoute'),
      // The request form keeps its preselected specimen in the query string, so
      // a specimen sheet can link straight to it: `/request?species=<id>`.
      route('request', () => import('./routes/RequestRoute'), 'RequestRoute'),
      ...devOnlyRoutes,
      // Last: matches anything the routes above did not.
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
]);
