import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';

import { AppProviders } from '@/app/AppProviders';
import { ROUTES } from '@/app/routes';
import { takeRouteMeta, type RenderedRoute } from '@/features/meta/serverMeta';

/**
 * Renders one route to markup, at build time, in Node.
 *
 * ## Why this can exist at all
 *
 * Nothing in the archive is fetched. The eighteen records, their plates, the
 * five journal entries, the reference provenance and the identification key are
 * all module constants compiled into the bundle, so a route is a pure function
 * of its URL and there is no serialised state for the client to be handed. That
 * is the whole reason prerendering is cheap here and would not be in a site
 * with a database behind it.
 *
 * ## `hydrate={false}` is load-bearing
 *
 * `StaticRouterProvider` otherwise emits an inline `<script>` assigning
 * `window.__staticRouterHydrationData`, which the production CSP —
 * `script-src 'self'` — forbids, and which every browser would refuse to run.
 * There is nothing for it to carry: no route has a loader, so the client router
 * re-matches the URL and arrives at the same place from the URL alone.
 *
 * ## The tree is the client's tree
 *
 * Same `AppProviders`, same `StrictMode`, same `ROUTES`. Anything rendered here
 * that the browser would render differently is a hydration mismatch, which is
 * why the two things that depend on *when* and *who* — the season and today's
 * date — are resolved in effects rather than during render. See `ThemeProvider`
 * and `useToday`.
 *
 * The static handler resolves `lazy` routes before rendering, so what comes out
 * is the real page rather than a shell.
 */
export async function renderRoute(url: string): Promise<RenderedRoute> {
  const handler = createStaticHandler(ROUTES);
  const context = await handler.query(new Request(url));

  if (context instanceof Response) {
    // Only a route that redirects or throws a Response can produce this, and
    // the archive has neither. Loud rather than silently emitting an empty file.
    throw new Error(
      `Route ${url} answered with a Response (${String(context.status)}), not a page`,
    );
  }

  const router = createStaticRouter(handler.dataRoutes, context);

  const html = renderToString(
    <StrictMode>
      <AppProviders>
        <StaticRouterProvider router={router} context={context} hydrate={false} />
      </AppProviders>
    </StrictMode>,
  );

  return { html, meta: takeRouteMeta() };
}
