import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { SPECIMENS } from '@/data';
import { ThemeProvider } from '@/features/theme';

import { CatalogueRoute } from './CatalogueRoute';

/**
 * Rendered against the real dataset, not a fixture.
 *
 * The page's whole job is to filter the archive that actually exists; a
 * three-record fixture would pass while the real 24 broke on a family name with
 * a space in it, or on the one specimen with three seasons.
 */
function renderCatalogue(route = '/catalogue') {
  const router = createMemoryRouter([{ path: '*', element: <CatalogueRoute /> }], {
    initialEntries: [route],
  });

  render(
    <ThemeProvider initialSeason="autumn">
      <RouterProvider router={router} />
    </ThemeProvider>,
  );

  return router;
}

const rows = (): HTMLElement[] => screen.getAllByRole('listitem');

afterEach(() => {
  delete document.documentElement.dataset.season;
  delete document.documentElement.dataset.themeReady;
  localStorage.clear();
});

describe('CatalogueRoute', () => {
  it('lists every specimen when nothing is filtered', () => {
    renderCatalogue();

    expect(rows()).toHaveLength(SPECIMENS.length);
  });

  it('has one focusable heading for the router to move focus to', () => {
    renderCatalogue();

    const heading = screen.getByRole('heading', { level: 1, name: 'Catalogue' });

    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  it('announces the result count politely', () => {
    renderCatalogue();

    const count = screen.getByText(`${String(SPECIMENS.length)} specimens`);

    // Filtering does not change the page, so a screen reader would otherwise
    // never learn that the list beneath it had changed size.
    expect(count).toHaveAttribute('aria-live', 'polite');
  });

  it('makes each row a single link to its specimen', () => {
    renderCatalogue();

    const first = rows()[0];

    expect(first).toBeDefined();
    // One link per row, not one for the plate and another for the name — two
    // links to the same place is two tab stops and two announcements.
    expect(within(first!).getAllByRole('link')).toHaveLength(1);
  });

  it('shows the scientific name, common name and accession number', () => {
    renderCatalogue();

    const specimen = SPECIMENS[0]!;

    expect(screen.getByText(specimen.scientificName)).toBeInTheDocument();
    expect(screen.getByText(specimen.commonName)).toBeInTheDocument();
    expect(screen.getByText(specimen.id)).toBeInTheDocument();
  });

  describe('reads its state from the URL', () => {
    it('applies a habitat filter from the query string', () => {
      renderCatalogue('/catalogue?habitat=alpine');

      const alpine = SPECIMENS.filter((s) => s.habitat === 'alpine');

      expect(alpine.length).toBeGreaterThan(0);
      expect(rows()).toHaveLength(alpine.length);
    });

    it('applies a search term from the query string', () => {
      renderCatalogue('/catalogue?q=Cinerastrum');

      expect(rows()).toHaveLength(1);
      expect(screen.getByText('Cinerastrum halophilum')).toBeInTheDocument();
    });

    it('applies a sort order from the query string', () => {
      renderCatalogue('/catalogue?sort=name');

      const names = rows().map((row) => within(row).getByRole('link').textContent);
      const first = SPECIMENS.map((s) => s.scientificName).sort((a, b) =>
        a.localeCompare(b, 'en-AU'),
      )[0];

      expect(names[0]).toContain(first);
    });

    it('ignores junk in the query string rather than breaking', () => {
      renderCatalogue('/catalogue?habitat=moon&sort=sideways&status=%3Cscript%3E');

      expect(rows()).toHaveLength(SPECIMENS.length);
    });
  });

  describe('writes its state to the URL', () => {
    it('puts a chosen habitat in the query string', async () => {
      const user = userEvent.setup();
      const router = renderCatalogue();

      await user.click(screen.getByRole('checkbox', { name: 'Alpine' }));

      expect(router.state.location.search).toContain('habitat=alpine');
    });

    it('puts the chosen order in the query string', async () => {
      const user = userEvent.setup();
      const router = renderCatalogue();

      await user.selectOptions(screen.getByLabelText('Order'), 'name');

      expect(router.state.location.search).toContain('sort=name');
    });

    it('keeps the season parameter while filtering', async () => {
      const user = userEvent.setup();
      const router = renderCatalogue('/catalogue?season=winter');

      await user.click(screen.getByRole('checkbox', { name: 'Alpine' }));

      const params = new URLSearchParams(router.state.location.search);

      // The season is not part of the catalogue query, but it shares the URL —
      // dropping it would reset a shared link's palette on the first click.
      expect(params.get('season')).toBe('winter');
      expect(params.get('habitat')).toBe('alpine');
    });
  });

  describe('empty state', () => {
    it('explains itself when nothing matches', () => {
      renderCatalogue('/catalogue?q=zzzzzz');

      expect(screen.getByText(/No specimens match those filters/)).toBeInTheDocument();
      expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    });

    it('offers a way out that actually clears the filters', async () => {
      const user = userEvent.setup();
      const router = renderCatalogue('/catalogue?q=zzzzzz');

      // Distinctly named from the panel's own Clear button: two buttons with
      // the same accessible name are ambiguous in a screen reader's list.
      await user.click(screen.getByRole('button', { name: /Show all \d+ specimens/ }));

      expect(router.state.location.search).toBe('');
      expect(rows()).toHaveLength(SPECIMENS.length);
    });
  });

  describe('clearing', () => {
    it('disables the clear button when there is nothing to clear', () => {
      renderCatalogue();

      expect(screen.getByRole('button', { name: 'Clear filters' })).toBeDisabled();
    });

    it('enables it once a filter is applied', () => {
      renderCatalogue('/catalogue?habitat=alpine');

      expect(screen.getByRole('button', { name: 'Clear filters' })).toBeEnabled();
    });

    it('keeps the sort order, which is not a filter', async () => {
      const user = userEvent.setup();
      const router = renderCatalogue('/catalogue?habitat=alpine&sort=name');

      await user.click(screen.getByRole('button', { name: 'Clear filters' }));

      const params = new URLSearchParams(router.state.location.search);

      expect(params.get('habitat')).toBeNull();
      expect(params.get('sort')).toBe('name');
    });

    it('empties the search box, not just the results', async () => {
      const user = userEvent.setup();

      renderCatalogue('/catalogue?q=snow');

      const search = screen.getByLabelText('Search');

      expect(search).toHaveValue('snow');

      await user.click(screen.getByRole('button', { name: 'Clear filters' }));

      // The box keeps a local draft so typing stays instant; it has to be
      // re-synchronised when the query changes from outside, or the input and
      // the results silently disagree.
      expect(search).toHaveValue('');
    });
  });

  it('commits a typed search once, not once per keystroke', async () => {
    const user = userEvent.setup();
    const router = renderCatalogue();

    let navigations = 0;
    const unsubscribe = router.subscribe(() => {
      navigations += 1;
    });

    await user.type(screen.getByLabelText('Search'), 'snow');

    await waitFor(() => {
      expect(new URLSearchParams(router.state.location.search).get('q')).toBe('snow');
    });

    unsubscribe();

    // Four characters, one URL write. Without the debounce this would be four,
    // each of them re-filtering and re-rendering the whole list.
    expect(navigations).toBe(1);
  });
});
