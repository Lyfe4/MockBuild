import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { parseBlocks } from '@/lib/journal';

import { JournalProse } from './JournalProse';

/**
 * The renderer, on parsed markdown.
 *
 * The last test is the one worth having: it takes the injection fixture all the
 * way through to the DOM and asserts that nothing in it became an element. The
 * parser's own test proves the blocks are clean; this proves the renderer does
 * not put them back together into markup.
 */
function renderProse(markdown: string) {
  const router = createMemoryRouter(
    [{ path: '*', element: <JournalProse blocks={parseBlocks(markdown)} /> }],
    { initialEntries: ['/journal/x'] },
  );

  return render(<RouterProvider router={router} />);
}

describe('JournalProse', () => {
  it('renders paragraphs, headings, quotes and lists', () => {
    const { container } = renderProse(
      ['A paragraph.', '', '## A heading', '', '> A quote.', '', '- one', '- two'].join('\n'),
    );

    expect(screen.getByText('A paragraph.').tagName).toBe('P');
    expect(screen.getByRole('heading', { level: 2, name: 'A heading' })).toBeInTheDocument();
    expect(container.querySelector('blockquote')).not.toBeNull();
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders emphasis and strong as elements, not as asterisks', () => {
    const { container } = renderProse('The _Käferbuch_ and the **check**.');

    expect(container.querySelector('em')?.textContent).toBe('Käferbuch');
    expect(container.querySelector('strong')?.textContent).toBe('check');
    expect(container.textContent).not.toContain('_');
    expect(container.textContent).not.toContain('*');
  });

  it('makes a site-relative link a router link and an outbound one a new tab', () => {
    renderProse(
      'See [the beetle](/specimen/lucanus-cervus) and [Commons](https://commons.wikimedia.org).',
    );

    const internal = screen.getByRole('link', { name: 'the beetle' });
    const external = screen.getByRole('link', { name: 'Commons' });

    expect(internal).toHaveAttribute('href', '/specimen/lucanus-cervus');
    expect(internal).not.toHaveAttribute('target');
    expect(external).toHaveAttribute('target', '_blank');
    // Same treatment every other outbound link on the site gets.
    expect(external).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders injected markup as nothing at all', () => {
    const { container } = renderProse(
      [
        'A paragraph with <script>alert("xss")</script> in it.',
        '',
        '- an item with <b>bold</b> markup and an <span onclick="steal()">on-click</span>',
        '',
        'A [link](javascript:alert(1)) that keeps its words.',
      ].join('\n'),
    );

    // No element the file asked for exists...
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('span[onclick]')).toBeNull();
    // ...no attribute survived as an attribute...
    expect(container.innerHTML).not.toContain('onclick');
    // ...the rejected link is text rather than a link...
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    // ...and the words are all still there.
    expect(container.textContent).toContain('A paragraph with');
    expect(container.textContent).toContain('bold markup');
    expect(container.textContent).toContain('that keeps its words');
  });
});
