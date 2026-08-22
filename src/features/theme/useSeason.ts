import { useContext } from 'react';

import { ThemeContext, type ThemeContextValue } from './ThemeContext';

/**
 * Read and change the current season.
 *
 * @throws if called outside a `<ThemeProvider>`, which is always a wiring bug.
 */
export function useSeason(): ThemeContextValue {
  const value = useContext(ThemeContext);

  if (value === undefined) {
    throw new Error('useSeason must be used within a <ThemeProvider>');
  }

  return value;
}
