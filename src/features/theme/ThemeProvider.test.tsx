import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { ThemeProvider } from './ThemeProvider';
import { useSeason } from './useSeason';

afterEach(() => {
  // The provider writes to <html>, which lives outside the container Testing
  // Library unmounts, so both attributes have to be cleared by hand.
  delete document.documentElement.dataset.season;
  delete document.documentElement.dataset.themeReady;
  vi.useRealTimers();
});

describe('ThemeProvider', () => {
  it('writes the season onto <html> so the CSS token layer can pick it up', () => {
    render(
      <ThemeProvider initialSeason="winter">
        <p>Iron gall</p>
      </ThemeProvider>,
    );

    expect(document.documentElement.dataset.season).toBe('winter');
  });

  it('derives the season from today when none is given', () => {
    // Mid-June: winter in the Southern Hemisphere.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 15));

    render(
      <ThemeProvider>
        <p>Today</p>
      </ThemeProvider>,
    );

    expect(document.documentElement.dataset.season).toBe('winter');
  });

  it('updates the attribute when the season changes', () => {
    const { result } = renderHook(() => useSeason(), {
      wrapper: ({ children }) => <ThemeProvider initialSeason="spring">{children}</ThemeProvider>,
    });

    expect(result.current.season).toBe('spring');

    act(() => {
      result.current.setSeason('autumn');
    });

    expect(document.documentElement.dataset.season).toBe('autumn');
  });

  it('applies the season before paint, without marking the document ready yet', () => {
    render(
      <ThemeProvider initialSeason="summer">
        <p>Ochre</p>
      </ThemeProvider>,
    );

    // The season lands in a layout effect, so it is already on <html> by the
    // time render() returns...
    expect(document.documentElement.dataset.season).toBe('summer');
    // ...while the cross-fade is still disarmed, which is what stops the
    // initial palette animating in from the neutral default.
    expect(document.documentElement.dataset.themeReady).toBeUndefined();
  });

  it('marks the document theme-ready a frame after mount, arming the cross-fade', async () => {
    render(
      <ThemeProvider initialSeason="spring">
        <p>Young olive</p>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.themeReady).toBe('');
    });

    // The season is untouched by arming the transition.
    expect(document.documentElement.dataset.season).toBe('spring');
  });

  it('still renders its children', () => {
    renderWithProviders(<p>Accession 1041</p>);

    expect(screen.getByText('Accession 1041')).toBeInTheDocument();
  });
});

describe('useSeason', () => {
  it('throws outside a provider rather than returning a silent default', () => {
    // renderHook surfaces the throw; the console noise React emits is expected.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useSeason())).toThrow(/within a <ThemeProvider>/);

    consoleError.mockRestore();
  });
});
