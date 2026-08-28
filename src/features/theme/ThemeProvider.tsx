import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';

import type { Season } from '@/types';

import { storeSeason } from './seasonStorage';
import { ThemeContext, type ThemeContextValue } from './ThemeContext';
import { useReaderSeason } from './useReaderSeason';

export interface ThemeProviderProps {
  children: ReactNode;
  /**
   * Pin the season instead of resolving it from the link, the reader's storage
   * and today's date. Intended for tests; omit it in the app and the archive
   * dresses itself.
   *
   * Pinned, the season is applied on the **first** render, which is what lets a
   * test assert on a dressed page without waiting for anything. Unpinned, the
   * first render is undressed — see below.
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
 * ## The first render is undressed
 *
 * Every route is prerendered to static HTML at build time, and none of the
 * three things that decide a season is knowable then: the URL is the file's own
 * path with no query string, there is no storage, and the clock is the build
 * machine's rather than the reader's. So the first render has no season at all
 * — the neutral default palette `tokens.css` has always described as "undressed
 * archival neutral" — and `useReaderSeason` supplies the real one on the render
 * after, which is the first one the browser is responsible for.
 *
 * That is not merely a way to avoid a hydration warning, though it is also
 * that: the first client render has to produce the markup that is already in
 * the file, and a season read from `localStorage` during render would not.
 * It is the honest shape of the fact. A file written in August cannot know what
 * season it is being read in.
 *
 * ## The season and the choice are two different values
 *
 * `useReaderSeason` is what the *environment* implies and `chosen` is what the
 * reader has since asked for, and the second simply wins. Written as one piece
 * of state seeded from an effect it would be a `setState` inside a
 * `useEffect` — a cascading render, and the thing the React lint rule is right
 * to ask about. Written as two it is an expression.
 *
 * Getting the palette right is only half of it — see the `data-theme-ready`
 * effect below for why the cross-fade has to be held back.
 */
export function ThemeProvider({ children, initialSeason }: ThemeProviderProps) {
  const readerSeason = useReaderSeason();
  const [chosen, setChosen] = useState<Season | null>(null);
  const season = chosen ?? initialSeason ?? readerSeason;

  useLayoutEffect(() => {
    // Undressed: leave `<html>` alone so the neutral tokens keep applying.
    // There is no attribute to remove, because there was never one to write.
    if (season === null) return;

    document.documentElement.dataset.season = season;

    // No cleanup: the attribute should persist for the life of the document.
    // The provider is mounted once, at the root, and never unmounts in the app.
  }, [season]);

  /**
   * Enable the palette cross-fade only once the first paint is behind us.
   *
   * The seasonal transition is meant for a *deliberate* season change — the
   * dial in the header. Applying it to the initial render instead animates the
   * page from the neutral default into the season on every single load, which
   * reads as a flash of the wrong palette rather than as a nicety. That matters
   * more since the prerender than it did before: the first render genuinely
   * *is* the neutral default now, so an armed transition would cross-fade out
   * of it on every load rather than only appearing to.
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
    setChosen(next);
    storeSeason(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ season, setSeason: changeSeason }),
    [season, changeSeason],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
