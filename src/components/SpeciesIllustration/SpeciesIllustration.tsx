import { useId, useMemo } from 'react';

import { cx } from '@/lib/classNames';
import {
  describePlate,
  plateViewBox,
  viewBoxAttribute,
  type PlateFill,
  type PlateOpacity,
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

/**
 * The class that makes a wing a window.
 *
 * `solid` resolves to nothing: it is the default treatment and adding a class
 * that sets `fill-opacity: 1` would only give the cascade something to fight
 * over. Only `membrane` carries one.
 */
const OPACITY_CLASS: Record<PlateOpacity, string | undefined> = {
  solid: undefined,
  membrane: styles.membrane,
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
 * ## Mirroring, and stacking
 *
 * The plate holds the right half. Each mirrored part is drawn twice — once as
 * authored, once with `transform="scale(-1,1)"` — rather than through a `<use>`
 * of a defined half. Both work, and duplication was chosen for the clipping: a
 * `clip-path` on a transformed element resolves in that element's own user
 * space, so one clip definition serves both halves and the hatching on the left
 * elytron is confined by the left elytron. Through `<use>` the same thing
 * happens in a shadow tree, where it is true but unreadable and untestable.
 *
 * Parts declaring `mirror: false` straddle the axis and are drawn once, so the
 * scutellum and the pronotal grooves sit over the seam rather than being
 * reflected into a doubled line.
 *
 * **The array is the stacking.** A part and its reflection are emitted where
 * the part sits in `plate.parts`, and nothing is grouped or sorted. An earlier
 * version drew all the mirrored parts and then all the midline ones, which
 * quietly made it impossible for anything mirrored to sit on top of anything on
 * the axis — a beetle's pronotal hatching went under its own pronotum and
 * disappeared, and the plate looked merely plain rather than broken.
 *
 * ## Membranous wings
 *
 * A dragonfly's four wings overlap each other and the abdomen. Painting them
 * opaque would hide the animal behind itself, so a part may declare
 * `opacity: 'membrane'` and get a `fill-opacity` — the one place in the project
 * where a fill is composited rather than mixed, and deliberately so, because
 * here the thing behind it is the point. `validatePlate` rejects the flag on
 * anything that is not a wing.
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

  const renderPart = (part: PlatePart, index: number, reflected = false) => (
    <path
      key={`${part.id}-${String(index)}${reflected ? '-r' : ''}`}
      className={cx(
        styles.part,
        RANK_CLASS[part.rank],
        FILL_CLASS[part.fill],
        OPACITY_CLASS[part.opacity ?? 'solid'],
      )}
      d={part.d}
      {...(reflected ? { transform: 'scale(-1,1)' } : {})}
      {...(part.clipTo === undefined ? {} : { clipPath: `url(#${clipId(part.clipTo)})` })}
    />
  );

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

      {/*
        In authored order: each part, then its reflection immediately after, so
        the array is the stacking for both halves at once.
      */}
      <g>
        {plate.parts.flatMap((part, index) =>
          part.mirror === false
            ? [renderPart(part, index)]
            : [renderPart(part, index), renderPart(part, index, true)],
        )}
      </g>
    </svg>
  );
}
