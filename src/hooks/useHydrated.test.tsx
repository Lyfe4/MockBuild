import { renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { useHydrated } from './useHydrated';

/**
 * The two answers this hook exists to give, asked in the two environments that
 * ask them. `renderToString` is the real prerenderer — the same call
 * `src/entry-server.tsx` makes — so the server case is tested rather than
 * simulated.
 */
function Probe() {
  return <p>{useHydrated() ? 'hydrated' : 'static'}</p>;
}

describe('useHydrated', () => {
  it('is false where there is no browser, which is what the build sees', () => {
    expect(renderToString(<Probe />)).toContain('static');
  });

  it('is true in a browser, from the first render a browser is responsible for', () => {
    const { result } = renderHook(() => useHydrated());

    // Testing Library flushes effects inside `act`, so what is observed here is
    // the settled answer — the same one the second client render gets.
    expect(result.current).toBe(true);
  });

  it('does not change again on a re-render', () => {
    const { result, rerender } = renderHook(() => useHydrated());

    rerender();

    expect(result.current).toBe(true);
  });
});
