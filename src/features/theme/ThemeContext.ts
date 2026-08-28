import { createContext } from 'react';

import type { Season } from '@/types';

export interface ThemeContextValue {
  /**
   * The season currently applied to `<html data-season>`, or `null` when the
   * archive is **undressed** — no season resolved, the neutral default palette
   * in `styles/tokens.css` painting.
   *
   * Undressed is a real state rather than a hole in the type, and it is the one
   * the prerendered HTML ships in. Which season a reader gets depends on their
   * link, their storage and their clock, none of which a file written at build
   * time can know; so the static document commits to none of them and
   * `ThemeProvider` resolves the season in a layout effect, before the first
   * paint after hydration. Anything that draws from the season has to say what
   * it looks like with no season, and for almost everything the answer is "the
   * neutral one" — which the tokens file already had a name for.
   */
  readonly season: Season | null;
  /** Switch seasons. The DOM attribute follows on the next commit. */
  readonly setSeason: (season: Season) => void;
}

/**
 * Undefined outside a `<ThemeProvider>`. `useSeason` turns that into a readable
 * error rather than letting a component silently read a default that was never
 * configured.
 *
 * The context lives in its own module so that `ThemeProvider.tsx` exports only a
 * component and `useSeason.ts` exports only a hook — which keeps React Fast
 * Refresh able to hot-swap the provider without tearing down state.
 */
export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
