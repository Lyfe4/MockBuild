import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';

import { seasonFromDate } from '@/lib/season';
import type { Season } from '@/types';

import { readStoredSeason, seasonFromLocation, storeSeason } from './seasonStorage';
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
 * Which season to open with.
 *
 * In precedence order: an explicit `?season=` in the link that was followed, a
 * season the reader has chosen before, and finally today's date. A shared link
 * showing the archive in winter should show winter even to a reader who once
 * picked spring — the link is the more specific intent.
 */
function resolveInitialSeason(pinned: Season | undefined): Season {
  if (pinned !== undefined) return pinned;

  return (
    seasonFromLocation(window.location.search) ?? readStoredSeason() ?? seasonFromDate(new Date())
  );
}

/**
 * Applies a seasonal palette by writing `data-season` onto `<html>`.
 *
 * The palettes themselves live entirely in CSS (see `styles/tokens.css`); this
 * provider only decides *which* one is active. That split means a season change
 * costs one attribute write and no React re-render of the tree below — and the
 * default palette still renders correctly if this code never runs.
 *
 * The attribute is written from an effect rather than during render because it
 * mutates a node outside the React tree. It uses `useLayoutEffect` specifically:
 * layout effects run after the DOM is updated but *before* the browser paints,
 * so the season lands on the very first paint and the neutral default palette is
 * never visible. A plain `useEffect` runs after paint, which would show the
 * default for a frame. The app is client-rendered only, so the usual SSR caveat
 * about `useLayoutEffect` does not apply.
 *
 * Getting the palette right on the first paint is only half of it — see the
 * `data-theme-ready` effect below for why the cross-fade has to be held back.
 */
export function ThemeProvider({ children, initialSeason }: ThemeProviderProps) {
  const [season, setSeason] = useState<Season>(() => resolveInitialSeason(initialSeason));

  useLayoutEffect(() => {
    document.documentElement.dataset.season = season;

    // No cleanup: the attribute should persist for the life of the document.
    // The provider is mounted once, at the root, and never unmounts in the app.
  }, [season]);

  /**
   * Enable the palette cross-fade only once the first paint is behind us.
   *
   * The seasonal transition is meant for a *deliberate* season change — the
   * picker in the header. Applying it to the initial render instead animates
   * the page from the neutral default into the season on every single load,
   * which reads as a flash of the wrong palette rather than as a nicety.
   *
   * `styles/tokens.css` holds `--duration-palette` at 0ms until this attribute
   * appears, so the initial application is instant and every change after it
   * cross-fades.
   *
   * Two nested frames, not one: the callback passed to the first
   * `requestAnimationFrame` still runs before the browser paints the commit
   * that scheduled it, so setting the attribute there would catch the initial
   * application after all. The second frame is genuinely post-paint.
   */
  useEffect(() => {
    let innerFrame = 0;

    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        document.documentElement.dataset.themeReady = '';
      });
    });

    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, []);

  /**
   * Stable identity so consumers that only call setSeason never re-render.
   *
   * Persisting here rather than in an effect keyed on `season` matters: only a
   * deliberate choice should be remembered. An effect would also write back the
   * season that was merely derived from today's date, silently pinning the
   * archive to whatever season a reader first happened to visit in.
   */
  const changeSeason = useCallback((next: Season) => {
    setSeason(next);
    storeSeason(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ season, setSeason: changeSeason }),
    [season, changeSeason],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
