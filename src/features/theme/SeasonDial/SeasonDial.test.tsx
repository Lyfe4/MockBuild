import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SEASONS } from '@/types';

import { ThemeProvider } from '../ThemeProvider';
import { SeasonDial } from './SeasonDial';

/** The dial writes to the URL, so it needs a real router around it. */
function renderDial(route = '/catalogue') {
  const router = createMemoryRouter([{ path: '*', element: <SeasonDial /> }], {
    initialEntries: [route],
  });

  render(
    <ThemeProvider initialSeason="autumn">
      <RouterProvider router={router} />
    </ThemeProvider>,
  );

  return router;
}

const radio = (name: string): HTMLElement => screen.getByRole('radio', { name });

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  delete document.documentElement.dataset.season;
  delete document.documentElement.dataset.themeReady;
  localStorage.clear();
});

describe('SeasonDial', () => {
  it('is a labelled radio group, so arrow keys work without any code of ours', () => {
    renderDial();

    const group = screen.getByRole('group', { name: 'Season' });

    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });

  it('names every quadrant, since the drawing says nothing to a screen reader', () => {
    renderDial();

    for (const name of ['Spring', 'Summer', 'Autumn', 'Winter']) {
      expect(radio(name)).toBeInTheDocument();
    }
  });

  it('marks the current season as checked', () => {
    renderDial();

    expect(radio('Autumn')).toBeChecked();
    expect(radio('Spring')).not.toBeChecked();
  });

  it('exposes a checked state to assistive technology, one quadrant at a time', async () => {
    const user = userEvent.setup();

    renderDial();

    await user.click(radio('Summer'));

    /*
      Queried by the *computed* accessibility state rather than by an
      `aria-checked` attribute, because a native radio has none and must not be
      given one: `checked` on the element already is the checked state in the
      accessibility tree, and writing the attribute as well would be a second
      copy of the truth for React to keep in step. `{ checked: true }` reads
      what a screen reader would be told.
    */
    const checked = screen.getAllByRole('radio', { checked: true });

    expect(checked).toHaveLength(1);
    expect(checked[0]).toHaveAccessibleName('Summer');
    expect(screen.getAllByRole('radio', { checked: false })).toHaveLength(3);
  });

  it.each(SEASONS)('applies %s when its quadrant is clicked', async (option) => {
    const user = userEvent.setup();

    renderDial();

    await user.click(screen.getByRole('radio', { name: new RegExp(option, 'i') }));

    expect(document.documentElement.dataset.season).toBe(option);
  });

  it('walks the year with the arrow keys, which the browser gives for free', async () => {
    const user = userEvent.setup();

    renderDial();

    await user.tab();

    expect(radio('Autumn')).toHaveFocus();

    // The dial is drawn clockwise from spring, and `SEASONS` is that order, so
    // the next option after autumn is winter and the one before it is summer.
    await user.keyboard('{ArrowRight}');

    expect(radio('Winter')).toBeChecked();
    expect(document.documentElement.dataset.season).toBe('winter');

    await user.keyboard('{ArrowLeft}{ArrowLeft}');

    expect(radio('Summer')).toBeChecked();
    expect(document.documentElement.dataset.season).toBe('summer');
  });

  it('wraps at the ends, so the year is a ring', async () => {
    const user = userEvent.setup();

    renderDial();

    await user.tab();
    await user.keyboard('{ArrowRight}{ArrowRight}');

    expect(radio('Spring')).toBeChecked();
  });

  it('points the needle at the chosen season', async () => {
    const user = userEvent.setup();

    renderDial();

    const group = screen.getByRole('group', { name: 'Season' });

    // The needle's angle is CSS, keyed off this attribute. What is testable is
    // that the attribute follows the selection — the rotation itself is four
    // rules in the stylesheet and one of them cannot be wrong on its own.
    expect(group).toHaveAttribute('data-active', 'autumn');

    await user.click(radio('Spring'));

    expect(group).toHaveAttribute('data-active', 'spring');
  });

  it('remembers the choice for the next visit', async () => {
    const user = userEvent.setup();

    renderDial();

    await user.click(radio('Spring'));

    expect(localStorage.getItem('thornfield:season')).toBe('spring');
  });

  it('reflects the choice in the URL so the view can be shared', async () => {
    const user = userEvent.setup();
    const router = renderDial();

    await user.click(radio('Summer'));

    expect(router.state.location.search).toContain('season=summer');
  });

  it('keeps the filters that were already in the URL', async () => {
    const user = userEvent.setup();
    const router = renderDial('/catalogue?habitat=alpine&q=snow');

    await user.click(radio('Winter'));

    const params = new URLSearchParams(router.state.location.search);

    expect(params.get('habitat')).toBe('alpine');
    expect(params.get('q')).toBe('snow');
    expect(params.get('season')).toBe('winter');
  });

  it('replaces rather than pushes, so back does not walk through every season', async () => {
    const user = userEvent.setup();
    const router = renderDial();
    const before = router.state.historyAction;

    await user.click(radio('Winter'));
    await user.click(radio('Spring'));

    expect(before).toBe('POP');
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('keeps every radio focusable, since they are only visually hidden', () => {
    renderDial();

    for (const option of screen.getAllByRole('radio')) {
      // display:none or visibility:hidden would drop them from the tab order
      // and cost the native arrow-key behaviour the component depends on.
      expect(option).toBeVisible();
    }
  });

  it('gives every quadrant its own cell, tiled rather than stacked', () => {
    renderDial();

    const group = screen.getByRole('group', { name: 'Season' });
    const options = group.querySelectorAll('[data-season]');

    // Four seasons, four cells of a 2 x 2 grid, each named for the season it
    // holds — which is what places the year clockwise and what lets the
    // stylesheet turn each wedge into its own corner. Overlapping hit regions
    // would make some part of the dial belong to two seasons at once.
    expect(options).toHaveLength(4);
    expect([...options].map((option) => option.getAttribute('data-season'))).toStrictEqual([
      ...SEASONS,
    ]);
  });
});
