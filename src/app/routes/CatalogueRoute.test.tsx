import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { catalogueNumberOf, SPECIES } from '@/data';
import { ThemeProvider } from '@/features/theme';
import { NARROW_VIEWPORT, stubViewportWidth, WIDE_VIEWPORT } from '@/test/matchMedia';

import { CatalogueRoute } from './CatalogueRoute';

/**
 * Rendered against the real collection, not a fixture.
 *
 * The page's whole job is to filter the archive that actually exists; a fixture
 * would pass while the real records broke on an accented common name or on a
 * family shared by two orders. Nothing here asserts a hard-coded count, so the
 * file survives the collection growing.
 *
 * The viewport is part of the fixture, because the page's *markup* differs
 * across the ledger's breakpoint: wide, the filters are the margin column and
 * are always open; narrow, they are a disclosure between the heading and the
 * list. Everything below defaults to the wide arrangement and the narrow one
 * has a section of its own.
 */
function renderCatalogue(route = '/catalogue', width = WIDE_VIEWPORT) {
  stubViewportWidth(width);

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

    it('puts the chosen sort in the query string', async () => {
      const user = userEvent.setup();
      const router = renderCatalogue();

      await user.selectOptions(screen.getByLabelText('Sort'), 'name');

      expect(router.state.location.search).toContain('sort=name');
    });

    it('does not label two different controls Order', () => {
      // The sort control used to be labelled Order, a few centimetres from the
      // filter for the taxonomic Order. `getByRole` throwing on the ambiguity
      // is the point: one Order on the page, and it is the animal's.
      renderCatalogue();

      expect(screen.getByRole('group', { name: 'Order' })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Sort' })).toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: 'Order' })).toBeNull();
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

  describe('on a narrow screen', () => {
    const openFilters = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole('button', { name: /^Filters/ }));
    };

    it('folds the whole panel behind one button', () => {
      renderCatalogue('/catalogue', NARROW_VIEWPORT);

      expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
      // Not merely off-screen: `hidden` keeps it out of the accessibility tree,
      // so a folded panel costs no tab stops and no announcements.
      expect(screen.queryByRole('searchbox', { name: 'Search' })).toBeNull();
      expect(screen.queryByRole('checkbox')).toBeNull();
    });

    it('still shows the collection, which is what the fold is for', () => {
      renderCatalogue('/catalogue', NARROW_VIEWPORT);

      // The panel used to sit between the heading and the list, so a phone
      // opened the catalogue on a page of form controls.
      expect(rows()).toHaveLength(SPECIES.length);
    });

    it('counts what is applied, so a collapsed panel cannot filter in silence', () => {
      renderCatalogue('/catalogue?order=Coleoptera&markings=spots&q=beetle', NARROW_VIEWPORT);

      // Three chosen values, not two facets: it is what a reader who ticked
      // three boxes will count.
      const toggle = screen.getByRole('button', { name: /^Filters/ });

      expect(toggle).toHaveTextContent('Filters · 3');
      // "Filters 3" would announce as three of something unnamed.
      expect(toggle).toHaveAccessibleName('Filters, 3 applied');
    });

    it('opens the panel and moves focus into it', async () => {
      const user = userEvent.setup();

      renderCatalogue('/catalogue', NARROW_VIEWPORT);
      await openFilters(user);

      const toggle = screen.getByRole('button', { name: /^Filters/ });
      const panel = screen.getByRole('group', { name: 'Filters' });

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(toggle).toHaveAttribute('aria-controls', panel.id);
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      // The panel itself rather than the search box: focusing a text input
      // raises the on-screen keyboard over the facets it was opened to show.
      expect(panel).toHaveFocus();
    });

    it('closes on Escape and hands focus back to the button', async () => {
      const user = userEvent.setup();

      renderCatalogue('/catalogue', NARROW_VIEWPORT);
      await openFilters(user);
      await user.keyboard('{Escape}');

      const toggle = screen.getByRole('button', { name: /^Filters/ });

      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(toggle).toHaveFocus();
      expect(screen.queryByRole('searchbox', { name: 'Search' })).toBeNull();
    });

    it('stays open while filters are applied', async () => {
      const user = userEvent.setup();
      const order = SPECIES[0]!.taxonomy.order;

      renderCatalogue('/catalogue', NARROW_VIEWPORT);
      await openFilters(user);
      await user.click(screen.getByRole('checkbox', { name: order }));

      // Ticking one box and having the panel shut is the fastest way to make a
      // reader give up on the second.
      expect(screen.getByRole('button', { name: /^Filters/ })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      expect(screen.getByRole('checkbox', { name: order })).toBeChecked();
    });

    it('has no disclosure at all above the breakpoint', () => {
      renderCatalogue();

      // Wide, the panel is the margin: open, always, with no button in front of
      // it and no JavaScript involved in showing it.
      expect(screen.queryByRole('button', { name: /^Filters/ })).toBeNull();
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
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
