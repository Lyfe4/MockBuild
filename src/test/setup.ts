import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

/**
 * Vitest runs with `globals: false`, so Testing Library's automatic cleanup —
 * which hooks itself onto a global `afterEach` — never registers. Unmounting
 * between tests is done explicitly here instead. Without it, `screen` queries
 * leak across tests and start matching the previous test's DOM.
 */
afterEach(() => {
  cleanup();
});

beforeAll(() => {
  /**
   * jsdom implements no CSS media queries and does not define `matchMedia` at
   * all, so anything reading `prefers-reduced-motion` or a breakpoint in JS
   * throws rather than degrading. This stub reports "no match" for every query,
   * which is the correct default: no reduced-motion preference, mobile-first
   * breakpoints unmet. Override it per test when the query is the thing under
   * test.
   */
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string): MediaQueryList => {
      const list: MediaQueryList = {
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(() => false),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      };

      return list;
    }),
  );
});
