import { cleanup, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { catalogueNumberOf, findSpecies, JOURNAL_ENTRIES } from '@/data';
import { ThemeProvider } from '@/features/theme';
import { binomialOf } from '@/lib/catalogue';
import { formatEntryDate, plainText } from '@/lib/journal';

import { JournalEntryRoute } from './JournalEntryRoute';

/**
 * One entry's page.
 *
 * A real memory router with the route's own path pattern, because the component
 * reads `:slug` — the same shape `SpecimenRoute.test.tsx` uses and for the same
 * reason.
 */
function renderEntry(slug: string) {
  const router = createMemoryRouter([{ path: '/journal/:slug', element: <JournalEntryRoute /> }], {
    initialEntries: [`/journal/${slug}`],
  });

  return render(
    <ThemeProvider initialSeason="autumn">
      <RouterProvider router={router} />
    </ThemeProvider>,
  );
}

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.season;
  delete document.documentElement.dataset.themeReady;
  localStorage.clear();
});

const NEWEST = JOURNAL_ENTRIES[0]!;
const SECOND = JOURNAL_ENTRIES[1]!;
const OLDEST = JOURNAL_ENTRIES.at(-1)!;

/** An entry that names a specimen — every one of them does today. */
const WITH_SPECIMEN = JOURNAL_ENTRIES.find((entry) => entry.speciesId !== undefined)!;

describe('JournalEntryRoute', () => {
  it('heads the entry with its title and its date', () => {
    renderEntry(NEWEST.slug);

    expect(screen.getByRole('heading', { level: 1, name: NEWEST.title })).toHaveAttribute(
      'tabindex',
      '-1',
    );
    expect(screen.getByText(formatEntryDate(NEWEST.date))).toBeInTheDocument();
  });

  it('renders the prose as paragraphs, not as one string', () => {
    renderEntry(NEWEST.slug);

    const paragraphs = NEWEST.blocks.filter((block) => block.kind === 'paragraph');

    expect(paragraphs.length).toBeGreaterThan(1);

    // The first paragraph's own words, which is enough to prove the blocks were
    // rendered rather than the raw markdown printed.
    expect(screen.getByText(plainText(paragraphs[0]!.spans))).toBeInTheDocument();
  });

  it('renders a link in the prose as a link, and keeps it internal', () => {
    renderEntry(WITH_SPECIMEN.slug);

    const article = screen.getByRole('article');
    const link = within(article).getByRole('link', {
      name: new RegExp(binomialOf(findSpecies(WITH_SPECIMEN.speciesId!)!)),
    });

    // A site-relative href becomes a router link, so following it is a client
    // navigation like any other — and it must not have picked up a target.
    expect(link).toHaveAttribute('href', `/specimen/${WITH_SPECIMEN.speciesId!}`);
    expect(link).not.toHaveAttribute('target');
  });

  it('puts the specimen in the margin, with its accession number and its plate', () => {
    renderEntry(WITH_SPECIMEN.slug);

    const species = findSpecies(WITH_SPECIMEN.speciesId!)!;

    expect(screen.getByText(catalogueNumberOf(species))).toBeInTheDocument();
    // The plate is drawn as an SVG with alt text of its own; finding it by role
    // is finding what a screen reader would find.
    expect(screen.getByRole('img', { name: new RegExp(species.commonName) })).toBeInTheDocument();
  });

  it('pages to the entries either side, naming which direction is which', () => {
    renderEntry(SECOND.slug);

    const pager = screen.getByRole('navigation', { name: 'Journal' });

    expect(within(pager).getByRole('link', { name: /Newer/ })).toHaveAttribute(
      'href',
      `/journal/${NEWEST.slug}`,
    );
    expect(within(pager).getByRole('link', { name: /Older/ })).toHaveAttribute('rel', 'next');
  });

  it('offers no newer link on the newest entry, and no older on the oldest', () => {
    renderEntry(NEWEST.slug);

    const pager = screen.getByRole('navigation', { name: 'Journal' });

    expect(within(pager).queryByRole('link', { name: /Newer/ })).not.toBeInTheDocument();

    cleanup();
    renderEntry(OLDEST.slug);

    expect(
      within(screen.getByRole('navigation', { name: 'Journal' })).queryByRole('link', {
        name: /Older/,
      }),
    ).not.toBeInTheDocument();
  });

  it('is a 404 for a slug that names no entry', () => {
    renderEntry('a-week-in-provence');

    // Not an empty page: a journal that renders nothing for a dead link is a
    // journal hiding its own parse failures.
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent(NEWEST.title);
    expect(
      screen.getByRole('heading', { level: 1, name: /not in this collection/i }),
    ).toBeInTheDocument();
  });
});
