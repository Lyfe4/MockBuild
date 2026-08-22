import { createBrowserRouter } from 'react-router';

import { RootLayout } from './RootLayout';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { HomeRoute } from './routes/HomeRoute';

/**
 * The route tree, declared with react-router's data router API.
 *
 * `createBrowserRouter` rather than `<BrowserRouter>`: it is the form that
 * supports loaders, actions, deferred data and per-route error boundaries. The
 * catalogue and specimen features will need all four, and retrofitting them
 * onto the component router later would mean rewriting this file.
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
 * Delete this, `routes/LabRoute.tsx` and its stylesheet when the catalogue
 * view lands.
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
    ]
  : [];

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [{ index: true, element: <HomeRoute /> }, ...devOnlyRoutes],
  },
]);
