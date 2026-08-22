import { growBranches, growRoots, type BranchNode } from './branch';
import { placeFlowers } from './flower';
import { placeLeaves } from './leaf';
import { commandPoints, cubicLength, mapCommands, taperedRibbon } from './path';
import { clamp, hashString, mulberry32 } from './prng';
import {
  VIEW_BOX,
  type FlowerMark,
  type LeafMark,
  type PathCommand,
  type PlantForm,
  type PlantGeometry,
  type Point,
  type SegmentMark,
} from './types';

/**
 * Composes the whole plant and fits it to the canvas.
 *
 * Order matters and is part of the reproducibility contract: branches, roots,
 * leaves, then flowers, each drawing from the same RNG in sequence. Reordering
 * these calls would change every illustration in the archive.
 */

/** Padding inside `VIEW_BOX`, in canvas units, at `scale` 1. */
const PADDING = 8;

/** Turns a catalogue number into the seed for its illustration. */
export function seedFromId(id: string): number {
  return hashString(id);
}

/**
 * Pulls a form into the ranges the drawing was tuned for.
 *
 * Clamping rather than throwing: a form arriving from a slider or a future CMS
 * should degrade to the nearest sensible plant, not blow up the page. The
 * documented ranges on `PlantForm` are these bounds.
 */
function normaliseForm(form: PlantForm): PlantForm {
  return {
    habit: form.habit,
    branchCount: clamp(Math.round(form.branchCount), 1, 5),
    branchDepth: clamp(Math.round(form.branchDepth), 0, 5),
    branchAngle: clamp(form.branchAngle, 5, 60),
    stemCurve: clamp(form.stemCurve, -0.6, 0.6),
    leafShape: form.leafShape,
    leafDensity: clamp(form.leafDensity, 0, 1),
    leafArrangement: form.leafArrangement,
    lobeCount: clamp(Math.round(form.lobeCount), 3, 9),
    flowerType: form.flowerType,
    flowerSize: clamp(form.flowerSize, 0.4, 2),
    petalCount: clamp(Math.round(form.petalCount), 4, 8),
    roots: form.roots,
    height: clamp(form.height, 0.3, 1),
    scale: clamp(form.scale, 0.5, 1),
  };
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function extend(bounds: Bounds, point: Point): void {
  bounds.minX = Math.min(bounds.minX, point.x);
  bounds.minY = Math.min(bounds.minY, point.y);
  bounds.maxX = Math.max(bounds.maxX, point.x);
  bounds.maxY = Math.max(bounds.maxY, point.y);
}

interface RawSegment {
  kind: 'stem' | 'root';
  commands: PathCommand[];
  width: number;
  tipWidth: number;
  depth: number;
  length: number;
}

/**
 * Converts a branch node into a drawable tapered ribbon, still in plant space.
 *
 * Because the outline already encloses the full width, the bounds pass needs no
 * stroke margin — what you measure is exactly what gets painted.
 */
function toSegment(node: BranchNode, kind: 'stem' | 'root'): RawSegment {
  return {
    kind,
    commands: taperedRibbon(
      node.start,
      node.control1,
      node.control2,
      node.end,
      node.width,
      node.tipWidth,
    ),
    width: node.width,
    tipWidth: node.tipWidth,
    depth: node.depth,
    length: cubicLength(node.start, node.control1, node.control2, node.end),
  };
}

/**
 * Generates the geometry for one plant.
 *
 * Deterministic: the same `(form, seed)` always produces a deeply equal result.
 *
 * @param form Habit parameters; clamped to their documented ranges.
 * @param seed Any 32-bit integer. Use `seedFromId` to derive one from a
 *   catalogue number so a specimen always draws the same.
 */
export function generatePlant(form: PlantForm, seed: number): PlantGeometry {
  const safeForm = normaliseForm(form);
  const rng = mulberry32(seed);

  const branchNodes = growBranches(safeForm, rng);
  const rootNodes = growRoots(safeForm, rng);
  const leaves = placeLeaves(branchNodes, safeForm, rng);
  const flowers = placeFlowers(branchNodes, safeForm, rng);

  const segments = [
    ...branchNodes.map((node) => toSegment(node, 'stem')),
    ...rootNodes.map((node) => toSegment(node, 'root')),
  ];

  /**
   * Measure everything, including flower petals and leaf control points, so the
   * fit accounts for the drawing's true extent. Control points can sit outside
   * the curve they steer, which is fine: it only makes the fit slightly
   * conservative, never clipped.
   */
  const bounds: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

  for (const segment of segments) {
    for (const point of commandPoints(segment.commands)) extend(bounds, point);
  }
  for (const leaf of leaves) {
    for (const point of commandPoints(leaf.commands)) extend(bounds, point);
  }
  for (const flower of flowers) {
    extend(bounds, {
      x: flower.center.x - flower.coreRadius,
      y: flower.center.y - flower.coreRadius,
    });
    extend(bounds, {
      x: flower.center.x + flower.coreRadius,
      y: flower.center.y + flower.coreRadius,
    });

    for (const petal of flower.petals) {
      for (const point of commandPoints(petal)) extend(bounds, point);
    }
  }

  // Not reachable — every habit emits at least one node — but an empty bounds
  // would silently produce NaN coordinates, so fail loudly instead.
  if (!Number.isFinite(bounds.minX)) {
    throw new Error('generatePlant produced no geometry to fit');
  }

  const contentWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 1);

  const availableWidth = (VIEW_BOX.width - PADDING * 2) * safeForm.scale;
  const availableHeight = (VIEW_BOX.height - PADDING * 2) * safeForm.scale;

  /**
   * A single uniform factor for both axes, so nothing is ever stretched. The
   * plant's own proportions decide whether it ends up filling the frame's width
   * or its height — which is what makes `height` read as a habit parameter
   * rather than as a zoom control.
   */
  const factor = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);

  const drawnWidth = contentWidth * factor;
  const drawnHeight = contentHeight * factor;

  // Centred horizontally, sitting on the bottom padding line. With roots drawn,
  // it is the root tips that meet the baseline rather than the stem base —
  // which is right: on a herbarium sheet the whole plant is the subject.
  const offsetX = (VIEW_BOX.width - drawnWidth) / 2;
  const baseline = VIEW_BOX.height - PADDING - (availableHeight - drawnHeight) / 2;

  /** Plant space (+y up) to canvas space (+y down), scaled and positioned. */
  function toCanvas(point: Point): Point {
    return {
      x: offsetX + (point.x - bounds.minX) * factor,
      y: baseline - (point.y - bounds.minY) * factor,
    };
  }

  const fitted: SegmentMark[] = segments.map((segment) => ({
    kind: segment.kind,
    commands: mapCommands(segment.commands, toCanvas),
    width: Math.max(0.3, segment.width * factor),
    tipWidth: Math.max(0.2, segment.tipWidth * factor),
    depth: segment.depth,
    length: segment.length * factor,
  }));

  const fittedLeaves: LeafMark[] = leaves.map((leaf) => ({
    kind: 'leaf',
    shape: leaf.shape,
    commands: mapCommands(leaf.commands, toCanvas),
    midrib: mapCommands(leaf.midrib, toCanvas),
  }));

  const fittedFlowers: FlowerMark[] = flowers.map((flower) => ({
    kind: 'flower',
    center: toCanvas(flower.center),
    coreRadius: flower.coreRadius * factor,
    petals: flower.petals.map((petal) => mapCommands(petal, toCanvas)),
  }));

  return {
    viewBox: { width: VIEW_BOX.width, height: VIEW_BOX.height },
    stems: fitted.filter((segment) => segment.kind === 'stem'),
    roots: fitted.filter((segment) => segment.kind === 'root'),
    leaves: fittedLeaves,
    flowers: fittedFlowers,
  };
}
