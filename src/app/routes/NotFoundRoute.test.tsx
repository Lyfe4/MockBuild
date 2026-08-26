import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { catalogueNumberOf, catalogueRange, SPECIES } from '@/data';
import { renderWithProviders } from '@/test/renderWithProviders';

import { NotFoundRoute } from './NotFoundRoute';

/**
 * The 404 page, and the one fact on it that can go stale.
 *
 * The sentence naming the accession range was written by hand once and was
 * wrong on both the prefix and the numbers by the time anybody read it again.
 * These tests assert the page quotes the collection rather than a memory of it,
 * so growing the archive updates the page and shrinking it cannot leave a
 * number behind that was never issued.
 */
describe('NotFoundRoute', () => {
  it('says what it is without an error code', () => {
    renderWithProviders(<NotFoundRoute />);

    expect(screen.getByRole('heading', { level: 1, name: 'Not in this collection' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Return to the catalogue' })).toHaveAttribute(
      'href',
      '/catalogue',
    );
  });

  it('quotes the accession range the collection actually holds', () => {
    renderWithProviders(<NotFoundRoute />);

    const first = catalogueNumberOf(SPECIES[0]!);
    const last = catalogueNumberOf(SPECIES[SPECIES.length - 1]!);

    expect(
      screen.getByText(new RegExp(`catalogue numbers run from ${first} to ${last}`)),
    ).toBeVisible();
  });
});

describe('catalogueRange', () => {
  it('reads the ends of the collection, in accession order', () => {
    expect(catalogueRange()).toStrictEqual([
      catalogueNumberOf(SPECIES[0]!),
      catalogueNumberOf(SPECIES[SPECIES.length - 1]!),
    ]);
  });

  it('is the archive prefix and a four-digit number at both ends', () => {
    const range = catalogueRange();

    expect(range).toBeDefined();
    for (const number of range ?? []) expect(number).toMatch(/^TEA-\d{4}$/);
  });
});
