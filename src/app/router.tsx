import { createBrowserRouter } from 'react-router';

import { ROUTES } from './routes';

/**
 * The browser's router, built from the shared tree in `routes.tsx`.
 *
 * `createBrowserRouter` rather than `<BrowserRouter>`: it is the form that
 * supports loaders, actions, deferred data and per-route error boundaries. The
 * catalogue's data is a module constant today, but the moment any of it is
 * fetched this is the shape that will need no rewriting.
 *
 * It is also half of a pair. `entry-server.tsx` builds a *static* router from
 * the same `ROUTES` at build time, and the file that lands in `dist` is what
 * this router then hydrates — so the two have to be looking at the same tree,
 * which is why the tree is not declared here.
 */
export const router = createBrowserRouter(ROUTES);
