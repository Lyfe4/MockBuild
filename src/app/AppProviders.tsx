import type { ReactNode } from 'react';

import { ThemeProvider } from '@/features/theme';

export interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Every cross-cutting provider the app needs, in one place.
 *
 * Keeping them here rather than inline in `main.tsx` means tests can mount the
 * same stack the browser gets, and adding a provider later touches one file
 * instead of two.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
