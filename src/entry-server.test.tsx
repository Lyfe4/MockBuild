// @vitest-environment node
//
// Node, not jsdom, and that is the whole point of the file. `renderRoute` is
// what runs at build time in a process with no DOM, and two of the behaviours
// worth asserting — that `useRouteMeta` records instead of writing, and that
// nothing reaches for `window` during render — only exist when `document` is
// genuinely undefined. Under jsdom this file would pass while testing something
// else.
import { describe, expect, it } from 'vitest';

import { renderRoute } from './entry-server';

const ORIGIN = 'https://thornfield-archive.netlify.app';

const render = (path: string) => renderRoute(`${ORIGIN}${path}`);

describe('renderRoute', () => {
  it('renders a route to markup with no DOM anywhere in reach', async () => {
    expect(typeof document).toBe('undefined');

    const { html } = await render('/catalogue');

    expect(html).toContain('<h1');
    expect(html).toContain('Catalogue');
    // The shell, so the whole tree rendered rather than an error boundary.
    expect(html).toContain('Skip to main content');
  });

  it('resolves lazy routes, so a prerendered page is the page and not a shell', async () => {
    // `/calendar` is behind `lazy`. If the static handler did not await it, this
    // would come back as an empty outlet and nobody would notice until a
    // crawler read thirty blank files.
    const { html } = await render('/calendar');

    expect(html).toContain('Calendar');
    expect(html).toContain('<table');
  });

  it('collects the route meta the effect would have written', async () => {
    const { meta } = await render('/specimen/lucanus-cervus');

    expect(meta).not.toBeNull();
    expect(meta?.title).toContain('Lucanus cervus');
    expect(meta?.canonical).toBe(`${ORIGIN}/specimen/lucanus-cervus`);
  });

  it('gives every prerenderable route a title of its own', async () => {
    const titles = await Promise.all(
      ['/', '/catalogue', '/key', '/calendar', '/about', '/journal', '/request'].map(
        async (path) => (await render(path)).meta?.title,
      ),
    );

    for (const title of titles) expect(title).toBeDefined();
    // Only `/` and `/catalogue` share one, because they are the same page.
    expect(new Set(titles).size).toBe(titles.length - 1);
  });

  it('emits no inline styles, which the CSP forbids', async () => {
    for (const path of ['/catalogue', '/calendar', '/specimen/aeshna-cyanea']) {
      const { html } = await render(path);

      // Presentation attributes on SVG are fine and are everywhere; a `style`
      // attribute is what `style-src 'self'` blocks.
      expect(html, path).not.toMatch(/<[^>]+\sstyle=/i);
    }
  });

  it('emits no inline script but the JSON-LD data block', async () => {
    const { html } = await render('/catalogue');
    const scripts = html.match(/<script\b[^>]*>/gi) ?? [];

    // `hydrate={false}` is what keeps react-router from writing a
    // `window.__staticRouterHydrationData` assignment here. A JSON-LD block is
    // a data block, never executed, and is allowed — see `JsonLd`.
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toContain('application/ld+json');
  });

  it('renders the archive undressed, because a file cannot know a reader', async () => {
    const { html } = await render('/catalogue');

    /*
      No season is resolved during a build, so the dial has nothing checked and
      no name beside it, and the neutral palette in `tokens.css` is what paints
      until the page hydrates. `ThemeProvider` and `useReaderSeason` argue it in
      full.
    */
    expect(html).not.toContain('checked=""');
    expect(html).toContain('role="status"');
  });

  it('holds back the lazy plate boundary, so hydration has nothing to recover', async () => {
    const { html } = await render('/catalogue');

    /*
      `renderToString` cannot await a dynamic import, so a Suspense boundary
      around one is emitted unfinished and React reports a recoverable error for
      every row on hydration. `SpecimenRow` therefore mounts the boundary only
      after hydration, and there is no boundary marker in this markup at all.
    */
    expect(html).not.toContain('<!--$?-->');
    expect(html).not.toContain('<template');
    // The rows themselves are here; it is only the drawings that wait.
    expect(html).toContain('Lucanus cervus');
  });

  it('renders the not-found page for a path the archive does not hold', async () => {
    const { html, meta } = await render('/no-such-thing');

    expect(html).toContain('Not in this collection');
    expect(meta?.title).toContain('Not found');
  });
});
