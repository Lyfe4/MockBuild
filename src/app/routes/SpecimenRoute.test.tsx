import { cleanup, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { catalogueNumberOf, findPlate, SPECIES } from '@/data';
import { ThemeProvider } from '@/features/theme';
import { binomialOf, sortSpecies } from '@/lib/catalogue';

import { SpecimenRoute } from './SpecimenRoute';

/**
 * The specimen sheet, against the real collection.
 *
 * The page's job is to say what the archive actually claims about an animal and
 * where it got it, so the tests are about the ledger being complete and the
 * sources being reachable — not about layout.
 */
const ORDERED = sortSpecies(SPECIES, 'catalogue', { accessionOf: catalogueNumberOf });

function renderSpecimen(id: string, season: 'spring' | 'summer' | 'autumn' | 'winter' = 'winter') {
  const router = createMemoryRouter([{ path: '/specimen/:id', element: <SpecimenRoute /> }], {
    initialEntries: [`/specimen/${id}`],
  });

  const view = render(
    <ThemeProvider initialSeason={season}>
      <RouterProvider router={router} />
    </ThemeProvider>,
  );

  return { ...view, router };
}

afterEach(() => {
  delete document.documentElement.dataset.season;
  delete document.documentElement.dataset.themeReady;
  localStorage.clear();
});

const FIRST = ORDERED[0]!;
const SECOND = ORDERED[1]!;

describe('SpecimenRoute', () => {
  it('heads the sheet with the accession number, the binomial and the common name', () => {
    renderSpecimen(FIRST.id);

    expect(screen.getByText(catalogueNumberOf(FIRST))).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: binomialOf(FIRST) })).toHaveAttribute(
      'tabindex',
      '-1',
    );
    expect(screen.getAllByText(FIRST.commonName).length).toBeGreaterThan(0);
  });

  it('reads the taxonomy out in rank order, down to the authority', () => {
    renderSpecimen(FIRST.id);

    for (const term of ['Order', 'Family', 'Genus', 'Species', 'Authority']) {
      expect(screen.getByText(term), term).toBeInTheDocument();
    }

    expect(screen.getByText(FIRST.taxonomy.authority)).toBeInTheDocument();
  });

  it('gives the size its basis, because a wingspan and a body length are not the same number', () => {
    for (const species of SPECIES) {
      renderSpecimen(species.id);

      expect(screen.getByText(`(${species.sizeBasis})`), species.id).toBeInTheDocument();

      cleanup();
    }
  });

  it('shows the distribution and every morphological character', () => {
    renderSpecimen(FIRST.id);

    expect(screen.getByText(FIRST.distribution)).toBeInTheDocument();

    for (const value of Object.values(FIRST.morphology)) {
      expect(screen.getAllByText(String(value)).length, String(value)).toBeGreaterThan(0);
    }
  });

  describe('the phenology strip', () => {
    it('is twelve cells, one a month', () => {
      const { container } = renderSpecimen(FIRST.id);

      expect(container.querySelectorAll('ol li')).toHaveLength(12);
    });

    it('is hidden from the accessibility tree, and says the same thing in prose', () => {
      renderSpecimen(FIRST.id);

      const { container } = { container: document.body };
      const strip = container.querySelector('ol');

      // Twelve one-letter cells read aloud are noise; the sentence under them
      // carries the same information.
      expect(strip).toHaveAttribute('aria-hidden', 'true');
      expect(screen.getByText(/Adults on the wing/)).toBeInTheDocument();
    });

    it('names the season the site is currently wearing, and says the months are northern', () => {
      renderSpecimen(FIRST.id, 'summer');

      expect(screen.getByText(/months of Thornfield’s summer/)).toBeInTheDocument();
      expect(screen.getByText(/recorded in the northern hemisphere/)).toBeInTheDocument();
    });
  });

  describe('sources', () => {
    it('links every source the record cites, plus the plate’s reference', () => {
      renderSpecimen(FIRST.id);

      const list = screen.getByRole('heading', { name: 'Sources' }).parentElement!;
      const links = within(list).getAllByRole('link');
      const plate = findPlate(FIRST.id);

      expect(links).toHaveLength(FIRST.sources.length + (plate === undefined ? 0 : 1));
    });

    it('gives every outbound link rel="noopener noreferrer"', () => {
      renderSpecimen(FIRST.id);

      const list = screen.getByRole('heading', { name: 'Sources' }).parentElement!;

      for (const link of within(list).getAllByRole('link')) {
        // noopener so a new tab gets no handle on this window; noreferrer
        // because which sheet somebody was reading is nobody else's business.
        expect(link, link.textContent).toHaveAttribute('rel', 'noopener noreferrer');
        expect(link).toHaveAttribute('href', expect.stringMatching(/^https:\/\//));
      }
    });
  });

  describe('the pager', () => {
    it('offers the next specimen but no previous one on the first sheet', () => {
      renderSpecimen(FIRST.id);

      const pager = screen.getByRole('navigation', { name: 'Catalogue' });

      expect(within(pager).getAllByRole('link')).toHaveLength(1);
      expect(within(pager).getByRole('link')).toHaveAttribute('href', `/specimen/${SECOND.id}`);
    });

    it('offers both on a sheet in the middle', () => {
      renderSpecimen(SECOND.id);

      const pager = screen.getByRole('navigation', { name: 'Catalogue' });

      expect(within(pager).getAllByRole('link')).toHaveLength(2);
    });

    it('walks in catalogue order, not in whatever order the list was sorted by', () => {
      renderSpecimen(ORDERED[ORDERED.length - 1]!.id);

      const pager = screen.getByRole('navigation', { name: 'Catalogue' });
      const links = within(pager).getAllByRole('link');

      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute('href', `/specimen/${ORDERED[ORDERED.length - 2]!.id}`);
    });
  });

  it('draws the plate as a named image beside the sheet', () => {
    renderSpecimen(FIRST.id);

    expect(screen.getByRole('img', { name: new RegExp(binomialOf(FIRST)) })).toBeInTheDocument();
  });

  it('renders the not-found page for a slug the collection does not hold', () => {
    renderSpecimen('lucanus-imaginarius');

    expect(screen.queryByRole('navigation', { name: 'Catalogue' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 }).textContent).not.toBe('');
  });
});
