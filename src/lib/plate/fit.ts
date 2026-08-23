import { boundsOf, parsePathData, pathPoints, type PlateBounds, type PlatePoint } from './pathData';
import type { SpeciesPlate } from './types';

/**
 * Sizing the frame a plate is drawn in.
 *
 * The generator fitted its animal to a fixed view box; a plate does the
 * opposite, and has to. A stag beetle with its legs thrown forward is more than
 * twice as wide as its body and a third longer, and no fixed frame chosen for
 * one species will suit the next — so the frame is measured from the drawing.
 *
 * Two rules carried over from `composeAndFit`, because both were right:
 *
 * - **Centred on the midline, not on the bounding box.** These are not the same
 *   thing. One antenna sweeping further than its reflection reaches the other
 *   way would, under bounding-box centring, shift the whole animal sideways to
 *   compensate. Mapping x = 0 to the middle of the frame keeps the axis of
 *   symmetry where the eye expects it, which is what a pinned plate looks like.
 * - **The frame moves, the drawing does not.** Scale is applied by growing the
 *   frame around the animal rather than by shrinking the animal inside it, so a
 *   species drawn small keeps every stroke width it had when drawn large.
 */

/** An SVG view box, as its four numbers. */
export interface PlateViewBox {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Breathing room around the animal, as a fraction of its longer side.
 *
 * A specimen touching the edge of its frame reads as cropped even when it is
 * whole, and a contact sheet of them reads as a grid of accidents. One fraction
 * of one number — the longer side — rather than a fraction of each axis, so the
 * margin is the same distance all the way round and a long thin animal does not
 * end up with a wide gap at its head and a hairline at its shoulder.
 */
const MARGIN = 0.04;

/**
 * How far the ink spreads past the geometry, in plate units.
 *
 * A path is a centreline and the stroke straddles it, so the heaviest rank puts
 * half its width outside every coordinate in the data. `--plate-stroke-outline`
 * is 8, so 4 — kept as a constant here rather than read from the stylesheet,
 * because the fit runs where there is no stylesheet, and a plate framed
 * differently in the test run and the browser would be worse than one framed a
 * little loosely in both.
 */
const STROKE_ALLOWANCE = 4;

/**
 * Every point of a plate, with the reflected halves included.
 *
 * The frame has to be measured against what will actually be drawn, and half
 * of what will be drawn does not exist in the data yet.
 */
export function platePoints(plate: SpeciesPlate): PlatePoint[] {
  const points: PlatePoint[] = [];

  for (const part of plate.parts) {
    const own = pathPoints(parsePathData(part.d));

    points.push(...own);

    // Midline parts are drawn once; everything else arrives in a pair.
    if (part.mirror !== false) {
      for (const point of own) points.push({ x: -point.x, y: point.y });
    }
  }

  return points;
}

/**
 * The bounding box of everything the renderer will draw.
 *
 * Both halves, every part, grown by the stroke allowance. Bézier control points
 * count: a curve never leaves the hull of its control points, so bounding the
 * points bounds the curve — loosely, and always outwards, which is the only
 * direction it is safe to be wrong in.
 *
 * Throws on an empty plate rather than returning an inverted box, because an
 * inverted box propagates into a view box that renders as nothing at all.
 */
export function plateBounds(plate: SpeciesPlate): PlateBounds {
  const measured = boundsOf(platePoints(plate));

  if (measured === undefined) {
    throw new Error(`the ${plate.species} plate has no geometry to frame`);
  }

  return {
    minX: measured.minX - STROKE_ALLOWANCE,
    minY: measured.minY - STROKE_ALLOWANCE,
    maxX: measured.maxX + STROKE_ALLOWANCE,
    maxY: measured.maxY + STROKE_ALLOWANCE,
  };
}

/**
 * The view box a plate is drawn in: its own bounds, plus a margin.
 *
 * The width is taken from the wider of the two halves and doubled, so the frame
 * stays centred on x = 0 whatever the drawing does — see the note at the top of
 * this file. The height is the measured height and nothing else. Everything the
 * renderer will draw is therefore inside the box by at least `MARGIN` of the
 * longer side, and `SpeciesIllustration` can hand the result straight to
 * `preserveAspectRatio="xMidYMid meet"` without the drawing touching an edge.
 *
 * `scale` shrinks the animal relative to its neighbours by growing the frame
 * around it — a 25 mm ladybird beside a 75 mm stag beetle — and is clamped, so
 * a record carrying a nonsensical value gets a plain frame instead of a
 * division by zero.
 */
export function plateViewBox(plate: SpeciesPlate, scale = 1): PlateViewBox {
  const bounds = plateBounds(plate);

  // Centred on the midline: the frame is as wide as the wider half, twice.
  const half = Math.max(Math.abs(bounds.minX), bounds.maxX);
  const contentWidth = half * 2;
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 1);

  const margin = MARGIN * Math.max(contentWidth, contentHeight);
  const zoom = Math.min(Math.max(scale, 0.1), 1);
  const width = (contentWidth + margin * 2) / zoom;
  const height = (contentHeight + margin * 2) / zoom;

  return {
    minX: -width / 2,
    minY: bounds.minY - (height - contentHeight) / 2,
    width,
    height,
  };
}

/** The four numbers, as the attribute wants them. */
export function viewBoxAttribute(box: PlateViewBox): string {
  const round = (value: number): string => String(Math.round(value * 100) / 100);

  return `${round(box.minX)} ${round(box.minY)} ${round(box.width)} ${round(box.height)}`;
}
