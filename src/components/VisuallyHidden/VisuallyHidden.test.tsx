import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VisuallyHidden } from './VisuallyHidden';

describe('VisuallyHidden', () => {
  it('keeps its content in the accessibility tree', () => {
    render(<VisuallyHidden>Search the catalogue</VisuallyHidden>);

    // getByText queries the DOM the way assistive technology reads it: if this
    // passes, a screen reader announces the text even though nothing is drawn.
    expect(screen.getByText('Search the catalogue')).toBeInTheDocument();
  });

  it('renders a span by default', () => {
    render(<VisuallyHidden>Accession number</VisuallyHidden>);

    expect(screen.getByText('Accession number').tagName).toBe('SPAN');
  });

  it('renders the element given by `as`, for contexts where a span is invalid', () => {
    render(
      <ul>
        <VisuallyHidden as="li">End of list</VisuallyHidden>
      </ul>,
    );

    expect(screen.getByText('End of list').tagName).toBe('LI');
  });

  it('appends a caller class rather than replacing its own', () => {
    render(<VisuallyHidden className="extra">Accession</VisuallyHidden>);

    const element = screen.getByText('Accession');

    expect(element).toHaveClass('extra');
    // The module class is hashed at build time, so assert on the count instead
    // of the generated name: two classes means ours survived alongside theirs.
    expect(element.classList).toHaveLength(2);
  });

  it('applies no class of its own beyond the module class when none is passed', () => {
    render(<VisuallyHidden>Specimen</VisuallyHidden>);

    expect(screen.getByText('Specimen').classList).toHaveLength(1);
  });
});
