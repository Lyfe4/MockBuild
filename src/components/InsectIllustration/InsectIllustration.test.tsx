import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { describeBeetle, type BeetleForm } from '@/lib/insect';

import { InsectIllustration } from './InsectIllustration';

const FORM: BeetleForm = {
  bodyLength: 0.85,
  bodyWidth: 0.9,
  headWidth: 0.6,
  eyeSize: 0.6,
  antennaType: 'clavate',
  antennaLength: 0.6,
  mandibleSize: 0.2,
  pronotumShape: 'rounded',
  pronotumWidth: 0.85,
  pronotumRidge: true,
  horn: false,
  hornLength: 0.5,
  elytraLength: 0.8,
  elytraWidth: 1.1,
  elytraTaper: 0.2,
  striaeCount: 4,
  punctures: false,
  legLength: 0.9,
  femurThickness: 1,
  legSpread: 0.5,
  tibialSpines: false,
  marking: 'spots',
  markingCount: 4,
  markingSize: 1,
  scale: 0.92,
};

function svgIn(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector('svg');

  if (svg === null) throw new Error('no <svg> rendered');

  return svg;
}

describe('InsectIllustration', () => {
  it('exposes the drawing as a named image', () => {
    render(<InsectIllustration form={FORM} seed={1} title="Spotted beetle" />);

    expect(screen.getByRole('img', { name: /Spotted beetle/ })).toBeInTheDocument();
  });

  it('describes the beetle using the generator description', () => {
    const { container } = render(<InsectIllustration form={FORM} seed={1} title="Beetle" />);

    expect(container.querySelector('desc')?.textContent).toBe(describeBeetle(FORM));
  });

  it('wires title and desc to the image with aria-labelledby', () => {
    const { container } = render(<InsectIllustration form={FORM} seed={1} title="Beetle" />);

    const labelledBy = svgIn(container).getAttribute('aria-labelledby')?.split(' ') ?? [];

    expect(labelledBy).toHaveLength(2);

    for (const id of labelledBy) {
      expect(container.querySelector(`#${CSS.escape(id)}`)).not.toBeNull();
    }
  });

  it('hides itself and drops its description when decorative', () => {
    const { container } = render(
      <InsectIllustration form={FORM} seed={1} title="Beetle" decorative />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(svgIn(container)).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('desc')).toBeNull();
  });

  it('is never a keyboard tab stop', () => {
    const { container } = render(<InsectIllustration form={FORM} seed={1} title="Beetle" />);

    expect(svgIn(container)).toHaveAttribute('focusable', 'false');
  });

  it('scales to its container rather than carrying fixed dimensions', () => {
    const { container } = render(<InsectIllustration form={FORM} seed={1} title="Beetle" />);

    const svg = svgIn(container);

    expect(svg.getAttribute('viewBox')).toBe('0 0 120 140');
    expect(svg.getAttribute('width')).toBeNull();
    expect(svg.getAttribute('height')).toBeNull();
  });

  it('carries no inline style, so the strict CSP holds', () => {
    const { container } = render(
      <InsectIllustration form={FORM} seed={1} title="Beetle" animate />,
    );

    expect(container.querySelectorAll('[style]')).toHaveLength(0);
    expect(container.querySelectorAll('style')).toHaveLength(0);
  });

  it('clips the markings to the wing case they sit on', () => {
    const { container } = render(<InsectIllustration form={FORM} seed={1} title="Beetle" />);

    const clips = container.querySelectorAll('clipPath');

    // One per elytron, and each actually referenced by a group.
    expect(clips).toHaveLength(2);

    for (const clip of clips) {
      expect(container.querySelector(`[clip-path="url(#${CSS.escape(clip.id)})"]`)).not.toBeNull();
    }
  });

  it('draws no clipped marking group when there are no markings', () => {
    const { container } = render(
      <InsectIllustration form={{ ...FORM, marking: 'none' }} seed={1} title="Beetle" />,
    );

    expect(container.querySelectorAll('[clip-path]')).toHaveLength(0);
  });

  it('renders the identical beetle for the same seed across mounts', () => {
    const geometry = (container: HTMLElement): string =>
      [...container.querySelectorAll('path, circle')].map((node) => node.outerHTML).join('');

    const first = render(<InsectIllustration form={FORM} seed={7} title="Beetle" />);
    const before = geometry(first.container);

    first.unmount();

    const second = render(<InsectIllustration form={FORM} seed={7} title="Beetle" />);

    expect(geometry(second.container)).toBe(before);
  });

  it('draws a different beetle for a different seed', () => {
    const { container: a } = render(<InsectIllustration form={FORM} seed={1} title="A" />);
    const { container: b } = render(<InsectIllustration form={FORM} seed={2} title="B" />);

    expect(a.querySelector('svg')?.innerHTML).not.toBe(b.querySelector('svg')?.innerHTML);
  });

  it('only marks itself animated when asked', () => {
    const { container: still } = render(<InsectIllustration form={FORM} seed={1} title="A" />);
    const { container: moving } = render(
      <InsectIllustration form={FORM} seed={1} title="A" animate />,
    );

    expect(svgIn(still).classList).toHaveLength(1);
    expect(svgIn(moving).classList).toHaveLength(2);
  });
});
