import { createBrowserRouter } from 'react-router';

import { RootLayout } from './RootLayout';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { AboutRoute } from './routes/AboutRoute';
import { CalendarRoute } from './routes/CalendarRoute';
import { CatalogueRoute } from './routes/CatalogueRoute';
import { JournalEntryRoute } from './routes/JournalEntryRoute';
import { JournalRoute } from './routes/JournalRoute';
import { KeyRoute } from './routes/KeyRoute';
import { NotFoundRoute } from './routes/NotFoundRoute';
import { RequestRoute } from './routes/RequestRoute';
import { SpecimenRoute } from './routes/SpecimenRoute';

/**
 * The route tree, declared with react-router's data router API.
 *
 * `createBrowserRouter` rather than `<BrowserRouter>`: it is the form that
 * supports loaders, actions, deferred data and per-route error boundaries. The
 * catalogue's data is a module constant today, but the moment any of it is
 * fetched this is the shape that will need no rewriting.
 *
 * Routes are eagerly imported while there are so few of them. Split them with
 * `lazy:` once the tree is large enough for it to matter.
 */

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
  ? [
      {
        path: 'lab/plates',
        lazy: async () => {
          const { PlateLabRoute } = await import('./routes/PlateLabRoute');

          return { Component: PlateLabRoute };
        },
      },
    ]
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
      { path: 'key', element: <KeyRoute /> },
      // The phenology calendar, whose row order lives in the query string for
      // the same reason the catalogue's filters do: a link to the chart should
      // be a link to the chart somebody was looking at.
      { path: 'calendar', element: <CalendarRoute /> },
      { path: 'specimen/:id', element: <SpecimenRoute /> },
      // The institution's own pages. `/about` is where the fiction is owned up
      // to in full, which is why the footer's disclaimer links to it.
      { path: 'about', element: <AboutRoute /> },
      // The journal is a real path per entry rather than a query parameter: an
      // entry is a document with an address, and the index is a list of them.
      { path: 'journal', element: <JournalRoute /> },
      { path: 'journal/:slug', element: <JournalEntryRoute /> },
      // The request form keeps its preselected specimen in the query string, so
      // a specimen sheet can link straight to it: `/request?species=<id>`.
      { path: 'request', element: <RequestRoute /> },
      ...devOnlyRoutes,
      // Last: matches anything the routes above did not.
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
]);
