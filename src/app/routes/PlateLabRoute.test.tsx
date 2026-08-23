import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { LUCANUS_CERVUS, LUCANUS_CERVUS_PLATE } from '@/data/species';
import { renderWithProviders } from '@/test/renderWithProviders';

import { PlateLabRoute } from './PlateLabRoute';

/**
 * The comparison sheet is a dev-only instrument, but it is the instrument the
 * decision to drop the generator will be made with — so what it *shows* has to
 * be right. A page that quietly rendered the plate at one size, or dropped the
 * generator column, or stopped reporting the validator's verdict, would read as
 * a working comparison while making the wrong case.
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
  it('shows the plate at three sizes', () => {
    renderLab();

    for (const size of [80, 240, 600]) {
      expect(
        screen.getByRole('img', { name: new RegExp(`Lucanus cervus at ${String(size)} pixels`) }),
      ).toBeInTheDocument();
    }
  });

  it('shows the generator at the same three sizes, for the comparison', () => {
    renderLab();

    for (const size of [80, 240, 600]) {
      expect(
        screen.getByRole('img', {
          name: new RegExp(`Generated stag beetle at ${String(size)} pixels`),
        }),
      ).toBeInTheDocument();
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

  it('shows the alt text the plate will actually be given', () => {
    renderLab();

    // The quotation, not the <desc> elements it is quoting — the point of the
    // section is that a reader can see the sentence without a screen reader.
    expect(screen.getByRole('blockquote').textContent).toMatch(
      /^Dorsal view of a male European stag beetle/,
    );
  });

  it('credits the reference it was traced from, with a link and a licence', () => {
    renderLab();

    const link = screen.getByRole('link', { name: 'Source' });

    expect(link).toHaveAttribute('href', LUCANUS_CERVUS_PLATE.reference.source);
    expect(screen.getByText(/Public domain/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /1876 lithograph/ })).toBeInTheDocument();
  });

  it('names the species with its authority, so the comparison is on the record', () => {
    renderLab();

    expect(
      screen.getByText(`Lucanus cervus ${LUCANUS_CERVUS.taxonomy.authority}, male, dorsal.`),
    ).toBeInTheDocument();
  });

  it('gives each column a heading a screen reader can navigate between', () => {
    renderLab();

    expect(
      screen.getByRole('heading', { level: 2, name: 'Hand-authored plate' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Generator, stag preset' }),
    ).toBeInTheDocument();
  });
});
