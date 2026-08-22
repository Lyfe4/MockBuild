import { growBranches, type BranchNode } from './branch';
import { placeFlowers } from './flower';
import { placeLeaves } from './leaf';
import { commandPoints, cubicLength, curveTo, mapCommands, moveTo } from './path';
import { clamp, hashString, mulberry32 } from './prng';
import {
  VIEW_BOX,
  type FlowerMark,
  type LeafMark,
  type PathCommand,
  type PlantForm,
  type PlantGeometry,
  type Point,
  type StemMark,
} from './types';

/**
 * Composes the whole plant and fits it to the canvas.
 *
 * Order matters and is part of the reproducibility contract: branches, then
 * leaves, then flowers, each drawing from the same RNG in sequence. Reordering
 * these three calls would change every illustration in the archive.
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
    branchCount: clamp(Math.round(form.branchCount), 1, 5),
    branchDepth: clamp(Math.round(form.branchDepth), 0, 5),
    branchAngle: clamp(form.branchAngle, 5, 60),
    stemCurve: clamp(form.stemCurve, -0.6, 0.6),
    leafShape: form.leafShape,
    leafDensity: clamp(form.leafDensity, 0, 1),
    flowerType: form.flowerType,
    flowerSize: clamp(form.flowerSize, 0.4, 2),
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

const EMPTY_BOUNDS: Bounds = {
  minX: Infinity,
  minY: Infinity,
  maxX: -Infinity,
  maxY: -Infinity,
};

function extend(bounds: Bounds, point: Point, margin = 0): void {
  bounds.minX = Math.min(bounds.minX, point.x - margin);
  bounds.minY = Math.min(bounds.minY, point.y - margin);
  bounds.maxX = Math.max(bounds.maxX, point.x + margin);
  bounds.maxY = Math.max(bounds.maxY, point.y + margin);
}

/**
 * Converts a branch node into a drawable stem, still in plant space.
 *
 * Length is measured here, before the fit transform, then scaled with
 * everything else — cheaper than re-measuring the transformed curve and exactly
 * equivalent under a uniform scale.
 */
function toStem(node: BranchNode): {
  commands: PathCommand[];
  width: number;
  depth: number;
  length: number;
} {
  return {
    commands: [moveTo(node.start.x, node.start.y), curveTo(node.control1, node.control2, node.end)],
    width: node.width,
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

  const nodes = growBranches(safeForm, rng);
  const leaves = placeLeaves(nodes, safeForm, rng);
  const flowers = placeFlowers(nodes, safeForm, rng);

  const stems = nodes.map(toStem);

  /**
   * Measure everything, including flower radii and leaf control points, so the
   * fit accounts for the drawing's true extent rather than just its skeleton.
   * Control points can sit outside the curve they steer, which is fine: it only
   * makes the fit slightly conservative, never clipped.
   */
  const bounds: Bounds = { ...EMPTY_BOUNDS };

  for (const stem of stems) {
    for (const point of commandPoints(stem.commands)) extend(bounds, point, stem.width / 2);
  }
  for (const leaf of leaves) {
    for (const point of commandPoints(leaf.commands)) extend(bounds, point);
  }
  for (const flower of flowers) {
    extend(bounds, flower.center, flower.petalRadius);
    for (const petal of flower.petals) extend(bounds, petal, flower.petalRadius);
  }

  // A form with no stems at all is not reachable — growBranches always emits the
  // base node — but an empty bounds would produce NaN, so fail loudly instead.
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

  // Centred horizontally, and sitting on the bottom padding line: plants grow
  // from the ground, so anchoring the base looks right where centring does not.
  const offsetX = (VIEW_BOX.width - drawnWidth) / 2;
  const baseline = VIEW_BOX.height - PADDING - (availableHeight - drawnHeight) / 2;

  /** Plant space (+y up) to canvas space (+y down), scaled and positioned. */
  function toCanvas(point: Point): Point {
    return {
      x: offsetX + (point.x - bounds.minX) * factor,
      y: baseline - (point.y - bounds.minY) * factor,
    };
  }

  const fittedStems: StemMark[] = stems.map((stem) => ({
    kind: 'stem',
    commands: mapCommands(stem.commands, toCanvas),
    width: Math.max(0.4, stem.width * factor),
    depth: stem.depth,
    length: stem.length * factor,
  }));

  const fittedLeaves: LeafMark[] = leaves.map((leaf) => ({
    kind: 'leaf',
    shape: leaf.shape,
    commands: mapCommands(leaf.commands, toCanvas),
  }));

  const fittedFlowers: FlowerMark[] = flowers.map((flower) => ({
    kind: 'flower',
    center: toCanvas(flower.center),
    coreRadius: flower.coreRadius * factor,
    petalRadius: flower.petalRadius * factor,
    petals: flower.petals.map(toCanvas),
  }));

  return {
    viewBox: { width: VIEW_BOX.width, height: VIEW_BOX.height },
    stems: fittedStems,
    leaves: fittedLeaves,
    flowers: fittedFlowers,
  };
}
