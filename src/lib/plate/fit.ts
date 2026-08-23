import { boundsOf, parsePathData, pathPoints, type PlatePoint } from './pathData';
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
 * whole, and a contact sheet of them reads as a grid of accidents.
 */
const MARGIN = 0.04;

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
 * The view box a plate should be drawn in.
 *
 * @param scale How much of the frame the animal fills, 0.3–1. Comes from the
 *   species record, where it is derived from real body length — which is the
 *   one number that carries true scale onto a sheet holding more than one
 *   species. At 1 the animal fills the frame; at 0.5 it occupies half of it and
 *   reads as half the size of its neighbour.
 */
export function plateViewBox(plate: SpeciesPlate, scale = 1): PlateViewBox {
  const bounds = boundsOf(platePoints(plate));

  if (bounds === undefined) {
    throw new Error(`the ${plate.species} plate has no geometry to frame`);
  }

  // Symmetric by construction, but measured rather than assumed: a plate that
  // is lopsided should be framed as it is and look wrong, not be quietly
  // recentred so the fault never surfaces.
  const half = Math.max(Math.abs(bounds.minX), bounds.maxX);
  const contentWidth = half * 2;
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 1);

  const usable = Math.min(Math.max(scale, 0.1), 1) * (1 - MARGIN * 2);

  const width = contentWidth / usable;
  const height = contentHeight / usable;

  return {
    minX: -width / 2,
    minY: bounds.minY - (height - contentHeight) / 2,
    width,
    height,
  };
}

/** The view box as the `viewBox` attribute's four numbers. */
export function viewBoxAttribute(box: PlateViewBox): string {
  const round = (value: number): string => String(Math.round(value * 100) / 100);

  return `${round(box.minX)} ${round(box.minY)} ${round(box.width)} ${round(box.height)}`;
}
