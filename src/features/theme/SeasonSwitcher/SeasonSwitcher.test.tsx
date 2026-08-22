import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ThemeProvider } from '../ThemeProvider';
import { SeasonSwitcher } from './SeasonSwitcher';

/** The switcher writes to the URL, so it needs a real router around it. */
function renderSwitcher(route = '/catalogue') {
  const router = createMemoryRouter([{ path: '*', element: <SeasonSwitcher /> }], {
    initialEntries: [route],
  });

  render(
    <ThemeProvider initialSeason="autumn">
      <RouterProvider router={router} />
    </ThemeProvider>,
  );

  return router;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  delete document.documentElement.dataset.season;
  delete document.documentElement.dataset.themeReady;
  localStorage.clear();
});

describe('SeasonSwitcher', () => {
  it('is a labelled radio group, so arrow keys work without any code of ours', () => {
    renderSwitcher();

    const group = screen.getByRole('group', { name: 'Season' });

    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });

  it('marks the current season as checked', () => {
    renderSwitcher();

    expect(screen.getByRole('radio', { name: 'Autumn' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Spring' })).not.toBeChecked();
  });

  it('applies the chosen season to the document', async () => {
    const user = userEvent.setup();

    renderSwitcher();

    await user.click(screen.getByRole('radio', { name: 'Winter' }));

    expect(document.documentElement.dataset.season).toBe('winter');
  });

  it('remembers the choice for the next visit', async () => {
    const user = userEvent.setup();

    renderSwitcher();

    await user.click(screen.getByRole('radio', { name: 'Spring' }));

    expect(localStorage.getItem('thornfield:season')).toBe('spring');
  });

  it('reflects the choice in the URL so the view can be shared', async () => {
    const user = userEvent.setup();
    const router = renderSwitcher();

    await user.click(screen.getByRole('radio', { name: 'Summer' }));

    expect(router.state.location.search).toContain('season=summer');
  });

  it('keeps the filters that were already in the URL', async () => {
    const user = userEvent.setup();
    const router = renderSwitcher('/catalogue?habitat=alpine&q=snow');

    await user.click(screen.getByRole('radio', { name: 'Winter' }));

    const params = new URLSearchParams(router.state.location.search);

    expect(params.get('habitat')).toBe('alpine');
    expect(params.get('q')).toBe('snow');
    expect(params.get('season')).toBe('winter');
  });

  it('replaces rather than pushes, so back does not walk through every season', async () => {
    const user = userEvent.setup();
    const router = renderSwitcher();
    const before = router.state.historyAction;

    await user.click(screen.getByRole('radio', { name: 'Winter' }));
    await user.click(screen.getByRole('radio', { name: 'Spring' }));

    expect(before).toBe('POP');
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('keeps every radio focusable, since they are only visually hidden', () => {
    renderSwitcher();

    for (const radio of screen.getAllByRole('radio')) {
      // display:none or visibility:hidden would drop them from the tab order
      // and cost the native arrow-key behaviour the component depends on.
      expect(radio).toBeVisible();
    }
  });
});
