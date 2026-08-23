import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LUCANUS_CERVUS, LUCANUS_CERVUS_PLATE } from '@/data/species';
import { describePlate, SPECIES_PIGMENTS, type SpeciesPlate } from '@/lib/plate';
import type { Species } from '@/types';

import { SpeciesIllustration } from './SpeciesIllustration';

/**
 * The renderer, checked against the plate it was built for.
 *
 * Two things are worth testing here and the rest is CSS. One: the drawing is
 * reachable and described, because a plate nobody can hear is a plate that
 * fails the only accessibility promise the archive makes about it. Two: the
 * mirroring and the clipping actually happen — both are invisible to the type
 * system and both fail by producing half an animal, which reads as a styling
 * problem rather than a bug.
 */

const PLATE = LUCANUS_CERVUS_PLATE;

function svgIn(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector('svg');

  if (svg === null) throw new Error('no <svg> rendered');

  return svg;
}

describe('SpeciesIllustration', () => {
  it('exposes the drawing as a named image', () => {
    render(<SpeciesIllustration species={LUCANUS_CERVUS} plate={PLATE} />);

    expect(screen.getByRole('img', { name: /Lucanus cervus/ })).toBeInTheDocument();
  });

  it('names itself with the binomial by default', () => {
    const { container } = render(<SpeciesIllustration species={LUCANUS_CERVUS} plate={PLATE} />);

    expect(container.querySelector('title')?.textContent).toBe('Lucanus cervus');
  });

  it('takes a title from the caller when the surrounding text already says the name', () => {
    render(
      <SpeciesIllustration species={LUCANUS_CERVUS} plate={PLATE} title="Male, dorsal view" />,
    );

    expect(screen.getByRole('img', { name: /Male, dorsal view/ })).toBeInTheDocument();
  });

  it('describes the animal with the same sentence describePlate produces', () => {
    const { container } = render(<SpeciesIllustration species={LUCANUS_CERVUS} plate={PLATE} />);

    expect(container.querySelector('desc')?.textContent).toBe(
      describePlate(LUCANUS_CERVUS, {
        sex: PLATE.sex,
        ...(PLATE.hallmark === undefined ? {} : { hallmark: PLATE.hallmark }),
      }),
    );
  });

  it('says the animal is male and names the mandibles, from the plate', () => {
    const { container } = render(<SpeciesIllustration species={LUCANUS_CERVUS} plate={PLATE} />);
    const description = container.querySelector('desc')?.textContent ?? '';

    expect(description).toContain('male');
    expect(description).toContain('mandibles');
  });

  it('leaves the accessibility tree entirely when decorative', () => {
    const { container } = render(
      <SpeciesIllustration species={LUCANUS_CERVUS} plate={PLATE} decorative />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(svgIn(container)).toHaveAttribute('aria-hidden', 'true');
    // No point describing something nothing can reach.
    expect(container.querySelector('desc')).toBeNull();
  });

  describe('mirroring', () => {
    it('draws the authored half twice, the second reflected', () => {
      const { container } = render(<SpeciesIllustration species={LUCANUS_CERVUS} plate={PLATE} />);
      const reflected = container.querySelectorAll('g[transform="scale(-1,1)"]');

      expect(reflected).toHaveLength(1);

      const mirroredParts = PLATE.parts.filter((part) => part.mirror !== false);

      expect(reflected[0]?.querySelectorAll('path')).toHaveLength(mirroredParts.length);
    });

    it('draws a midline part once, and not inside the reflection', () => {
      const { container } = render(<SpeciesIllustration species={LUCANUS_CERVUS} plate={PLATE} />);
      const midline = PLATE.parts.filter((part) => part.mirror === false);

      expect(midline.length).toBeGreaterThan(0);

      // Every midline path is drawn exactly once. Twice would be a doubled
      // line down the animal's axis. Copies inside a clipPath do not count —
      // those define a region and paint nothing.
      for (const part of midline) {
        const drawn = [...container.querySelectorAll(`path[d="${part.d}"]`)].filter(
          (path) => path.closest('clipPath') === null,
        );

        expect(drawn, part.id).toHaveLength(1);
      }
    });

    it('draws every mirrored path exactly twice', () => {
      const { container } = render(<SpeciesIllustration species={LUCANUS_CERVUS} plate={PLATE} />);
      const mandible = PLATE.parts.find((part) => part.id === 'mandible');

      expect(container.querySelectorAll(`path[d="${mandible?.d ?? ''}"]`)).toHaveLength(2);
    });

    it('centres the frame on the midline, so the axis of symmetry is centred', () => {
      const { container } = render(<SpeciesIllustration species={LUCANUS_CERVUS} plate={PLATE} />);
      const [minX, , width] = (svgIn(container).getAttribute('viewBox') ?? '')
        .split(' ')
        .map(Number);

      expect(minX).toBeCloseTo(-(width ?? 0) / 2, 1);
    });
  });

  describe('clipping', () => {
    it('defines one clip path per surface anything is clipped to', () => {
      const { container } = render(<SpeciesIllustration species={LUCANUS_CERVUS} plate={PLATE} />);
      const surfaces = new Set(
        PLATE.parts.map((part) => part.clipTo).filter((id) => id !== undefined),
      );

      expect(container.querySelectorAll('defs clipPath')).toHaveLength(surfaces.size);
      expect(surfaces.size).toBeGreaterThan(0);
    });

    it('points every clipped path at a clip path that exists', () => {
      const { container } = render(<SpeciesIllustration species={LUCANUS_CERVUS} plate={PLATE} />);
      const clipped = container.querySelectorAll('path[clip-path]');

      expect(clipped.length).toBeGreaterThan(0);

      for (const path of clipped) {
        const reference = path.getAttribute('clip-path') ?? '';
        const id = reference.slice('url(#'.length, -1);

        expect(container.querySelector(`clipPath[id="${id}"]`), reference).not.toBeNull();
      }
    });

    it('reuses one clip path for both halves, which is why the reflection is a transform', () => {
      // A clip on a path inside the reflected group resolves in that group's
      // own user space, so it is already mirrored. One definition, both sides.
      const { container } = render(<SpeciesIllustration species={LUCANUS_CERVUS} plate={PLATE} />);
      const hatching = PLATE.parts.find((part) => part.id === 'hatching');
      const both = container.querySelectorAll(`path[d="${hatching?.d ?? ''}"]`);

      expect(both).toHaveLength(2);
      expect(both[0]?.getAttribute('clip-path')).toBe(both[1]?.getAttribute('clip-path'));
    });
  });

  describe('presentation', () => {
    it('carries the pigment as a data attribute rather than an inline style', () => {
      const { container } = render(<SpeciesIllustration species={LUCANUS_CERVUS} plate={PLATE} />);

      expect(svgIn(container)).toHaveAttribute('data-pigment', String(LUCANUS_CERVUS.pigment));
    });

    it.each(SPECIES_PIGMENTS)('passes pigment %i through untouched', (pigment) => {
      const recoloured: Species = { ...LUCANUS_CERVUS, pigment };
      const { container } = render(<SpeciesIllustration species={recoloured} plate={PLATE} />);

      expect(svgIn(container)).toHaveAttribute('data-pigment', String(pigment));
    });

    it('has no inline style anywhere in the tree, which the CSP requires', () => {
      const { container } = render(<SpeciesIllustration species={LUCANUS_CERVUS} plate={PLATE} />);

      expect(container.querySelectorAll('[style]')).toHaveLength(0);
    });

    it('carries no stroke width or colour in the markup — those are the stylesheet', () => {
      const { container } = render(<SpeciesIllustration species={LUCANUS_CERVUS} plate={PLATE} />);

      for (const attribute of ['stroke-width', 'stroke', 'fill'] as const) {
        expect(container.querySelectorAll(`path[${attribute}]`)).toHaveLength(0);
      }
    });

    it('scales the frame by the species scale rather than the drawing', () => {
      const smaller: Species = { ...LUCANUS_CERVUS, scale: 0.5 };
      const full = render(<SpeciesIllustration species={LUCANUS_CERVUS} plate={PLATE} />);
      const half = render(<SpeciesIllustration species={smaller} plate={PLATE} />);

      const widthOf = (container: HTMLElement): number =>
        Number((svgIn(container).getAttribute('viewBox') ?? '').split(' ')[2]);

      expect(widthOf(half.container) / widthOf(full.container)).toBeCloseTo(2, 1);

      // And the geometry is byte-for-byte the same drawing, so the line weights
      // it was authored with survive being drawn small.
      const path = (container: HTMLElement): string | null =>
        container.querySelector('path')?.getAttribute('d') ?? null;

      expect(path(half.container)).toBe(path(full.container));
    });

    it('is responsive: no width or height attribute, so the container decides', () => {
      const { container } = render(<SpeciesIllustration species={LUCANUS_CERVUS} plate={PLATE} />);
      const svg = svgIn(container);

      expect(svg).not.toHaveAttribute('width');
      expect(svg).not.toHaveAttribute('height');
      expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
    });

    it('draws every part of the plate', () => {
      const { container } = render(<SpeciesIllustration species={LUCANUS_CERVUS} plate={PLATE} />);
      const mirrored = PLATE.parts.filter((part) => part.mirror !== false).length;
      const midline = PLATE.parts.length - mirrored;

      // Both halves, plus the midline parts once, plus the clip path outlines.
      const clipOutlines = container.querySelectorAll('clipPath path').length;

      expect(container.querySelectorAll('path')).toHaveLength(
        mirrored * 2 + midline + clipOutlines,
      );
    });
  });

  describe('membranous wings', () => {
    /**
     * A dragonfly's wings overlap each other and the abdomen, so they are drawn
     * with a real `fill-opacity`. The flag has to reach the markup as a *class*
     * — the CSP forbids the inline style that setting it directly would need —
     * and it has to reach only the parts that asked for it.
     */
    const WINGED: SpeciesPlate = {
      species: LUCANUS_CERVUS.id,
      order: 'odonata',
      sex: 'unsexed',
      reference: PLATE.reference,
      parts: [
        {
          id: 'abdomen',
          rank: 'outline',
          fill: 'pigment',
          d: 'M-30 200 L30 200 L0 900 Z',
          mirror: false,
        },
        {
          id: 'forewing',
          rank: 'outline',
          fill: 'pigment',
          d: 'M40 200 C300 160 500 210 340 310 Z',
          opacity: 'membrane',
        },
        {
          id: 'hindwing',
          rank: 'outline',
          fill: 'pigment',
          d: 'M40 270 C300 240 480 300 330 380 Z',
        },
      ],
    };

    function classesOf(container: HTMLElement, index: number): string {
      return container.querySelectorAll('g > path')[index]?.getAttribute('class') ?? '';
    }

    it('gives a membrane part a class of its own', () => {
      const { container } = render(<SpeciesIllustration species={LUCANUS_CERVUS} plate={WINGED} />);

      // Authored order: abdomen is a midline part and is drawn last, so the
      // first two paths are the forewing and the hindwing of the right half.
      expect(classesOf(container, 0)).toMatch(/membrane/);
      expect(classesOf(container, 1)).not.toMatch(/membrane/);
    });

    it('carries it onto the reflected half too, so both wings match', () => {
      const { container } = render(<SpeciesIllustration species={LUCANUS_CERVUS} plate={WINGED} />);
      const membranes = [...container.querySelectorAll('path')].filter((path) =>
        (path.getAttribute('class') ?? '').includes('membrane'),
      );

      expect(membranes).toHaveLength(2);
    });

    it('still writes no inline style, which is the reason it is a class', () => {
      const { container } = render(<SpeciesIllustration species={LUCANUS_CERVUS} plate={WINGED} />);

      expect(container.querySelectorAll('[style]')).toHaveLength(0);
      expect(container.querySelectorAll('[fill-opacity]')).toHaveLength(0);
    });
  });
});
