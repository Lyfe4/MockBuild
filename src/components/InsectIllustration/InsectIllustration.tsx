import { useId, useMemo } from 'react';

import { cx } from '@/lib/classNames';
import {
  describeBeetle,
  generateBeetle,
  toPathData,
  type BeetleForm,
  type BeetleMark,
  type PathMark,
} from '@/lib/insect';

import styles from './InsectIllustration.module.css';

export interface InsectIllustrationProps {
  form: BeetleForm;
  /** Any 32-bit integer. `seedFromName` derives one from a preset name. */
  seed: number;
  /**
   * The accessible name. There is no dataset behind the spike, so unlike
   * `PlantIllustration` this cannot be derived from a record.
   */
  title: string;
  animate?: boolean | undefined;
  decorative?: boolean | undefined;
  className?: string | undefined;
}

/**
 * Which marks are painted with the accent, and which with ink.
 *
 * Markings are the only coloured element: on a plate they are the pigment, and
 * everything else is the engraver's line. Keeping the list here rather than in
 * the CSS means the generator stays ignorant of colour entirely.
 */
const ACCENT_PARTS = new Set<BeetleMark['part']>(['marking']);

/**
 * SPIKE — renders a procedurally generated beetle as inline SVG.
 *
 * Follows `PlantIllustration`'s pattern deliberately, so the two can be
 * compared like for like: the generator decides *what* the animal looks like
 * and knows nothing about React or colour, and this decides *how* it is drawn
 * and knows nothing about anatomy.
 *
 * Closed marks are filled with the surface token and stroked with ink — the
 * look of a pen outline over a flat wash. Open marks are strokes only. All of
 * it is presentation attributes and classes, never inline styles, so the strict
 * `style-src 'self'` CSP holds.
 */
export function InsectIllustration({
  form,
  seed,
  title,
  animate = false,
  decorative = false,
  className,
}: InsectIllustrationProps) {
  const titleId = useId();
  const descriptionId = useId();
  const clipPrefix = useId();

  const geometry = useMemo(() => generateBeetle(form, seed), [form, seed]);
  const description = useMemo(() => describeBeetle(form), [form]);

  /**
   * The two wing-case outlines, reused as clip paths.
   *
   * The markings are already generated inside the elytron's measured profile,
   * so this is a second line of defence rather than the mechanism: it catches
   * the last fraction of a millimetre where a round spot meets a curving margin
   * that a half-width sample cannot describe exactly.
   */
  const elytra = geometry.marks.filter(
    (mark): mark is PathMark => mark.part === 'elytron' && mark.kind === 'path',
  );

  const accessibilityProps = decorative
    ? ({ 'aria-hidden': true, role: 'presentation' } as const)
    : ({ role: 'img', 'aria-labelledby': `${titleId} ${descriptionId}` } as const);

  const renderMark = (mark: BeetleMark, index: number) => {
    const key = `${mark.part}-${mark.side}-${String(index)}`;
    const accent = ACCENT_PARTS.has(mark.part);

    if (mark.kind === 'dot') {
      return (
        <circle
          key={key}
          className={cx(styles.dot, accent ? styles.accent : styles.ink)}
          cx={mark.center.x}
          cy={mark.center.y}
          r={mark.radius}
        />
      );
    }

    return (
      <path
        key={key}
        className={cx(
          mark.closed ? styles.shape : styles.line,
          accent ? styles.accent : styles.ink,
        )}
        d={toPathData(mark.commands)}
        {...(mark.closed ? {} : { strokeWidth: mark.width })}
      />
    );
  };

  // Markings are drawn inside a clipped group, so they are separated out here.
  const body = geometry.marks.filter((mark) => mark.part !== 'marking');
  const markings = geometry.marks.filter((mark) => mark.part === 'marking');

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
        {elytra.map((elytron) => (
          <clipPath key={elytron.side} id={`${clipPrefix}-${elytron.side}`}>
            <path d={toPathData(elytron.commands)} />
          </clipPath>
        ))}
      </defs>

      <g className={styles.body}>{body.map(renderMark)}</g>

      {(['right', 'left'] as const).map((side) => {
        const onThisSide = markings.filter((mark) => mark.side === side);

        if (onThisSide.length === 0) return null;

        return (
          <g key={side} clipPath={`url(#${clipPrefix}-${side})`}>
            {onThisSide.map(renderMark)}
          </g>
        );
      })}
    </svg>
  );
}
