import { renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useToday } from './useToday';

function Probe() {
  const today = useToday();

  return <p>{today === null ? 'no date' : today.toDateString()}</p>;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useToday', () => {
  it('is null where there is no browser, so no build date is baked into a file', () => {
    // The whole point. A prerendered calendar must not rule the month the site
    // happened to be deployed in.
    expect(renderToString(<Probe />)).toContain('no date');
  });

  it('gives the browser today, once the browser is the one rendering', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 15));

    const { result } = renderHook(() => useToday());

    expect(result.current?.getFullYear()).toBe(2025);
    expect(result.current?.getMonth()).toBe(5);
    expect(result.current?.getDate()).toBe(15);
  });

  it('returns the same object all day, which is what keeps it usable as a snapshot', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 15, 9, 0, 0));

    const { result, rerender } = renderHook(() => useToday());
    const first = result.current;

    // Six hours later, same day: a `useSyncExternalStore` snapshot that changed
    // identity on every read would re-render for ever.
    vi.setSystemTime(new Date(2025, 5, 15, 15, 0, 0));
    rerender();

    expect(result.current).toBe(first);
  });

  it('moves to the next day when the day does', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 15, 23, 59, 0));

    const { result, rerender } = renderHook(() => useToday());

    vi.setSystemTime(new Date(2025, 5, 16, 0, 1, 0));
    rerender();

    expect(result.current?.getDate()).toBe(16);
  });
});
