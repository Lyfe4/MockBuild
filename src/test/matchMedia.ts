import { vi } from 'vitest';

/**
 * A `matchMedia` stub that answers `min-width` queries for a chosen width.
 *
 * `src/test/setup.ts` stubs `matchMedia` to report "no match" for everything,
 * which is the right default: jsdom implements no media queries at all, and
 * mobile-first means an unmet breakpoint is the mobile layout. This is for the
 * tests where the breakpoint *is* the thing under test — a component whose
 * markup, not just its presentation, differs either side of one.
 *
 * `min-width` only, in `rem` or `px`, because that is the only kind of query
 * this project's components ask: every `@media` here is mobile-first. A query
 * it cannot read reports no match rather than guessing, so a new kind of query
 * fails the test that relies on it instead of passing it by accident.
 *
 * Root font size is taken as 16px, which is the browser default the token scale
 * is built on.
 */
const ROOT_FONT_SIZE = 16;

const MIN_WIDTH = /min-width:\s*([\d.]+)(rem|px)/;

export function stubViewportWidth(pixels: number): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string): MediaQueryList => {
      const found = MIN_WIDTH.exec(query);
      const amount = found?.[1];
      const unit = found?.[2];
      const threshold =
        amount === undefined ? Infinity : Number(amount) * (unit === 'rem' ? ROOT_FONT_SIZE : 1);

      return {
        matches: pixels >= threshold,
        media: query,
        onchange: null,
        // The viewport does not change mid-test: a component that has to react
        // to a resize would need a real event target, and none does here.
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(() => false),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      };
    }),
  );
}

/** A phone: narrower than every breakpoint in the project. */
export const NARROW_VIEWPORT = 375;

/** A laptop: wide enough for the ledger to grow its margin column. */
export const WIDE_VIEWPORT = 1280;
