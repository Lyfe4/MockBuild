import { clamp, hashString, jitter, mulberry32, randomBetween, type Rng } from '@/lib/random';

import { buildElytra } from './elytra';
import { buildHead } from './head';
import { buildLegs } from './legs';
import { buildMarkings } from './markings';
import { metricsFor } from './metrics';
import { commandPoints, mapCommands, mirrorCommands, mirrorPoint } from './path';
import { buildThorax } from './thorax';
import {
  VIEW_BOX,
  type BeetleForm,
  type BeetleGeometry,
  type BeetleMark,
  type Point,
} from './types';

/**
 * Composes the beetle, mirrors it and fits it to the canvas.
 *
 * The build order is part of the reproducibility contract: head, thorax,
 * elytra, markings, legs, each drawing from the same RNG in sequence.
 * Reordering these calls changes every beetle.
 */

/** Padding inside `VIEW_BOX`, in canvas units, at `scale` 1. */
const PADDING = 8;

/** Turns any string — a preset name, an id — into a seed. */
export function seedFromName(name: string): number {
  return hashString(name);
}

function normaliseForm(form: BeetleForm): BeetleForm {
  return {
    bodyLength: clamp(form.bodyLength, 0.6, 1),
    bodyWidth: clamp(form.bodyWidth, 0.4, 1.2),
    headWidth: clamp(form.headWidth, 0.3, 1),
    eyeSize: clamp(form.eyeSize, 0.2, 1),
    antennaType: form.antennaType,
    antennaLength: clamp(form.antennaLength, 0.3, 1.6),
    mandibleSize: clamp(form.mandibleSize, 0, 1.5),
    pronotumShape: form.pronotumShape,
    pronotumWidth: clamp(form.pronotumWidth, 0.5, 1.2),
    pronotumRidge: form.pronotumRidge,
    horn: form.horn,
    hornLength: clamp(form.hornLength, 0.2, 1),
    elytraLength: clamp(form.elytraLength, 0.5, 1),
    elytraWidth: clamp(form.elytraWidth, 0.5, 1.2),
    elytraTaper: clamp(form.elytraTaper, 0, 1),
    striaeCount: clamp(Math.round(form.striaeCount), 0, 10),
    punctures: form.punctures,
    legLength: clamp(form.legLength, 0.5, 1.4),
    femurThickness: clamp(form.femurThickness, 0.4, 1.4),
    legSpread: clamp(form.legSpread, 0, 1),
    tibialSpines: form.tibialSpines,
    marking: form.marking,
    markingCount: clamp(Math.round(form.markingCount), 1, 8),
    markingSize: clamp(form.markingSize, 0.3, 1.5),
    scale: clamp(form.scale, 0.5, 1),
  };
}

/**
 * How far an individual may deviate from its preset, as a fraction.
 *
 * Small on purpose. A beetle's body plan is far more constrained than a plant's
 * — two of a species look alike in a way that two shrubs never do — so the
 * variation has to read as *this individual* rather than as a different animal.
 * Past about 12% a preset stops holding together as a kind.
 */
const INDIVIDUAL_VARIATION = 0.08;

/**
 * Gives each seed its own specimen rather than the same diagram again.
 *
 * Without this the seed reaches only the details that consume randomness
 * downstream — a club's radius, a tibia's angle — and a sheet of sixteen
 * beetles from sixteen seeds renders as four drawings repeated four times.
 * Nudging the *proportions* is what makes each one an individual.
 *
 * Only the continuous parameters move. The categorical ones — antenna type,
 * pronotum shape, marking type — are what define the preset, and rolling those
 * would produce a different beetle rather than a different specimen. Spot count
 * is the one exception: real ladybirds vary in it, and it reads as individual
 * rather than as a change of kind.
 */
function varyForm(form: BeetleForm, rng: Rng): BeetleForm {
  const vary = (value: number): number => value * jitter(rng, INDIVIDUAL_VARIATION);

  return {
    ...form,
    bodyLength: vary(form.bodyLength),
    bodyWidth: vary(form.bodyWidth),
    headWidth: vary(form.headWidth),
    eyeSize: vary(form.eyeSize),
    antennaLength: vary(form.antennaLength),
    mandibleSize: vary(form.mandibleSize),
    pronotumWidth: vary(form.pronotumWidth),
    hornLength: vary(form.hornLength),
    elytraLength: vary(form.elytraLength),
    elytraWidth: vary(form.elytraWidth),
    elytraTaper: vary(form.elytraTaper),
    legLength: vary(form.legLength),
    femurThickness: vary(form.femurThickness),
    legSpread: vary(form.legSpread),
    markingCount:
      form.marking === 'spots'
        ? form.markingCount + Math.round(randomBetween(rng, -1.49, 1.49))
        : form.markingCount,
    markingSize: vary(form.markingSize),
  };
}

/**
 * Reflects a right-hand mark into its left-hand counterpart.
 *
 * This is the entire symmetry mechanism. Every paired part is authored once, on
 * the right, and passed through here — so a beetle cannot come out lopsided
 * unless the reflection itself is wrong, which the mirror test covers.
 */
function mirrorMark(mark: BeetleMark): BeetleMark {
  if (mark.kind === 'dot') {
    return { ...mark, side: 'left', center: mirrorPoint(mark.center) };
  }

  return { ...mark, side: 'left', commands: mirrorCommands(mark.commands) };
}

/** Every point a mark occupies, including the extent of a dot's radius. */
function markPoints(mark: BeetleMark): Point[] {
  if (mark.kind === 'dot') {
    return [
      { x: mark.center.x - mark.radius, y: mark.center.y - mark.radius },
      { x: mark.center.x + mark.radius, y: mark.center.y + mark.radius },
    ];
  }

  return commandPoints(mark.commands);
}

/**
 * Generates the geometry for one beetle.
 *
 * Deterministic: the same `(form, seed)` always produces a deeply equal result.
 */
export function generateBeetle(form: BeetleForm, seed: number): BeetleGeometry {
  const rng = mulberry32(seed);

  // Vary, then clamp: an individual's deviation must not carry a parameter out
  // of the range the drawing was tuned for.
  const safeForm = normaliseForm(varyForm(normaliseForm(form), rng));
  const metrics = metricsFor(safeForm);

  const authored: BeetleMark[] = [
    ...buildHead(safeForm, metrics, rng),
    ...buildThorax(safeForm, metrics),
    ...buildElytra(safeForm, metrics, rng),
    ...buildMarkings(safeForm, metrics, rng),
    ...buildLegs(safeForm, metrics, rng),
  ];

  /**
   * Mirror. Marks on the midline are already symmetric in themselves and are
   * emitted once; everything else was authored on the right and gets a left.
   */
  const mirrored: BeetleMark[] = [];

  for (const mark of authored) {
    mirrored.push(mark);

    if (mark.side === 'right') mirrored.push(mirrorMark(mark));
  }

  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

  for (const mark of mirrored) {
    for (const point of markPoints(mark)) {
      bounds.minX = Math.min(bounds.minX, point.x);
      bounds.minY = Math.min(bounds.minY, point.y);
      bounds.maxX = Math.max(bounds.maxX, point.x);
      bounds.maxY = Math.max(bounds.maxY, point.y);
    }
  }

  if (!Number.isFinite(bounds.minX)) {
    throw new Error('generateBeetle produced no geometry to fit');
  }

  const contentWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 1);

  const availableWidth = (VIEW_BOX.width - PADDING * 2) * safeForm.scale;
  const availableHeight = (VIEW_BOX.height - PADDING * 2) * safeForm.scale;

  const factor = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);

  /**
   * Centred on the midline rather than on the content's bounding box.
   *
   * These are not the same thing and the difference is the whole point: an
   * antenna that happens to sweep further right than its mirror image reaches
   * left would, under a bounding-box centring, shift the *animal* off centre to
   * compensate. Mapping `x = 0` to the middle of the frame keeps the axis of
   * symmetry where the eye expects it, which is what a pinned plate looks like.
   */
  const centreX = VIEW_BOX.width / 2;
  const drawnHeight = contentHeight * factor;
  const offsetY = (VIEW_BOX.height - drawnHeight) / 2;

  function toCanvas(point: Point): Point {
    return {
      x: centreX + point.x * factor,
      y: offsetY + (point.y - bounds.minY) * factor,
    };
  }

  const fitted: BeetleMark[] = mirrored.map((mark) =>
    mark.kind === 'dot'
      ? { ...mark, center: toCanvas(mark.center), radius: mark.radius * factor }
      : { ...mark, commands: mapCommands(mark.commands, toCanvas), width: mark.width * factor },
  );

  return { viewBox: { width: VIEW_BOX.width, height: VIEW_BOX.height }, marks: fitted };
}
