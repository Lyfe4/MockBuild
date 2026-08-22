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
 * The illustration's top-level groups, in render order: roots, stems, leaves,
 * flowers. Addressed by position because the class names are hashed at build
 * time, and only direct children so nested groups do not leak in.
 */
function groupsIn(container: HTMLElement): Element[] {
  return [...svgIn(container).children].filter((node) => node.tagName === 'g');
}

function stemPathsIn(container: HTMLElement): Element[] {
  const stems = groupsIn(container)[1];

  return stems === undefined ? [] : [...stems.children];
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
    it('adds no animation class by default', () => {
      const { container } = render(<PlantIllustration specimen={specimen} />);

      expect(svgIn(container).classList).toHaveLength(1);
    });

    it('marks the drawing as animated when asked', () => {
      const { container } = render(<PlantIllustration specimen={specimen} animate />);

      expect(svgIn(container).classList).toHaveLength(2);
    });

    it('carries no inline style, so the strict CSP holds', () => {
      // style-src is 'self' with no 'unsafe-inline'. Per-element animation
      // timing rides on depth classes precisely so nothing here needs a style
      // attribute; a regression to inline styles would only show up in
      // production, as an illustration that silently fails to render.
      const { container } = render(<PlantIllustration specimen={specimen} animate />);

      expect(container.querySelectorAll('[style]')).toHaveLength(0);
      expect(container.querySelectorAll('style')).toHaveLength(0);
    });

    it('tags each segment with its depth so the stagger has something to key on', () => {
      const { container } = render(<PlantIllustration specimen={specimen} animate />);

      const stems = stemPathsIn(container);

      expect(stems.length).toBeGreaterThan(0);
      // Two classes on every stem: the stem class and its depth class.
      for (const path of stems) {
        expect(path.classList).toHaveLength(2);
      }
    });
  });

  describe('botanical detail', () => {
    it('draws stems as closed filled outlines rather than strokes', () => {
      const { container } = render(<PlantIllustration specimen={specimen} />);

      const stems = [...container.querySelectorAll('path')].filter((path) =>
        path.getAttribute('d')?.endsWith('Z'),
      );

      expect(stems.length).toBeGreaterThan(0);
      // A tapered ribbon is a fill; a stroke-width would mean it went back to
      // being a centreline with one width for its whole length.
      expect(stems.every((path) => path.getAttribute('stroke-width') === null)).toBe(true);
    });

    it('draws a vein path alongside every leaf blade', () => {
      const withLeaves = SPECIMENS.find((record) => record.form.leafDensity > 0.5);

      expect(withLeaves).toBeDefined();

      const { container } = render(<PlantIllustration specimen={withLeaves!} />);
      const leafGroup = groupsIn(container)[2];

      expect(leafGroup).toBeDefined();
      // Each leaf is a <g> holding a blade and its midrib.
      for (const leaf of leafGroup!.children) {
        expect(leaf.querySelectorAll('path')).toHaveLength(2);
      }
    });

    it('draws roots only for specimens that record them', () => {
      const withRoots = SPECIMENS.find((record) => record.form.roots);
      const without = SPECIMENS.find((record) => !record.form.roots);

      expect(withRoots).toBeDefined();
      expect(without).toBeDefined();

      const rootCount = (record: Specimen): number => {
        const { container, unmount } = render(<PlantIllustration specimen={record} />);
        const count = groupsIn(container)[0]?.children.length ?? 0;

        unmount();

        return count;
      };

      expect(rootCount(withRoots!)).toBeGreaterThan(0);
      expect(rootCount(without!)).toBe(0);
    });

    it('draws flower petals as outlines around a filled centre', () => {
      const flowering = SPECIMENS.find((record) => record.form.flowerType === 'single');

      expect(flowering).toBeDefined();

      const { container } = render(<PlantIllustration specimen={flowering!} />);
      const circles = container.querySelectorAll('circle');

      // One disc per flower, and the petals are paths rather than more discs.
      expect(circles).toHaveLength(1);
      expect(container.querySelectorAll('path').length).toBeGreaterThan(flowering!.form.petalCount);
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
