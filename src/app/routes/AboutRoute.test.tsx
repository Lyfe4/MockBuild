import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { INSTITUTION, REFERENCE_SOURCES, SPECIES } from '@/data';
import { ordersOf } from '@/lib/catalogue';
import { renderWithProviders } from '@/test/renderWithProviders';

import { AboutRoute } from './AboutRoute';

/**
 * The About page, against the real records.
 *
 * Nothing here writes down sixteen or six: the counts are read out of `SPECIES`
 * the same way the page reads them, so the test says "the page agrees with the
 * collection" rather than "the page is what it was when this was written".
 *
 * What it pins is the part of this page that could go wrong quietly — the
 * credits. A credits list that silently drops an entry, or credits one to the
 * wrong artist, looks exactly like a correct one.
 */

function renderAbout() {
  return renderWithProviders(<AboutRoute />, { route: '/about' });
}

/** The credits list, found by its own heading rather than by class. */
function credits(): HTMLElement {
  return screen.getByRole('list', { name: /what the plates were traced from/i });
}

describe('AboutRoute', () => {
  it('is headed, and the heading is focusable for the route change', () => {
    renderAbout();

    const heading = screen.getByRole('heading', { level: 1, name: 'About the collection' });

    // `RootLayout` moves focus to `main h1` after a navigation, which only works
    // if the heading will take it.
    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  it('counts the specimens and the orders out of the collection', () => {
    renderAbout();

    const orders = ordersOf(SPECIES);
    // Read as text rather than element by element: the margin is a term-and-
    // value list where several values are split by a `<br>`, so no single
    // element holds "10.00 – 16.00" on its own.
    const facts = screen.getByRole('complementary', { name: /at a glance/i }).textContent;

    expect(facts).toContain(`${String(SPECIES.length)} catalogued`);
    expect(facts).toContain(`${String(orders.length)} — ${orders.join(', ')}`);
  });

  it('gives the reading room hours and the founding year from one place', () => {
    renderAbout();

    const facts = screen.getByRole('complementary', { name: /at a glance/i }).textContent;

    expect(facts).toContain(String(INSTITUTION.founded));
    expect(facts).toContain(INSTITUTION.readingRoom.hours);
    expect(facts).toContain(INSTITUTION.readingRoom.days);
    expect(facts).toContain(INSTITUTION.readingRoom.note);
  });

  it('says the institution is fictional and the animals are not', () => {
    renderAbout();

    const honesty = screen.getByRole('region', { name: /sources and honesty/i });

    expect(within(honesty).getByText(/institution is fictional/i)).toBeInTheDocument();
    expect(within(honesty).getByText(/animals are real/i)).toBeInTheDocument();
    // The two caveats the rest of the site also says out loud: the northern
    // months read as southern seasons, and one reference is a substitution.
    expect(within(honesty).getByText(/Southern Hemisphere seasons/)).toBeInTheDocument();
    expect(within(honesty).getByText(/substitution/)).toBeInTheDocument();
  });

  it('credits every reference the plates were traced from, once each', () => {
    renderAbout();

    const entries = within(credits()).getAllByRole('listitem');

    expect(entries).toHaveLength(REFERENCE_SOURCES.length);
  });

  it('gives each credit its work, artist, year, licence and source link', () => {
    renderAbout();

    const entries = within(credits()).getAllByRole('listitem');

    for (const [index, source] of REFERENCE_SOURCES.entries()) {
      const entry = entries[index];

      expect(entry, source.species).toBeDefined();

      const text = entry?.textContent;

      expect(text, source.species).toContain(source.work);
      expect(text, source.species).toContain(source.artist);
      expect(text, source.species).toContain(String(source.year));
      expect(text, source.species).toContain(source.licence);

      const link = within(entry!).getByRole('link', { name: /source page/i });

      expect(link, source.species).toHaveAttribute('href', source.sourcePage);
      // Outbound, so it gets the same treatment as every other outbound link
      // on the site.
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('links each credit to the specimen it was drawn for', () => {
    renderAbout();

    const stag = within(credits()).getByRole('link', { name: 'Lucanus cervus' });

    expect(stag).toHaveAttribute('href', '/specimen/lucanus-cervus');
  });

  it('points a reader at the generated file the credits come from', () => {
    renderAbout();

    // The page and `references/SOURCES.md` are rendered from one module, and
    // saying so is the point of the sentence — a reader who wants the long form
    // has somewhere to go.
    expect(screen.getByText('references/SOURCES.md')).toBeInTheDocument();
  });
});
