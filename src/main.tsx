import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
// react-router v8 moved the DOM RouterProvider out of the root entry point.
// The one here wraps the core provider and hands it `ReactDOM.flushSync`, which
// is what makes view transitions and scroll restoration work; importing
// `RouterProvider` from 'react-router' still type-checks but silently loses
// both.
import { RouterProvider } from 'react-router/dom';

import { AppProviders, router } from '@/app';

import '@/styles/index.css';

const container = document.getElementById('root');

if (container === null) {
  throw new Error('Root container #root is missing from index.html');
}

/**
 * Wait for the router to finish its initial match before hydrating.
 *
 * Every route but the catalogue is `lazy`, and a data router that is still
 * loading a route module has `state.initialized === false` — in which case
 * `RouterProvider` renders nothing at all. Hydrating in that state would mean
 * React's first client render produced an empty page against a file full of
 * markup: the whole prerendered document discarded, and a hydration mismatch
 * reported for it.
 *
 * `createBrowserRouter` starts the initial navigation as it is constructed, so
 * on the landing page — the catalogue, which is eagerly imported — this is
 * already true and resolves in the same tick. On a deep link into a lazy route
 * it is one dynamic `import()`, which the module preload in `index.html` has
 * already started fetching.
 *
 * The prerendered HTML is on screen the whole time. Nothing is blank while this
 * waits; the page is simply not yet interactive, which is the honest state of a
 * document whose JavaScript has not finished arriving.
 */
function whenRouterIsReady(): Promise<void> {
  if (router.state.initialized) return Promise.resolve();

  return new Promise((resolve) => {
    const unsubscribe = router.subscribe((state) => {
      if (!state.initialized) return;

      unsubscribe();
      resolve();
    });
  });
}

void whenRouterIsReady().then(() => {
  hydrateRoot(
    container,
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  );
});
