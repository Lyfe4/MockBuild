import { createContext } from 'react';

import type { Season } from '@/types';

export interface ThemeContextValue {
  /** The season currently applied to `<html data-season>`. */
  readonly season: Season;
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
