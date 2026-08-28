import type { RouteMeta } from '@/lib/meta';

/**
 * The route meta of whatever is being server-rendered right now.
 *
 * `useRouteMeta` writes the head imperatively from an effect, and effects do not
 * run during `renderToString`. That is the correct behaviour — there is no
 * document to write to — but it would mean every prerendered file shipped the
 * site-level title and description from `index.html`, on every route, to
 * exactly the consumers that prerendering is for: the ones that run no
 * JavaScript. A crawler would see eighteen specimen pages all called
 * "Thornfield Entomological Archive".
 *
 * So the hook also *records* its argument when there is no document, and
 * `scripts/prerender` reads it back after the render and writes the real tags
 * into that route's file. The recording is a side effect during render, which
 * is the one thing render is not supposed to have — and it is how every
 * server-rendered head has ever worked, for the reason that a component is the
 * only thing that knows its own title. It is guarded on `document` being
 * absent, so it never runs in a browser or under jsdom, and `renderToString` is
 * a single synchronous pass with no concurrency for it to be unsafe in.
 *
 * One slot, not a stack: exactly one route component renders per prerendered
 * page, and `take` clears it so a route that somehow rendered none would be
 * caught as `null` rather than silently inheriting the previous page's title.
 */
let collected: RouteMeta | null = null;

/**
 * What one prerendered route comes back as.
 *
 * Declared here rather than beside `renderRoute` in `src/entry-server.tsx`, and
 * the reason is a tsconfig rather than a taste: `scripts/prerender` belongs to
 * the **node** project, which has no `jsx` and no DOM lib, so importing a type
 * out of a `.tsx` module would pull the whole application tree into a compiler
 * that cannot read it. This module is plain TypeScript and DOM-free, which
 * makes it the one place both sides can see. The other half of the pair — the
 * collector below — is why it is *this* module rather than a new one.
 */
export interface RenderedRoute {
  /** The markup for `<div id="root">`. */
  readonly html: string;
  /** What the route asked `useRouteMeta` for, or null if it asked for nothing. */
  readonly meta: RouteMeta | null;
}

/** Record the meta of the route being rendered. Called only where there is no DOM. */
export function collectRouteMeta(route: RouteMeta): void {
  collected = route;
}

/** Read the recorded meta and clear the slot. */
export function takeRouteMeta(): RouteMeta | null {
  const route = collected;

  collected = null;

  return route;
}
