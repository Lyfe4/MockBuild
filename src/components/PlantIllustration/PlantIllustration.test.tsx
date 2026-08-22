import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SPECIMENS } from '@/data';
import { describePlant, VIEW_BOX } from '@/lib/plant';
import type { Specimen } from '@/types';

import { PlantIllustration } from './PlantIllustration';

/**
 * A real record rather than a fixture: the component's whole job is to draw
 * what the archive holds, and a hand-built form would drift from the dataset.
 */
const specimen: Specimen = SPECIMENS[0]!;

/** The <svg> element, which Testing Library will not return by role when hidden. */
function svgIn(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector('svg');

  if (svg === null) throw new Error('no <svg> rendered');

  return svg;
}

/**
 * Just the drawn marks.
 *
 * Comparing whole `innerHTML` would compare the `useId` values in `<title>` and
 * `<desc>` too, and those are *required* to differ between mounts — that is the
 * point of `useId`. This isolates the geometry, which is the thing that must
 * not change.
 */
function geometryIn(container: HTMLElement): string {
  return [...container.querySelectorAll('path, circle')].map((node) => node.outerHTML).join('');
}

describe('PlantIllustration', () => {
  it('exposes the drawing as an image to assistive technology', () => {
    render(<PlantIllustration specimen={specimen} />);

    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('names the image with the common and scientific names', () => {
    render(<PlantIllustration specimen={specimen} />);

    expect(
      screen.getByRole('img', {
        name: new RegExp(`${specimen.commonName}.*${specimen.scientificName}`),
      }),
    ).toBeInTheDocument();
  });

  it('describes the plant using the generator description', () => {
    const { container } = render(<PlantIllustration specimen={specimen} />);

    expect(container.querySelector('desc')?.textContent).toBe(describePlant(specimen.form));
  });

  it('wires title and desc to the image with aria-labelledby', () => {
    const { container } = render(<PlantIllustration specimen={specimen} />);

    const svg = svgIn(container);
    const labelledBy = svg.getAttribute('aria-labelledby')?.split(' ') ?? [];

    expect(labelledBy).toHaveLength(2);

    // Both referenced ids must actually resolve, or the name silently vanishes.
    for (const id of labelledBy) {
      expect(container.querySelector(`#${CSS.escape(id)}`)).not.toBeNull();
    }
  });

  it('hides itself and drops its description when decorative', () => {
    const { container } = render(<PlantIllustration specimen={specimen} decorative />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();

    const svg = svgIn(container);

    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('title')).toBeNull();
    expect(container.querySelector('desc')).toBeNull();
  });

  it('is never a keyboard tab stop', () => {
    const { container } = render(<PlantIllustration specimen={specimen} />);

    expect(svgIn(container)).toHaveAttribute('focusable', 'false');
  });

  it('scales to its container using the generator view box', () => {
    const { container } = render(<PlantIllustration specimen={specimen} />);

    const svg = svgIn(container);

    expect(svg).toHaveAttribute(
      'viewBox',
      `0 0 ${String(VIEW_BOX.width)} ${String(VIEW_BOX.height)}`,
    );
    expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMax meet');
    expect(svg.getAttribute('width')).toBeNull();
    expect(svg.getAttribute('height')).toBeNull();
  });

  it('draws stems, leaves and flowers', () => {
    const { container } = render(<PlantIllustration specimen={specimen} />);

    expect(container.querySelectorAll('path').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(0);
  });

  it('draws the identical plant for the same specimen across mounts', () => {
    const first = render(<PlantIllustration specimen={specimen} />);
    const firstGeometry = geometryIn(first.container);

    first.unmount();

    const second = render(<PlantIllustration specimen={specimen} />);

    expect(geometryIn(second.container)).toBe(firstGeometry);
  });

  it('draws a different plant when the seed is overridden', () => {
    const { container: a } = render(<PlantIllustration specimen={specimen} seed={1} />);
    const { container: b } = render(<PlantIllustration specimen={specimen} seed={2} />);

    expect(geometryIn(a)).not.toBe(geometryIn(b));
  });

  describe('grow animation', () => {
    it('is off by default, with stems fully drawn', () => {
      const { container } = render(<PlantIllustration specimen={specimen} />);

      for (const path of container.querySelectorAll('path[stroke-dasharray]')) {
        expect(path.getAttribute('stroke-dashoffset')).toBe('0');
      }
    });

    it('offsets every stem by its own length when animating', () => {
      const { container } = render(<PlantIllustration specimen={specimen} animate />);

      const stems = container.querySelectorAll('path[stroke-dasharray]');

      expect(stems.length).toBeGreaterThan(0);

      for (const path of stems) {
        const dashArray = path.getAttribute('stroke-dasharray');
        const dashOffset = path.getAttribute('stroke-dashoffset');

        // Offsetting by exactly the path length is what hides the stroke before
        // the animation walks the offset back to zero.
        expect(dashOffset).toBe(dashArray);
        expect(Number(dashOffset)).toBeGreaterThan(0);
      }
    });
  });

  it('appends a caller class rather than replacing its own', () => {
    const { container } = render(<PlantIllustration specimen={specimen} className="extra" />);

    const svg = svgIn(container);

    expect(svg.classList.contains('extra')).toBe(true);
    expect(svg.classList.length).toBe(2);
  });

  it('draws every specimen in the archive without throwing', () => {
    for (const record of SPECIMENS) {
      const { container, unmount } = render(<PlantIllustration specimen={record} />);

      expect(container.querySelectorAll('path').length).toBeGreaterThan(0);

      unmount();
    }
  });
});
