import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { SiteNav } from './SiteNav';

/**
 * The nav needs a router for its links, and it reads the location to close
 * itself on navigation.
 *
 * The `matchMedia` stub in the test setup reports no match for every query, so
 * these run in the narrow layout — which is the one with behaviour worth
 * testing. Above the breakpoint the panel is simply always open.
 */
function renderNav(route = '/') {
  const router = createMemoryRouter([{ path: '*', element: <SiteNav /> }], {
    initialEntries: [route],
  });

  render(<RouterProvider router={router} />);

  return router;
}

const toggle = (): HTMLElement => screen.getByRole('button', { name: /menu/i });

describe('SiteNav', () => {
  it('is a labelled landmark', () => {
    renderNav();

    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  });

  it('starts collapsed', () => {
    renderNav();

    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Catalogue' })).not.toBeInTheDocument();
  });

  it('points aria-controls at the panel it actually controls', () => {
    renderNav();

    const controls = toggle().getAttribute('aria-controls');

    expect(controls).not.toBeNull();
    // A dangling id is the usual way this attribute goes wrong, and nothing
    // else would catch it.
    expect(document.getElementById(controls!)).not.toBeNull();
  });

  it('toggles aria-expanded and reveals the links', async () => {
    const user = userEvent.setup();

    renderNav();

    await user.click(toggle());

    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Catalogue' })).toBeInTheDocument();

    await user.click(toggle());

    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the collapsed panel out of the tab order entirely', async () => {
    const user = userEvent.setup();

    renderNav();

    // `hidden`, not off-screen: a menu that is invisible but still tabbable is
    // worse than no menu, because focus disappears into it.
    expect(screen.queryByRole('link', { name: 'About' })).not.toBeInTheDocument();

    await user.click(toggle());

    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument();
  });

  it('closes on Escape and hands focus back to the toggle', async () => {
    const user = userEvent.setup();

    renderNav();

    await user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');

    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    // Without the focus return, dismissing would drop the caret to the top of
    // the document and a keyboard user would have to tab all the way back in.
    expect(toggle()).toHaveFocus();
  });

  it('ignores Escape when already closed', async () => {
    const user = userEvent.setup();

    renderNav();

    await user.keyboard('{Escape}');

    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes when a link is followed', async () => {
    const user = userEvent.setup();

    renderNav();

    await user.click(toggle());
    await user.click(screen.getByRole('link', { name: 'Journal' }));

    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('marks the current section', async () => {
    const user = userEvent.setup();

    renderNav('/catalogue');

    await user.click(toggle());

    expect(screen.getByRole('link', { name: 'Catalogue' })).toHaveAttribute('aria-current', 'page');
  });

  it('draws its own toggle glyph rather than pulling in an icon set', async () => {
    const user = userEvent.setup();

    renderNav();

    const svg = toggle().querySelector('svg');

    expect(svg).not.toBeNull();
    // Decorative: the button already has a text label, so announcing the glyph
    // as well would just be noise.
    expect(svg).toHaveAttribute('aria-hidden', 'true');

    await user.click(toggle());
  });
});
