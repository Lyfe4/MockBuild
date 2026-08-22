import { useId, useMemo } from 'react';

import { cx } from '@/lib/classNames';
import {
  describeInsect,
  generateInsect,
  toPathData,
  type InsectForm,
  type InsectMark,
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
 * Which marks are painted with the accent, and which with ink.
 *
 * Patterns are the only coloured element: on a plate they are the pigment and
 * everything else is the engraver's line. Keeping the list here rather than in
 * the CSS means the generator stays ignorant of colour.
 */
const ACCENT_PARTS = new Set<InsectMark['part']>(['marking']);

/**
 * Renders a procedurally generated insect as inline SVG.
 *
 * Takes an `InsectForm` and nothing else, so it never learns what a pronotum or
 * an eyespot is — adding an order touches `lib/insect` and no component. The
 * geometry brings its own view box, which is how a portrait beetle and a
 * landscape moth can share one renderer.
 *
 * Closed marks are filled with the surface token and stroked with ink — the
 * look of a pen outline over a flat wash. All of it is presentation attributes
 * and classes, never inline styles, so the strict `style-src 'self'` CSP holds.
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
    const accent = ACCENT_PARTS.has(mark.part);
    const tone = accent ? styles.accent : styles.ink;

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
        className={cx(mark.closed ? styles.shape : styles.line, tone)}
        d={toPathData(mark.commands)}
        {...(mark.closed ? {} : { strokeWidth: mark.width })}
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
