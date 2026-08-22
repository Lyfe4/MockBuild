import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

import { ThemeProvider } from '@/features/theme';
import type { Season } from '@/types';

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Pin the season. Defaults to `autumn` so tests never depend on the date the
   * suite happens to run — a component asserted against summer tokens would
   * otherwise start failing in March.
   */
  season?: Season;
}

/**
 * Renders a component inside the app's provider stack.
 *
 * Use this instead of Testing Library's bare `render` for anything that reads
 * context. Components that do not — like `VisuallyHidden` — should use `render`
 * directly, so the test says plainly that no context is involved.
 *
 * Router context is deliberately absent: routes are exercised through the data
 * router itself with `createMemoryRouter`, which is closer to the real thing
 * than wrapping a component in a fake location.
 */
export function renderWithProviders(
  ui: ReactElement,
  { season = 'autumn', ...options }: RenderWithProvidersOptions = {},
): RenderResult {
  function Wrapper({ children }: { children: ReactNode }) {
    return <ThemeProvider initialSeason={season}>{children}</ThemeProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
