import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { seasonFromDate } from '@/lib/season';
import type { Season } from '@/types';

import { ThemeContext, type ThemeContextValue } from './ThemeContext';

export interface ThemeProviderProps {
  children: ReactNode;
  /**
   * Pin the season instead of deriving it from today's date. Intended for tests
   * and for the season picker that will eventually live in the site header;
   * omit it in the app and the archive dresses itself for the current season.
   */
  initialSeason?: Season;
}

/**
 * Applies a seasonal palette by writing `data-season` onto `<html>`.
 *
 * The palettes themselves live entirely in CSS (see `styles/tokens.css`); this
 * provider only decides *which* one is active. That split means a season change
 * costs one attribute write and no React re-render of the tree below — and the
 * default palette still renders correctly if this code never runs.
 *
 * The attribute is set in an effect rather than during render because it mutates
 * a node outside the React tree. There is a single frame on first paint where
 * the neutral default palette is showing; it is a deliberate trade against
 * inlining a blocking script in `index.html`, which the CSP forbids.
 */
export function ThemeProvider({ children, initialSeason }: ThemeProviderProps) {
  const [season, setSeason] = useState<Season>(() => initialSeason ?? seasonFromDate(new Date()));

  useEffect(() => {
    document.documentElement.dataset.season = season;

    // No cleanup: the attribute should persist for the life of the document.
    // The provider is mounted once, at the root, and never unmounts in the app.
  }, [season]);

  // Stable identity so consumers that only call setSeason never re-render.
  const changeSeason = useCallback((next: Season) => {
    setSeason(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ season, setSeason: changeSeason }),
    [season, changeSeason],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
