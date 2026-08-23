import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { catalogueNumberOf, SPECIES } from '@/data';
import { ThemeProvider } from '@/features/theme';

import { CatalogueRoute } from './CatalogueRoute';

/**
 * Rendered against the real collection, not a fixture.
 *
 * The page's whole job is to filter the archive that actually exists; a fixture
 * would pass while the real records broke on an accented common name or on a
 * family shared by two orders. Nothing here asserts a hard-coded count, so the
 * file survives the collection growing.
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
  it('lists every species when nothing is filtered', () => {
    renderCatalogue();

    expect(rows()).toHaveLength(SPECIES.length);
  });

  it('has one focusable heading for the router to move focus to', () => {
    renderCatalogue();

    const heading = screen.getByRole('heading', { level: 1, name: 'Catalogue' });

    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  it('announces the result count politely', () => {
    renderCatalogue();

    const count = screen.getByText(`${String(SPECIES.length)} species`);

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

  it('shows the binomial, the common name and the accession number', () => {
    renderCatalogue();

    const species = SPECIES[0]!;

    expect(
      screen.getByText(`${species.taxonomy.genus} ${species.taxonomy.species}`),
    ).toBeInTheDocument();
    expect(screen.getByText(species.commonName)).toBeInTheDocument();
    expect(screen.getByText(catalogueNumberOf(species))).toBeInTheDocument();
  });

  describe('reads its state from the URL', () => {
    it('applies a family filter from the query string', () => {
      const family = SPECIES[0]!.taxonomy.family;

      renderCatalogue(`/catalogue?family=${family}`);

      const kin = SPECIES.filter((s) => s.taxonomy.family === family);

      expect(rows()).toHaveLength(kin.length);
    });

    it('applies a search term from the query string', () => {
      const species = SPECIES[0]!;

      renderCatalogue(`/catalogue?q=${species.taxonomy.species}`);

      expect(rows().length).toBeGreaterThan(0);
      expect(
        screen.getByText(`${species.taxonomy.genus} ${species.taxonomy.species}`),
      ).toBeInTheDocument();
    });

    it('applies a sort order from the query string', () => {
      renderCatalogue('/catalogue?sort=name');

      const names = rows().map((row) => within(row).getByRole('link').textContent);
      const first = SPECIES.map((s) => `${s.taxonomy.genus} ${s.taxonomy.species}`).sort((a, b) =>
        a.localeCompare(b, 'en-AU'),
      )[0];

      expect(names[0]).toContain(first);
    });

    it('ignores junk in the query string rather than breaking', () => {
      renderCatalogue('/catalogue?family=Triffidaceae&sort=sideways&q=');

      expect(rows()).toHaveLength(SPECIES.length);
    });
  });

  describe('the facets', () => {
    it('offers every taxonomic order the collection holds, as checkboxes', () => {
      renderCatalogue();

      for (const order of new Set(SPECIES.map((s) => s.taxonomy.order))) {
        expect(screen.getByRole('checkbox', { name: order }), order).toBeInTheDocument();
      }
    });

    it('narrows the family select to the chosen orders', async () => {
      const user = userEvent.setup();
      const order = SPECIES[0]!.taxonomy.order;

      renderCatalogue();

      await user.click(screen.getByRole('checkbox', { name: order }));

      const select = screen.getByLabelText('Family');
      const offered = within(select)
        .getAllByRole('option')
        .map((option) => option.textContent)
        .slice(1);
      const expected = [
        ...new Set(SPECIES.filter((s) => s.taxonomy.order === order).map((s) => s.taxonomy.family)),
      ].sort();

      expect(offered).toStrictEqual(expected);
    });

    it('drops a chosen family when the order that offered it is unticked', async () => {
      const user = userEvent.setup();
      const { taxonomy } = SPECIES[0]!;
      const router = renderCatalogue(
        `/catalogue?order=${taxonomy.order}&family=${taxonomy.family}`,
      );

      await user.click(screen.getByRole('checkbox', { name: taxonomy.order }));

      const params = new URLSearchParams(router.state.location.search);

      // Otherwise the panel shows a family the select no longer lists and the
      // list is empty for a reason nothing on screen explains.
      expect(params.get('family')).toBeNull();
      expect(params.get('order')).toBeNull();
    });

    it('filters by markings, size and season from the URL', () => {
      renderCatalogue('/catalogue?markings=spots');

      const spotted = SPECIES.filter((s) => s.morphology.markings === 'spots');

      expect(spotted.length).toBeGreaterThan(0);
      expect(rows()).toHaveLength(spotted.length);
    });

    it('says out loud that the seasons are Thornfield’s, not the animal’s', () => {
      renderCatalogue();

      expect(screen.getByText(/southern seasons/)).toBeInTheDocument();
    });

    it('sorts by size, largest first', () => {
      renderCatalogue('/catalogue?sort=size');

      const largest = [...SPECIES].sort((a, b) => b.sizeMm.max - a.sizeMm.max)[0]!;
      const first = rows()[0];

      expect(within(first!).getByRole('link').textContent).toContain(
        `${largest.taxonomy.genus} ${largest.taxonomy.species}`,
      );
    });
  });

  describe('writes its state to the URL', () => {
    it('puts a chosen order in the query string', async () => {
      const user = userEvent.setup();
      const router = renderCatalogue();
      const order = SPECIES[0]!.taxonomy.order;

      await user.click(screen.getByRole('checkbox', { name: order }));

      expect(router.state.location.search).toContain(`order=${order}`);
    });

    it('puts a chosen family in the query string', async () => {
      const user = userEvent.setup();
      const router = renderCatalogue();
      const family = SPECIES[0]!.taxonomy.family;

      await user.selectOptions(screen.getByLabelText('Family'), family);

      expect(router.state.location.search).toContain(`family=${family}`);
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
      const family = SPECIES[0]!.taxonomy.family;

      await user.selectOptions(screen.getByLabelText('Family'), family);

      const params = new URLSearchParams(router.state.location.search);

      // The season is not part of the catalogue query, but it shares the URL —
      // dropping it would reset a shared link's palette on the first click.
      expect(params.get('season')).toBe('winter');
      expect(params.get('family')).toBe(family);
    });
  });

  describe('empty state', () => {
    it('explains itself when nothing matches', () => {
      renderCatalogue('/catalogue?q=zzzzzz');

      expect(screen.getByText(/No species match those filters/)).toBeInTheDocument();
      expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    });

    it('offers a way out that actually clears the filters', async () => {
      const user = userEvent.setup();
      const router = renderCatalogue('/catalogue?q=zzzzzz');

      // Distinctly named from the panel's own Clear button: two buttons with
      // the same accessible name are ambiguous in a screen reader's list.
      await user.click(screen.getByRole('button', { name: /Show all \d+ species/ }));

      expect(router.state.location.search).toBe('');
      expect(rows()).toHaveLength(SPECIES.length);
    });
  });

  describe('clearing', () => {
    it('disables the clear button when there is nothing to clear', () => {
      renderCatalogue();

      expect(screen.getByRole('button', { name: 'Clear filters' })).toBeDisabled();
    });

    it('enables it once a filter is applied', () => {
      renderCatalogue('/catalogue?q=stag');

      expect(screen.getByRole('button', { name: 'Clear filters' })).toBeEnabled();
    });

    it('keeps the sort order, which is not a filter', async () => {
      const user = userEvent.setup();
      const router = renderCatalogue('/catalogue?q=stag&sort=name');

      await user.click(screen.getByRole('button', { name: 'Clear filters' }));

      const params = new URLSearchParams(router.state.location.search);

      expect(params.get('q')).toBeNull();
      expect(params.get('sort')).toBe('name');
    });

    it('empties the search box, not just the results', async () => {
      const user = userEvent.setup();

      renderCatalogue('/catalogue?q=stag');

      const search = screen.getByLabelText('Search');

      expect(search).toHaveValue('stag');

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

    await user.type(screen.getByLabelText('Search'), 'stag');

    await waitFor(() => {
      expect(new URLSearchParams(router.state.location.search).get('q')).toBe('stag');
    });

    unsubscribe();

    // Four characters, one URL write. Without the debounce this would be four,
    // each of them re-filtering and re-rendering the whole list.
    expect(navigations).toBe(1);
  });
});
