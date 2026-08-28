import { useSyncExternalStore } from 'react';

/**
 * A store that never changes: subscribing is a formality, unsubscribing is a
 * no-op. The whole value of `useSyncExternalStore` here is its *third*
 * argument — the server snapshot — and the two subscription arguments are the
 * price of admission.
 */
const neverChanges = () => () => undefined;

const hydrated = () => true;
const notYet = () => false;

/**
 * False while the document is still the one that came off the build, true once
 * React has hydrated it.
 *
 * Every route is prerendered to static HTML, and hydration's one rule is that
 * the browser's **first** render must produce the markup already on the page.
 * Anything the build cannot know — which season this reader gets, what day it
 * is, whether a dynamically imported module has arrived — therefore cannot be
 * in that first render either. This is the general form of that: gate the part
 * that has to wait, and let it mount on the render after.
 *
 * `useSyncExternalStore` rather than a `useState` and an effect, and not only
 * because the lint rule asks. React handles the server-to-client swap itself,
 * there is no cascading render to explain, and the third argument *is* the
 * idea — "what does this read as on the server" is the question the whole hook
 * exists to answer. `useMediaQuery` in this directory is built the same way for
 * a related reason.
 *
 * Three things in the archive need this shape, and each says so where it is
 * used:
 *
 *   · `ThemeProvider`, through `useReaderSeason`, for the palette.
 *   · `useToday`, which is this with a date in it.
 *   · `SpecimenRow`, which holds back a `React.lazy` boundary — the least
 *     obvious of the three and the most necessary. See its own comment.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(neverChanges, hydrated, notYet);
}
