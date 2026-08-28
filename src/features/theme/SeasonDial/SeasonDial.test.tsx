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

  it('names the active season on the group, which is what raises its glyph', async () => {
    const user = userEvent.setup();

    renderDial();

    const group = screen.getByRole('group', { name: 'Season' });

    // Which glyph is opaque is CSS, keyed off this attribute against each
    // drawing's own `data-glyph`. What is testable here is that the attribute
    // follows the selection; the four rules that read it cannot be wrong one at
    // a time.
    expect(group).toHaveAttribute('data-active', 'autumn');

    await user.click(radio('Spring'));

    expect(group).toHaveAttribute('data-active', 'spring');
  });

  it('draws all four glyphs at once, which is what lets the change cross-fade', () => {
    renderDial();

    const group = screen.getByRole('group', { name: 'Season' });
    const glyphs = group.querySelectorAll('[data-glyph]');

    /*
      Not one glyph swapped for another: all four are laid on top of each other
      and the stylesheet raises one. That is the whole mechanism of the
      cross-fade — at the midpoint the leaving drawing and the arriving one are
      each half inked — and it is why this count is four rather than one.
    */
    expect(glyphs).toHaveLength(4);
    expect([...glyphs].map((glyph) => glyph.getAttribute('data-glyph'))).toStrictEqual([
      ...SEASONS,
    ]);
  });

  it('renders every glyph from the shared data rather than from four components', async () => {
    renderDial();

    const { SEASON_GLYPHS } = await import('../seasonGlyphs');

    for (const season of SEASONS) {
      const glyph = document.querySelector(`[data-glyph="${season}"]`);

      expect(glyph, season).not.toBeNull();
      expect(glyph?.getAttribute('viewBox'), season).toBe(SEASON_GLYPHS[season].viewBox);
      // One <path> per authored path, in order, so a glyph gaining a stroke
      // needs no change here to be drawn.
      expect(glyph?.querySelectorAll('path'), season).toHaveLength(
        SEASON_GLYPHS[season].paths.length,
      );
    }
  });

  it('keeps the glyphs and the rim out of the accessibility tree', () => {
    renderDial();

    const group = screen.getByRole('group', { name: 'Season' });

    // Decorative, both of them: the radios carry the names, and a screen reader
    // that announced "sprout" as well would be reading the same fact twice in
    // two vocabularies.
    for (const glyph of group.querySelectorAll('[data-glyph]')) {
      expect(glyph.closest('[aria-hidden="true"]')).not.toBeNull();
    }

    // Still exactly four names, from the four radios and nowhere else. An SVG
    // that had escaped its `aria-hidden` wrapper would show up here as a
    // graphics role with no accessible name.
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    expect(screen.queryAllByRole('graphics-document')).toHaveLength(0);
  });

  it('gives the circle one ink rim rather than one quadrant a heavy outline', () => {
    renderDial();

    const group = screen.getByRole('group', { name: 'Season' });
    const rim = group.querySelector('circle');

    /*
      Drawn once, on the arc the four wedges already stroke, so it covers their
      outer edge instead of doubling it — which is why it carries the same
      radius as `WEDGE`. The active quadrant has no outline of its own any more;
      its fill is the whole of the emphasis.
    */
    expect(rim).not.toBeNull();
    expect(rim?.getAttribute('r')).toBe('45');
    expect(rim?.getAttribute('cx')).toBe('50');
    expect(rim?.getAttribute('cy')).toBe('50');
  });

  it('names the season in sight, since the quadrants say which is which to nobody', () => {
    renderDial();

    // Queried by role rather than by text: a screen reader is told this is a
    // status, and that is the half of the behaviour a class name cannot carry.
    expect(screen.getByRole('status')).toHaveTextContent('Autumn');
  });

  it('renames it on every change, including one made with the keyboard', async () => {
    const user = userEvent.setup();

    renderDial();

    await user.click(radio('Summer'));

    expect(screen.getByRole('status')).toHaveTextContent('Summer');

    // The click left focus on summer's radio, so the arrow key walks on from
    // there — no `tab()`, which would step *out* of the group and press an
    // arrow key at the document body.
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('status')).toHaveTextContent('Autumn');
  });

  it('announces the change politely rather than interrupting', () => {
    renderDial();

    /*
      `role="status"` is an implicit `aria-live="polite"`, and politeness is the
      point: the radio has already said "Summer, selected" by the time this is
      read, so an assertive region would cut its own group off mid-sentence.
    */
    const status = screen.getByRole('status');

    expect(status).not.toHaveAttribute('aria-live', 'assertive');
    expect(status.textContent).toBe('Autumn');
  });

  it('sets the name in one word, so it cannot wrap beside a 48px circle', () => {
    renderDial();

    // The four names are the whole vocabulary of this element. A two-word
    // label would need the flex line to be wider than a phone has to give.
    for (const name of ['Spring', 'Summer', 'Autumn', 'Winter']) {
      expect(name.split(' ')).toHaveLength(1);
    }

    expect(screen.getByRole('status').textContent.split(' ')).toHaveLength(1);
  });

  it('keeps the dial last, so its rim is still the block right edge', () => {
    renderDial();

    const status = screen.getByRole('status');
    const group = screen.getByRole('group', { name: 'Season' });

    /*
      `SiteHeader` hangs this block on `content-end` and `layout.test.tsx`
      measures it there, so what ends the block has to be the drawing rather
      than the word — the dial's rim is the thing that lines up with the
      ledger's entry column. DOCUMENT_POSITION_FOLLOWING: the group comes after
      the status in document order.
    */
    expect(status.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
