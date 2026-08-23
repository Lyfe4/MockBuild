import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { LUCANUS_CERVUS, LUCANUS_CERVUS_PLATE, SPECIES } from '@/data/species';
import { renderWithProviders } from '@/test/renderWithProviders';

import { PlateLabRoute } from './PlateLabRoute';

/**
 * The contact sheet is a dev-only instrument, but it is the instrument the
 * plates are judged with — so what it *shows* has to be right. A page that
 * quietly rendered one plate at one size, or dropped a species, or stopped
 * reporting the validator's verdict, would read as a working sheet while
 * hiding the thing it exists to expose.
 */

afterEach(() => {
  delete document.documentElement.dataset.season;
  delete document.documentElement.dataset.themeReady;
  localStorage.clear();
});

function renderLab() {
  return renderWithProviders(<PlateLabRoute />, { route: '/lab/plates' });
}

describe('PlateLabRoute', () => {
  // The accessible name is the title *and* the description, because the svg is
  // labelled by both — so these match on a fragment rather than the whole name.
  it('shows every plate in the collection at three sizes', () => {
    renderLab();

    for (const species of SPECIES) {
      const name = `${species.taxonomy.genus} ${species.taxonomy.species}`;

      for (const size of [80, 240, 600]) {
        expect(
          screen.getByRole('img', { name: new RegExp(`${name} at ${String(size)} pixels`) }),
          `${name} at ${String(size)}`,
        ).toBeInTheDocument();
      }
    }
  });

  it('reports the validator verdict on the page, not only in the test run', () => {
    renderLab();

    // A plate that fails should be visibly broken here. Matching on the count
    // as well as the word, so a page that hard-coded "clean" would fail.
    expect(
      screen.getByText(
        `validatePlate: clean — ${String(LUCANUS_CERVUS_PLATE.parts.length)} paths, no errors`,
      ),
    ).toBeInTheDocument();
  });

  it('shows the alt text each plate will actually be given', () => {
    renderLab();

    // The quotation, not the <desc> elements it is quoting — the point is that
    // a reader can see the sentence without a screen reader.
    const quotes = screen.getAllByRole('blockquote');

    expect(quotes).toHaveLength(SPECIES.length);
    expect(quotes[0]?.textContent).toMatch(/^Dorsal view of a male European stag beetle/);
  });

  it('credits every reference it was traced from, with a link and a licence', () => {
    renderLab();

    const links = screen.getAllByRole('link', { name: 'Source' });

    expect(links).toHaveLength(SPECIES.length);
    expect(links[0]).toHaveAttribute('href', LUCANUS_CERVUS_PLATE.reference.source);
    expect(screen.getAllByText(/Public domain/).length).toBeGreaterThan(0);
  });

  it('names each species with its order and family, so a plate can be placed', () => {
    renderLab();

    expect(screen.getByRole('heading', { level: 2, name: 'Lucanus cervus' })).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(`${LUCANUS_CERVUS.taxonomy.order}, ${LUCANUS_CERVUS.taxonomy.family}`),
      ),
    ).toBeInTheDocument();
  });
});
