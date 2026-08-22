import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { ThemeProvider } from '@/features/theme';
import type { Season } from '@/types';

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Pin the season. Defaults to `autumn` so tests never depend on the date the
   * suite happens to run — a component asserted against summer tokens would
   * otherwise start failing in March.
   */
  season?: Season | undefined;
  /** Initial URL, including any search params the component reads. */
  route?: string | undefined;
}

/**
 * Renders a component inside the app's provider stack and a real router.
 *
 * The router is `createMemoryRouter` rather than a hand-rolled context: several
 * components read and write the URL through `useSearchParams`, and a fake would
 * not round-trip a navigation. With a real memory router a test can assert on
 * what the URL became, which is where the catalogue keeps its state.
 *
 * `ThemeProvider` sits outside the router, exactly as it does in the app, so
 * the season resolution order under test matches production.
 */
export function renderWithProviders(
  ui: ReactElement,
  { season = 'autumn', route = '/', ...options }: RenderWithProvidersOptions = {},
): RenderResult {
  function Wrapper({ children }: { children: ReactNode }) {
    const router = createMemoryRouter([{ path: '*', element: children }], {
      initialEntries: [route],
    });

    return (
      <ThemeProvider initialSeason={season}>
        <RouterProvider router={router} />
      </ThemeProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
