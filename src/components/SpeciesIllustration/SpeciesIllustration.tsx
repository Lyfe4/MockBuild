import { useId, useMemo } from 'react';

import { cx } from '@/lib/classNames';
import {
  describePlate,
  plateViewBox,
  viewBoxAttribute,
  type PlateFill,
  type PlatePart,
  type PlatePartId,
  type PlateRank,
  type SpeciesPlate,
} from '@/lib/plate';
import type { Species } from '@/types';

import styles from './SpeciesIllustration.module.css';

export interface SpeciesIllustrationProps {
  /** The record the plate was traced against. Supplies pigment, scale and alt text. */
  species: Species;
  /** The drawing. */
  plate: SpeciesPlate;
  /**
   * The accessible name.
   *
   * Defaults to the binomial. Pass one only where the surrounding text already
   * says the name and something else would be more use.
   */
  title?: string | undefined;
  animate?: boolean | undefined;
  decorative?: boolean | undefined;
  className?: string | undefined;
}

/** The class that carries each rank of the line hierarchy. */
const RANK_CLASS: Record<PlateRank, string | undefined> = {
  outline: styles.rankOutline,
  structure: styles.rankStructure,
  detail: styles.rankDetail,
};

/** The class that fills each role. Widths and colours both live in the CSS. */
const FILL_CLASS: Record<PlateFill, string | undefined> = {
  none: styles.fillNone,
  surface: styles.fillSurface,
  pigment: styles.fillPigment,
  'pigment-deep': styles.fillDeep,
  ink: styles.fillInk,
};

/** `Genus species` — the name a plate is captioned with. */
function binomial(species: Species): string {
  return `${species.taxonomy.genus} ${species.taxonomy.species}`;
}

/**
 * Renders a hand-authored species plate as inline SVG.
 *
 * Takes a record and a plate and nothing else, so it never learns what a
 * mandible is: the plate says which part each path draws, how heavily to cut
 * it, and what fills it, and this maps those three roles onto classes. Adding a
 * species touches `data/species` and no component.
 *
 * ## Mirroring
 *
 * The plate holds the right half. This draws it twice — once as authored, once
 * inside a `<g transform="scale(-1,1)">` — rather than through a `<use>` of a
 * defined half. Both work, and duplication was chosen for the clipping: a
 * `clip-path` on an element inside the mirrored group resolves in that group's
 * own user space, so the same clip path serves both halves and the hatching on
 * the left elytron is confined by the left elytron without a second definition.
 * Through `<use>` the same thing happens in a shadow tree, where it is true but
 * unreadable and untestable.
 *
 * Parts declaring `mirror: false` straddle the axis and are drawn once, after
 * both halves, so the scutellum and the pronotal grooves sit over the seam
 * rather than being reflected into a doubled line.
 *
 * ## Colour
 *
 * The pigment index travels as a `data-pigment` attribute and the stylesheet
 * maps it onto the `--pigment-N` tokens — an attribute rather than a custom
 * property written onto the element, because writing one needs a `style`
 * attribute and `style-src 'self'` forbids it. Everything here is presentation
 * attributes and classes; there is not an inline style in the tree.
 */
export function SpeciesIllustration({
  species,
  plate,
  title,
  animate = false,
  decorative = false,
  className,
}: SpeciesIllustrationProps) {
  const titleId = useId();
  const descriptionId = useId();
  const clipPrefix = useId();

  const viewBox = useMemo(
    () => viewBoxAttribute(plateViewBox(plate, species.scale)),
    [plate, species.scale],
  );

  const description = useMemo(
    () =>
      describePlate(species, {
        sex: plate.sex,
        ...(plate.hallmark === undefined ? {} : { hallmark: plate.hallmark }),
      }),
    [species, plate.sex, plate.hallmark],
  );

  /**
   * One clip region per surface anything is clipped to.
   *
   * Built from every path carrying that part id, so a surface drawn in more
   * than one piece still clips as one region.
   */
  const surfaces = useMemo(() => {
    const referenced = new Set<PlatePartId>();

    for (const part of plate.parts) {
      if (part.clipTo !== undefined) referenced.add(part.clipTo);
    }

    return [...referenced].map((id) => ({
      id,
      paths: plate.parts.filter((part) => part.id === id).map((part) => part.d),
    }));
  }, [plate.parts]);

  const accessibilityProps = decorative
    ? ({ 'aria-hidden': true, role: 'presentation' } as const)
    : ({ role: 'img', 'aria-labelledby': `${titleId} ${descriptionId}` } as const);

  const clipId = (surface: PlatePartId): string => `${clipPrefix}-${surface}`;

  const renderPart = (part: PlatePart, index: number) => (
    <path
      key={`${part.id}-${String(index)}`}
      className={cx(styles.part, RANK_CLASS[part.rank], FILL_CLASS[part.fill])}
      d={part.d}
      {...(part.clipTo === undefined ? {} : { clipPath: `url(#${clipId(part.clipTo)})` })}
    />
  );

  const half = plate.parts.filter((part) => part.mirror !== false);
  const midline = plate.parts.filter((part) => part.mirror === false);

  return (
    <svg
      className={cx(styles.root, animate && styles.animated, className)}
      viewBox={viewBox}
      data-pigment={String(species.pigment)}
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
      {...accessibilityProps}
    >
      {!decorative && (
        <>
          <title id={titleId}>{title ?? binomial(species)}</title>
          <desc id={descriptionId}>{description}</desc>
        </>
      )}

      <defs>
        {surfaces.map((surface) => (
          <clipPath key={surface.id} id={clipId(surface.id)}>
            {surface.paths.map((d, index) => (
              <path key={index} d={d} />
            ))}
          </clipPath>
        ))}
      </defs>

      {/* The authored half, then its reflection. */}
      <g>{half.map(renderPart)}</g>
      <g transform="scale(-1,1)">{half.map(renderPart)}</g>

      {/* On the axis, and drawn once, over the seam the two halves make. */}
      <g>{midline.map(renderPart)}</g>
    </svg>
  );
}
