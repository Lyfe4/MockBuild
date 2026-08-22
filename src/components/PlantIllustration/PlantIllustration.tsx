import { useId, useMemo } from 'react';

import { cx } from '@/lib/classNames';
import { describePlant, generatePlant, seedFromId, toPathData } from '@/lib/plant';
import type { Specimen } from '@/types';

import styles from './PlantIllustration.module.css';

export interface PlantIllustrationProps {
  /** The specimen to draw. Its `form` shapes the plant; its `id` seeds it. */
  specimen: Specimen;

  /**
   * Override the seed that would be derived from `specimen.id`. For trying
   * variations of one plant; leave it off and a specimen always draws the same.
   */
  seed?: number | undefined;

  /**
   * Draw the stems on and fade the foliage in on mount. Off by default: a page
   * of twenty-four of these animating at once is a lot. Disabled entirely under
   * `prefers-reduced-motion`.
   */
  animate?: boolean | undefined;

  /**
   * Hide from assistive technology. Use when the illustration sits beside text
   * that already names the plant, so a screen reader is not told the same thing
   * twice. The description is omitted entirely rather than merely unreferenced.
   */
  decorative?: boolean | undefined;

  className?: string | undefined;
}

/**
 * Renders a specimen's procedurally generated illustration as inline SVG.
 *
 * The split matters: `lib/plant` decides *what* the plant looks like and knows
 * nothing about React or the DOM, and this component decides *how* it is drawn
 * and knows nothing about branching or randomness. That is what lets the
 * generator be tested as plain data.
 *
 * Inline SVG rather than an `<img>` because the strokes are painted with CSS
 * custom properties: the drawing inherits the seasonal palette from the
 * document, and an external image could not.
 */
export function PlantIllustration({
  specimen,
  seed,
  animate = false,
  decorative = false,
  className,
}: PlantIllustrationProps) {
  const titleId = useId();
  const descriptionId = useId();

  const resolvedSeed = seed ?? seedFromId(specimen.id);

  // Generating is cheap but not free, and a grid renders two dozen at once.
  const geometry = useMemo(
    () => generatePlant(specimen.form, resolvedSeed),
    [specimen.form, resolvedSeed],
  );

  const description = useMemo(() => describePlant(specimen.form), [specimen.form]);

  /**
   * Accessible name and description.
   *
   * `<title>` is the name a screen reader announces and `<desc>` is the longer
   * text behind it; `aria-labelledby` pointing at both is what makes the pair
   * reliable across screen readers, which vary in whether they read the
   * elements implicitly.
   */
  const accessibilityProps = decorative
    ? ({ 'aria-hidden': true, role: 'presentation' } as const)
    : ({ role: 'img', 'aria-labelledby': `${titleId} ${descriptionId}` } as const);

  return (
    <svg
      className={cx(styles.root, animate && styles.animated, className)}
      viewBox={`0 0 ${String(geometry.viewBox.width)} ${String(geometry.viewBox.height)}`}
      /* Scale to the container, keep the proportions, sit on the bottom edge —
         the drawing is already anchored to its baseline by the generator. */
      preserveAspectRatio="xMidYMax meet"
      /* IE-era default that still makes SVGs a tab stop in some browsers. */
      focusable="false"
      {...accessibilityProps}
    >
      {!decorative && (
        <>
          <title id={titleId}>{`${specimen.commonName} (${specimen.scientificName})`}</title>
          <desc id={descriptionId}>{description}</desc>
        </>
      )}

      <g className={styles.stems}>
        {geometry.stems.map((stem, index) => (
          <path
            // Index is a stable identity here: the geometry is regenerated
            // wholesale and never reordered or spliced.
            key={`stem-${String(index)}`}
            className={styles.stem}
            d={toPathData(stem.commands)}
            strokeWidth={stem.width}
            /* The generator measures each segment so the draw-on animation has a
               length without the CSS needing to ask the DOM for one. */
            strokeDasharray={stem.length}
            strokeDashoffset={animate ? stem.length : 0}
          />
        ))}
      </g>

      <g className={styles.leaves}>
        {geometry.leaves.map((leaf, index) => (
          <path
            key={`leaf-${String(index)}`}
            className={styles.leaf}
            d={toPathData(leaf.commands)}
          />
        ))}
      </g>

      <g className={styles.flowers}>
        {geometry.flowers.map((flower, index) => (
          <g key={`flower-${String(index)}`}>
            {flower.petals.map((petal, petalIndex) => (
              <circle
                key={`petal-${String(petalIndex)}`}
                className={styles.petal}
                cx={petal.x}
                cy={petal.y}
                r={flower.petalRadius}
              />
            ))}
            <circle
              className={styles.core}
              cx={flower.center.x}
              cy={flower.center.y}
              r={flower.coreRadius}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
