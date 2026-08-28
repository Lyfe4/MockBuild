import { useSyncExternalStore } from 'react';

import { seasonFromDate } from '@/lib/season';
import type { Season } from '@/types';

import { readStoredSeason, seasonFromLocation } from './seasonStorage';

/** See `hooks/useHydrated`: the subscription is a formality, the snapshots are the point. */
const neverChanges = () => () => undefined;

/**
 * Which season this reader gets.
 *
 * In precedence order: an explicit `?season=` in the link that was followed, a
 * season the reader has chosen before, and finally today's date. A shared link
 * showing the archive in winter should show winter even to a reader who once
 * picked spring — the link is the more specific intent.
 *
 * A `useSyncExternalStore` snapshot has to be referentially stable, and this
 * one is for free: it returns a *season*, which is a string, and React compares
 * with `Object.is`. Nothing needs caching, which is worth more than the
 * arithmetic saved — a module-level cache here would answer every test in a
 * file with whatever the first one happened to resolve.
 */
function readerSeason(): Season {
  return (
    seasonFromLocation(window.location.search) ?? readStoredSeason() ?? seasonFromDate(new Date())
  );
}

/** Undressed. What a file written at build time knows about the reader. */
const noSeason = () => null;

/**
 * The season the environment implies, or `null` on the render that is hydrating.
 *
 * Every one of the three inputs above is a fact about the *reader* — their
 * link, their storage, their clock — and a prerendered file knows none of them.
 * Reading them during the first render would put a season into markup that has
 * to match a file written in August on somebody else's machine, so the first
 * render is undressed and the answer arrives on the next one.
 *
 * `useSyncExternalStore` rather than an effect: React does the swap, and the
 * server snapshot is the part being said out loud.
 */
export function useReaderSeason(): Season | null {
  return useSyncExternalStore(neverChanges, readerSeason, noSeason);
}
