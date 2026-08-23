import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Ledger } from './Ledger';

/**
 * The frame, checked for the two things it decides rather than shows.
 *
 * Whether the margin is pinned is CSS and jsdom holds no stylesheet, so it is
 * not asserted here — it is `LedgerProps.sticky` and the reason it is a prop is
 * in the comment on it. What *is* testable is the DOM: the margin comes before
 * the body, and a page that passes none gets no column for it.
 */
describe('Ledger', () => {
  it('reads margin first, so the visual order and the reading order agree', () => {
    render(
      <Ledger margin={<p>Filters</p>}>
        <p>Entry</p>
      </Ledger>,
    );

    const text = document.body.textContent;

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(text.indexOf('Filters')).toBeLessThan(text.indexOf('Entry'));
  });

  it('leaves the margin out entirely when there is none', () => {
    const { container } = render(
      <Ledger margin={null}>
        <p>Entry</p>
      </Ledger>,
    );

    // One child, not two: the catalogue moves its filters into the body column
    // on a narrow screen, and an empty margin would leave the gap they used to
    // occupy above the heading.
    expect(container.firstElementChild?.childElementCount).toBe(1);
  });

  it('keeps a margin that renders as nothing much, like a zero', () => {
    render(<Ledger margin={0}>{'Entry'}</Ledger>);

    // `0` and `''` are renderable. Only null and undefined mean "no margin".
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
