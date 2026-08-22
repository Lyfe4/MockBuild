import { useId, useMemo } from 'react';

import { cx } from '@/lib/classNames';
import {
  describeInsect,
  generateInsect,
  toPathData,
  type InsectForm,
  type InsectMark,
  type LineWeight,
} from '@/lib/insect';

import styles from './InsectIllustration.module.css';

export interface InsectIllustrationProps {
  /** The animal to draw, of whichever order. */
  insect: InsectForm;
  /** Any 32-bit integer. `seedFromName` derives one from a preset name. */
  seed: number;
  /**
   * The accessible name. There is no dataset behind the generator yet, so
   * unlike `PlantIllustration` this cannot be derived from a record.
   */
  title: string;
  animate?: boolean | undefined;
  decorative?: boolean | undefined;
  className?: string | undefined;
}

/**
 * Which marks are painted with the specimen's pigment, and which with ink.
 *
 * Markings are the pigmented element: on a plate they are the colour and
 * everything else is the engraver's line. Keeping the list here rather than in
 * the CSS means the generator stays ignorant of colour.
 */
const PIGMENTED_PARTS = new Set<InsectMark['part']>(['marking']);

/**
 * The class that carries each rank of the line hierarchy.
 *
 * The generator ranks a line and this maps the rank onto a class; the widths
 * themselves are `--insect-stroke-*` tokens in the stylesheet. Nothing in the
 * geometry is a stroke width any more, which is what stops a specimen fitted
 * small from being drawn in finer lines than one fitted large.
 */
const WEIGHT_CLASS: Record<LineWeight, string | undefined> = {
  outline: styles.weightOutline,
  structure: styles.weightStructure,
  detail: styles.weightDetail,
};

/**
 * Renders a procedurally generated insect as inline SVG.
 *
 * Takes an `InsectForm` and nothing else, so it never learns what a pronotum or
 * an eyespot is — adding an order touches `lib/insect` and no component. The
 * geometry brings its own view box, which is how a portrait beetle and a
 * landscape moth can share one renderer.
 *
 * Closed marks are filled with the specimen's pigment mixed into the surface
 * token and stroked with ink — the look of a pen outline over a flat wash.
 *
 * The pigment travels as a `data-pigment` attribute carrying an index, which
 * the stylesheet maps onto the `--pigment-N` tokens. An attribute rather than a
 * custom property written onto the element, because writing one would mean a
 * `style` attribute and the strict `style-src 'self'` CSP forbids it. All of
 * this is presentation attributes and classes; there is not an inline style
 * anywhere in the tree.
 */
export function InsectIllustration({
  insect,
  seed,
  title,
  animate = false,
  decorative = false,
  className,
}: InsectIllustrationProps) {
  const titleId = useId();
  const descriptionId = useId();
  const clipPrefix = useId();

  const geometry = useMemo(() => generateInsect(insect, seed), [insect, seed]);
  const description = useMemo(() => describeInsect(insect), [insect]);

  const accessibilityProps = decorative
    ? ({ 'aria-hidden': true, role: 'presentation' } as const)
    : ({ role: 'img', 'aria-labelledby': `${titleId} ${descriptionId}` } as const);

  const clipId = (surface: string): string => `${clipPrefix}-${surface}`;

  const renderMark = (mark: InsectMark, index: number) => {
    const key = `${mark.part}-${mark.side}-${String(index)}`;
    const tone = PIGMENTED_PARTS.has(mark.part) ? styles.pigmented : styles.ink;

    if (mark.kind === 'dot') {
      // A ring rather than a disc, when the generator asked for one: an
      // eyespot's rings must show paper between them.
      const ringed = mark.ring !== undefined;

      return (
        <circle
          key={key}
          className={cx(ringed ? styles.ring : styles.dot, tone)}
          cx={mark.center.x}
          cy={mark.center.y}
          r={mark.radius}
          {...(ringed ? { strokeWidth: mark.ring } : {})}
        />
      );
    }

    return (
      <path
        key={key}
        className={cx(mark.closed ? styles.shape : styles.line, tone, WEIGHT_CLASS[mark.weight])}
        d={toPathData(mark.commands)}
      />
    );
  };

  /**
   * Marks are grouped by the surface they are clipped to.
   *
   * The generator says *which* surface each pattern belongs to and supplies the
   * outlines; the renderer only has to honour it. That is what lets a moth have
   * four independent clip regions and a beetle two, with no order-specific code
   * here at all.
   */
  const unclipped = geometry.marks.filter((mark) => mark.clipTo === undefined);
  const surfaces = Object.keys(geometry.clips);

  return (
    <svg
      className={cx(styles.root, animate && styles.animated, className)}
      viewBox={`0 0 ${String(geometry.viewBox.width)} ${String(geometry.viewBox.height)}`}
      data-pigment={String(geometry.pigment)}
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
      {...accessibilityProps}
    >
      {!decorative && (
        <>
          <title id={titleId}>{title}</title>
          <desc id={descriptionId}>{description}</desc>
        </>
      )}

      <defs>
        {surfaces.map((surface) => (
          <clipPath key={surface} id={clipId(surface)}>
            <path d={toPathData(geometry.clips[surface] ?? [])} />
          </clipPath>
        ))}
      </defs>

      <g className={styles.body}>{unclipped.map(renderMark)}</g>

      {surfaces.map((surface) => {
        const confined = geometry.marks.filter((mark) => mark.clipTo === surface);

        if (confined.length === 0) return null;

        return (
          <g key={surface} clipPath={`url(#${clipId(surface)})`}>
            {confined.map(renderMark)}
          </g>
        );
      })}
    </svg>
  );
}
