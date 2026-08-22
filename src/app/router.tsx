import { createBrowserRouter } from 'react-router';

import { RootLayout } from './RootLayout';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { CatalogueRoute } from './routes/CatalogueRoute';
import { NotFoundRoute } from './routes/NotFoundRoute';
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
 * TEMPORARY — the generator contact sheet at `/lab`.
 *
 * Two things keep it out of production. `import.meta.env.DEV` is replaced by a
 * literal `false` at build time, so the spread collapses to `[]` and the branch
 * is dead code. And the route is loaded through a dynamic `import()` inside
 * that branch, so once the branch is eliminated nothing references the module
 * at all and it is never emitted — rather than being bundled and merely
 * unreachable.
 *
 * Delete this, `routes/LabRoute.tsx` and its stylesheet when it has served its
 * purpose.
 */
const devOnlyRoutes = import.meta.env.DEV
  ? [
      {
        path: 'lab',
        lazy: async () => {
          const { LabRoute } = await import('./routes/LabRoute');

          return { Component: LabRoute };
        },
      },
      {
        // SPIKE — the beetle contact sheet. Same dead-code technique.
        path: 'lab/insects',
        lazy: async () => {
          const { InsectLabRoute } = await import('./routes/InsectLabRoute');

          return { Component: InsectLabRoute };
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
      { path: 'specimen/:id', element: <SpecimenRoute /> },
      ...devOnlyRoutes,
      // Last: matches anything the routes above did not.
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
]);
