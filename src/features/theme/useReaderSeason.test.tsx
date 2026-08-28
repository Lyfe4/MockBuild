import { renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useReaderSeason } from './useReaderSeason';

function Probe() {
  return <p>{useReaderSeason() ?? 'undressed'}</p>;
}

/** jsdom will not let `window.location` be assigned, but it will navigate. */
function visit(search: string): void {
  window.history.replaceState(null, '', `/catalogue${search}`);
}

beforeEach(() => {
  localStorage.clear();
  visit('');
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  visit('');
});

describe('useReaderSeason', () => {
  it('is undressed where there is no browser, because a file cannot know a reader', () => {
    // The link, the storage and the clock are all facts about whoever is
    // reading. A build knows none of them, and this is what it renders instead.
    expect(renderToString(<Probe />)).toContain('undressed');
  });

  it('prefers the season named in the link', () => {
    localStorage.setItem('thornfield:season', 'spring');
    visit('?season=winter');

    const { result } = renderHook(() => useReaderSeason());

    // A shared link showing the archive in winter should show winter even to a
    // reader who once picked spring.
    expect(result.current).toBe('winter');
  });

  it('falls back to the season the reader chose before', () => {
    localStorage.setItem('thornfield:season', 'autumn');

    const { result } = renderHook(() => useReaderSeason());

    expect(result.current).toBe('autumn');
  });

  it('falls back to today, read as a southern season', () => {
    vi.useFakeTimers();
    // Mid-June: winter in the Southern Hemisphere, which is the one Thornfield
    // keeps.
    vi.setSystemTime(new Date(2025, 5, 15));

    const { result } = renderHook(() => useReaderSeason());

    expect(result.current).toBe('winter');
  });

  it('ignores a season the URL invented', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 15));
    visit('?season=monsoon');

    const { result } = renderHook(() => useReaderSeason());

    expect(result.current).toBe('winter');
  });

  it('answers with a string, which is why nothing here is cached', () => {
    localStorage.setItem('thornfield:season', 'summer');

    const { result, rerender } = renderHook(() => useReaderSeason());
    const first = result.current;

    rerender();

    /*
      `useSyncExternalStore` compares snapshots with `Object.is`, so a season —
      being a string — is stable by value and needs no module-level cache. One
      would have frozen every test in this file at whatever the first resolved.
    */
    expect(result.current).toBe(first);
  });
});
