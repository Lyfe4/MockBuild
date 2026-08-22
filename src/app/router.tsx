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
 * Routes are eagerly imported while there is one of them. Split them with
 * `lazy:` once the tree is large enough for it to matter.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [{ index: true, element: <HomeRoute /> }],
  },
]);
