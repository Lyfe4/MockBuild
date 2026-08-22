import { SEASONS, type Season } from '@/types';

/**
 * Remembering the reader's chosen season.
 *
 * Storage lives here rather than in `lib` because it touches `localStorage`,
 * and `lib` is kept free of browser APIs so it stays testable as plain
 * functions.
 */

const STORAGE_KEY = 'thornfield:season';

/** Narrows an unknown string to a Season. Anything else is not one. */
export function isSeason(value: string | null): value is Season {
  return value !== null && (SEASONS as readonly string[]).includes(value);
}

/**
 * The season the reader last chose, if any.
 *
 * Every access is guarded. `localStorage` is not merely empty in private
 * browsing and under a blocked-cookies policy — reading the property *throws* a
 * SecurityError in some browsers, and an uncaught throw here would take the
 * whole app down before first paint over a preference.
 */
export function readStoredSeason(): Season | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    return isSeason(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** Remembers a season. Silently does nothing where storage is unavailable. */
export function storeSeason(season: Season): void {
  try {
    localStorage.setItem(STORAGE_KEY, season);
  } catch {
    // A reader who has blocked storage still gets the season for this visit;
    // they just get today's season again next time. That is the right trade.
  }
}

/**
 * A season named in the URL, if it is a real one.
 *
 * Read straight from `window.location` rather than through the router, because
 * this runs while ThemeProvider is initialising — above the router in the tree
 * and before any of its hooks are available.
 */
export function seasonFromLocation(search: string): Season | null {
  const value = new URLSearchParams(search).get('season');

  return isSeason(value) ? value : null;
}
