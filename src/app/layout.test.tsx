import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CatalogueRoute } from '@/app/routes/CatalogueRoute';
import { ThemeProvider } from '@/features/theme';
import { measurePageGrid, type PageGrid } from '@/test/layoutGeometry';
import { stubViewportWidth } from '@/test/matchMedia';

import { RootLayout } from './RootLayout';

// The layout tokens live on `:root`, and the harness resolves `var()` out of
// the stylesheets in the document. Only the token sheet is needed here:
// `styles/index.css` would pull in the font binaries for nothing.
import '@/styles/tokens.css';

/**
 * Where the page grid actually puts things.
 *
 * The claim under test is one sentence — the masthead, the ledger and the
 * colophon are the same grid — and it is the kind of claim that is true on the
 * day it is written and quietly false a month later, because nothing in the DOM
 * records it. Three components each declaring the same measure and the same
 * gutter would pass every other test in this suite while drifting a pixel a
 * change.
 *
 * jsdom cannot answer it: there is no layout, and `getComputedStyle` ignores
 * `@media`, so it reports the mobile arrangement at every width. The geometry
 * is computed instead — see `src/test/layoutGeometry.ts`, which reads the
 * shipped stylesheets out of the CSSOM and does the arithmetic the browser
 * would do.
 *
 * The three grids are measured separately and then compared, which is the
 * honest shape of the claim: they are three elements, and what makes them one
 * grid is that their lines land on the same pixels.
 *
 * Numbers are exact rather than approximate. Alignment is not a tolerance: an
 * edge is on the line or it is not.
 */

/** The widths the design is checked at, and what each one is there to catch. */
const WIDTHS = [
  { width: 1024, note: 'the narrowest width the two-column ledger is asked for' },
  { width: 1280, note: 'a laptop' },
  { width: 1440, note: 'the design width' },
  { width: 1920, note: 'wider than the measure, so the grid is centred' },
] as const;

interface Page {
  readonly header: PageGrid;
  readonly main: PageGrid;
  readonly footer: PageGrid;
  /** The main grid's element, for reaching the catalogue's own markup. */
  readonly mainElement: HTMLElement;
}

function renderShell(width: number): Page {
  stubViewportWidth(width);

  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <RootLayout />,
        children: [{ index: true, element: <CatalogueRoute /> }],
      },
    ],
    { initialEntries: ['/'] },
  );

  const { container } = render(
    <ThemeProvider initialSeason="autumn">
      <RouterProvider router={router} />
    </ThemeProvider>,
  );

  const gridOf = (selector: string): HTMLElement => {
    const element = container.querySelector(selector);

    if (!(element instanceof HTMLElement)) throw new Error(`no page grid at "${selector}"`);

    return element;
  };

  const mainElement = gridOf('main > div');

  return {
    header: measurePageGrid(gridOf('header > div'), width),
    main: measurePageGrid(mainElement, width),
    footer: measurePageGrid(gridOf('footer > div'), width),
    mainElement,
  };
}

/** The element the reader sees as the wordmark — the span, not its link. */
function wordmark(): Element {
  const link = within(screen.getByRole('banner')).getByRole('link', {
    name: 'Thornfield Entomological Archive',
  });
  const span = link.firstElementChild;

  if (span === null) throw new Error('the wordmark has no text span');

  return span;
}

/** The three colophon sections, by the heading each one carries. */
function colophonColumns(): Element[] {
  return within(screen.getByRole('contentinfo'))
    .getAllByRole('heading', { level: 2 })
    .map((heading) => {
      const section = heading.parentElement;

      if (section === null) throw new Error('a colophon heading has no section');

      return section;
    });
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  delete document.documentElement.dataset.season;
  delete document.documentElement.dataset.themeReady;
  localStorage.clear();
});

describe('the page grid', () => {
  describe.each(WIDTHS)('at $width — $note', ({ width }) => {
    it('is the same grid in the masthead, the main column and the colophon', () => {
      const { header, main, footer } = renderShell(width);

      for (const grid of [header, footer]) {
        expect(grid.contentStart).toBe(main.contentStart);
        expect(grid.contentEnd).toBe(main.contentEnd);
        expect(grid.columnGap).toBe(main.columnGap);
        expect(grid.column('margin')).toStrictEqual(main.column('margin'));
        expect(grid.column('body')).toStrictEqual(main.column('body'));
      }
    });

    it('starts the wordmark, the filter panel and the first row on one line', () => {
      const { header, main, mainElement } = renderShell(width);

      const left = main.column('content').left;

      expect(header.edgesOf(wordmark()).left).toBe(left);

      // The filter panel is the ledger's margin, so its left edge is the
      // margin column's — which is the content column's, because the margin is
      // the first of the twelve.
      const panel = screen.getByRole('search', { name: 'Filter the catalogue' });

      expect(main.edgesOf(panel).left).toBe(main.column('margin').left);
      expect(main.edgesOf(panel).left).toBe(left);

      const firstRow = mainElement.querySelector('li');

      expect(firstRow).not.toBeNull();
      expect(main.edgesOf(firstRow!).left).toBe(main.column('body').left);
    });

    it('ends the navigation where the entry column ends', () => {
      const { header, main, mainElement } = renderShell(width);

      const right = main.column('content').right;
      const nav = screen.getByRole('navigation', { name: 'Primary' });

      expect(header.edgesOf(nav).right).toBe(right);

      const list = mainElement.querySelector('ul[class*="results"]');

      expect(list).not.toBeNull();
      expect(main.edgesOf(list!).right).toBe(right);
      expect(main.column('body').right).toBe(right);
    });

    it('hangs the colophon between the same two lines', () => {
      const { footer, main } = renderShell(width);

      const columns = colophonColumns();

      expect(columns).toHaveLength(3);
      expect(footer.edgesOf(columns[0]!).left).toBe(main.column('content').left);
      expect(footer.edgesOf(columns[2]!).right).toBe(main.column('content').right);
    });

    it('divides the measure into a margin and an entry column one gutter apart', () => {
      const { main } = renderShell(width);

      const margin = main.column('margin');
      const body = main.column('body');

      expect(body.left - margin.right).toBeCloseTo(main.columnGap, 6);
      expect(margin.left).toBe(main.contentStart);
      expect(body.right).toBe(main.contentEnd);

      // The margin is a margin: narrower than the entry column it annotates,
      // and never so narrow that a filter label has nowhere to go.
      expect(margin.right - margin.left).toBeLessThan(body.right - body.left);
      expect(margin.right - margin.left).toBeGreaterThan(200);
    });
  });

  it('holds the whole composition to the measure, centred, at 1920', () => {
    const { main } = renderShell(1920);

    // 96rem with a 4rem gutter inside it: past this width the page stops
    // growing and the room left over goes to the margins, not to the entry.
    expect(main.contentEnd - main.contentStart).toBeCloseTo(96 * 16 - 2 * 64, 6);
    expect(main.contentStart).toBeCloseTo(1920 - main.contentEnd, 6);
  });

  it('is one column on a phone, with every line on its edges', () => {
    const { header, main } = renderShell(375);

    // The margin column does not exist below the ledger's breakpoint, and its
    // names resolve to the single column's own edges — which is what lets a
    // component be placed on them without knowing how wide the page is.
    expect(main.column('margin').left).toBe(main.contentStart);
    expect(main.column('body').right).toBe(main.contentEnd);
    expect(header.edgesOf(wordmark()).left).toBe(main.contentStart);
  });
});
