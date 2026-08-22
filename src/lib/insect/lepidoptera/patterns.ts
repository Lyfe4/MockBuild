import { randomBetween, type Rng } from '@/lib/random';

import type { InsectMark, PathCommand } from '../core';
import { closePath, lineTo, moveTo } from '../core';
import type { MothForm, WingPattern } from './types';
import { WING_PATTERNS } from './types';
import {
  clampAcross,
  offsetAt,
  outerEdgeAt,
  toMothSpace,
  widestOffset,
  type WingPlacement,
  type WingProfile,
} from './wings';

/**
 * What is painted on the wings.
 *
 * Five layers — dusting, a marginal band, an apex patch, a discal spot and an
 * eyespot — of which a given specimen carries between one and three. Which
 * layers those are is more of what tells two families apart than how many spots
 * either has, which is why the preset names a set and the seed picks from it
 * rather than every moth getting the same pattern at a different intensity.
 *
 * ## Staying on the wing
 *
 * Every pattern is placed in the wing's own `(u, v)` frame and sized against
 * the margin offsets at its own `u`, so it is inside the outline *by
 * construction* — no polygon intersection, and the geometry is correct on its
 * own rather than only after the renderer clips it. Clipping is still applied
 * on top, because a straight sample between two profile points cannot follow a
 * curved margin exactly and an eyespot near the edge would otherwise clear it
 * by a hair.
 *
 * `INSET` is the margin of safety: patterns use this fraction of the space
 * actually available, which is what keeps them clear of a scalloped edge.
 */
const INSET = 0.82;

/** The clip surface a wing's patterns belong to. Mirrored with them. */
export function wingClip(wing: 'forewing' | 'hindwing'): string {
  return `${wing}-right`;
}

interface PatternContext {
  readonly form: MothForm;
  readonly profile: WingProfile;
  readonly placement: WingPlacement;
  readonly clipTo: string;
}

function pointCommand(placement: WingPlacement, u: number, v: number, start: boolean) {
  const point = toMothSpace(placement, u, v);

  return start ? moveTo(point.x, point.y) : lineTo(point.x, point.y);
}

/** A closed pigment shape on the wing. Every painted layer ends up here. */
function painted(context: PatternContext, commands: readonly PathCommand[]): InsectMark {
  return {
    kind: 'path',
    part: 'marking',
    side: 'right',
    clipTo: context.clipTo,
    commands,
    closed: true,
    weight: 'detail',
  };
}

/**
 * Bands that follow the outer edge.
 *
 * A band on a real wing runs *parallel to the margin* — it curves round the
 * apex with the edge and meets both margins square. Ruling it across the wing
 * at a constant distance from the base, which is what this did before, produces
 * a diagonal stripe: the one shape a lepidopterist would tell you is wrong.
 *
 * So each edge of a band is an offset curve of the outer edge. For every point
 * across the wing, `outerEdgeAt` says how far out the margin lies there, and
 * the band's edges are that curve stepped inwards by two fixed amounts. The
 * result follows a triangular forewing's swept trailing edge and a rounded
 * hindwing's arc without either being special-cased.
 */
function marginalBands({ form, profile, placement, clipTo }: PatternContext): InsectMark[] {
  const count = Math.round(form.bandCount);

  if (count <= 0) return [];

  const marks: InsectMark[] = [];
  const samples = 14;

  /** Half the wing's span, either side, with the safety margin taken off. */
  const across = Math.min(widestOffset(profile.leading), widestOffset(profile.trailing)) * INSET;

  /** Band thickness in `u`, and the clear paper between one band and the next. */
  const thickness = 0.05 * form.bandWidth;
  const gap = thickness * 0.85;

  for (let i = 0; i < count; i += 1) {
    // First band just inside the margin, the rest stepping back from it.
    const outerInset = 0.07 + i * (thickness + gap);
    const innerInset = outerInset + thickness;

    /** One edge of the band, as the outer edge stepped in by `inset`. */
    const edge = (inset: number, forwards: boolean): { u: number; v: number }[] => {
      const points: { u: number; v: number }[] = [];

      for (let s = 0; s <= samples; s += 1) {
        const t = forwards ? s / samples : 1 - s / samples;
        const wanted = -across + t * across * 2;
        const margin = wanted >= 0 ? profile.leading : profile.trailing;

        // Never let a band run back past the wing base.
        const u = Math.max(0.12, outerEdgeAt(margin, wanted) - inset);

        /**
         * Then pull the point back onto the wing at *that* position.
         *
         * Stepping inwards along the wing does not always leave more room: a
         * wing is widest somewhere in the middle and narrows again towards its
         * attachment, so a band set far enough back runs off the edge at the
         * ends. Clamping here is what makes the inner bands shorter than the
         * outer ones, which is also what they do on a real wing.
         */
        points.push({ u, v: clampAcross(profile, u, wanted, INSET) });
      }

      return points;
    };

    const walk = [...edge(outerInset, true), ...edge(innerInset, false)];
    const first = walk[0];

    if (first === undefined) continue;

    marks.push(
      painted({ form, profile, placement, clipTo }, [
        pointCommand(placement, first.u, first.v, true),
        ...walk.slice(1).map(({ u, v }) => pointCommand(placement, u, v, false)),
        closePath,
      ]),
    );
  }

  return marks;
}

/**
 * A wedge of colour in the corner at the wing tip.
 *
 * Cut off by a straight chord between the two margins, which is exactly how an
 * apex patch looks on a wing: the colour stops on a line, and the line is what
 * makes it read as a marking rather than as a shaded tip.
 */
function apexPatch({ form, profile, placement, clipTo }: PatternContext): InsectMark[] {
  // How far back from the apex the patch reaches. Sized off the band width so
  // a specimen with broad markings has a broad patch too.
  const from = Math.max(0.6, 0.86 - 0.14 * form.bandWidth);
  /**
   * And how close to the tip it gets. Stopping short of the apex rather than
   * running to it: the last few percent of a wing is where the two margins
   * converge, and a patch drawn into that corner reads as a blunt tip rather
   * than as a marking.
   */
  const to = 0.93;
  const samples = 10;
  const commands: PathCommand[] = [];

  // Out along the leading margin from the chord towards the apex.
  for (let i = 0; i <= samples; i += 1) {
    const u = from + (i / samples) * (to - from);

    commands.push(pointCommand(placement, u, offsetAt(profile.leading, u) * INSET, i === 0));
  }

  // Back along the trailing margin, but only part of the way across: an apex
  // patch sits in the corner, not right over the wing.
  for (let i = samples; i >= 0; i -= 1) {
    const u = from + (i / samples) * (to - from);

    commands.push(pointCommand(placement, u, -offsetAt(profile.trailing, u) * INSET * 0.35, false));
  }

  commands.push(closePath);

  return [painted({ form, profile, placement, clipTo }, commands)];
}

/**
 * One solid mark in the middle of the wing, where the discal cell is.
 *
 * The commonest marking on a moth and the plainest: a single kidney-shaped spot
 * halfway out, on the axis. Drawn as a dot rather than an outline because at
 * plate size that is all it is.
 */
function discalSpot({ form, profile, placement, clipTo }: PatternContext): InsectMark[] {
  const u = 0.52;
  const available = Math.min(offsetAt(profile.leading, u), offsetAt(profile.trailing, u)) * INSET;

  if (available <= 0) return [];

  const radius = Math.min(0.1 * form.bandWidth, available * 0.55) * placement.chord;

  return [
    {
      kind: 'dot',
      part: 'marking',
      side: 'right',
      clipTo,
      center: toMothSpace(placement, u, 0),
      radius,
    },
  ];
}

/**
 * Eyespots: concentric rings around a pale centre.
 *
 * Built outwards in the order an engraver would lay them down — the deep ring
 * that holds the edge, the pigment field inside it, then bare paper at the
 * centre, and a dark pupil on top if the specimen has one. The pale centre is
 * the whole trick: an eyespot without one is a blot, and with one it looks back
 * at you.
 *
 * Rings rather than stacked discs for the outer bands, so the paper shows
 * between them.
 */
function eyespots({ form, profile, placement, clipTo }: PatternContext): InsectMark[] {
  const count = Math.round(form.eyespotCount);
  const rings = Math.max(1, Math.round(form.eyespotRings));
  const marks: InsectMark[] = [];

  for (let i = 0; i < count; i += 1) {
    const u = count === 1 ? 0.56 : 0.4 + (i / (count - 1)) * 0.34;

    // The space actually available across the wing at this point.
    const available = Math.min(offsetAt(profile.leading, u), offsetAt(profile.trailing, u)) * INSET;

    if (available <= 0) continue;

    // Shrink to fit rather than clamp the position: an eyespot pushed off its
    // own centre to fit reads as a mistake, a slightly smaller one does not.
    const outer = Math.min(form.eyespotSize * 0.2, available * 0.94) * placement.chord;
    const centre = toMothSpace(placement, u, 0);

    const disc = (radius: number, tone: 'pigment' | 'pale' | 'ink'): InsectMark => ({
      kind: 'dot',
      part: 'marking',
      side: 'right',
      tone,
      clipTo,
      center: centre,
      radius,
    });

    // The rings, outermost first, in the deep tone so each holds its own edge.
    for (let ring = rings; ring >= 1; ring -= 1) {
      marks.push({
        kind: 'dot',
        part: 'marking',
        side: 'right',
        tone: 'deep',
        clipTo,
        center: centre,
        radius: outer * (ring / rings),
        ring: outer * 0.13,
      });
    }

    // Pigment field, then paper, then the pupil if there is one.
    marks.push(disc(outer * 0.6, 'pigment'), disc(outer * 0.36, 'pale'));

    if (form.eyespotPupil) marks.push(disc(outer * 0.18, 'ink'));
  }

  return marks;
}

/** A field of fine dots — the scale dusting that mottles a geometrid's wing. */
function dusting(context: PatternContext, rng: Rng): InsectMark[] {
  const { form, profile, placement, clipTo } = context;
  const count = Math.round(10 + form.dustingDensity * 40);
  const marks: InsectMark[] = [];

  for (let i = 0; i < count; i += 1) {
    const u = randomBetween(rng, 0.12, 0.94);
    const leading = offsetAt(profile.leading, u) * INSET;
    const trailing = offsetAt(profile.trailing, u) * INSET;
    const v = randomBetween(rng, -trailing, leading);
    const point = toMothSpace(placement, u, v);

    marks.push({
      kind: 'dot',
      part: 'marking',
      side: 'right',
      clipTo,
      center: point,
      radius: placement.chord * 0.012,
    });
  }

  return marks;
}

/**
 * Hatching across the base of the wing.
 *
 * Where the wing meets the thorax it is thickly scaled and in shadow, and an
 * engraver says so with a few short strokes running across the grain. Ink and
 * the finest weight, like every other piece of surface description — it is not
 * a marking and must not take the pigment.
 */
function baseHatching(context: PatternContext, rng: Rng): InsectMark[] {
  const { form, profile, placement, clipTo } = context;
  const count = Math.round(form.hatching * 9);

  if (count === 0) return [];

  const marks: InsectMark[] = [];

  for (let i = 0; i < count; i += 1) {
    // The inner quarter only. Hatching that reached the middle of the wing
    // would be shading, and a specimen plate does not shade.
    const u = 0.1 + ((i + 0.5) / count) * 0.24;
    const leading = offsetAt(profile.leading, u) * INSET;
    const trailing = offsetAt(profile.trailing, u) * INSET;

    if (leading + trailing <= 0) continue;

    const from = -trailing * randomBetween(rng, 0.4, 0.85);
    const to = leading * randomBetween(rng, 0.4, 0.85);

    const start = toMothSpace(placement, u, from);
    const end = toMothSpace(placement, u + 0.02, to);

    marks.push({
      kind: 'path',
      part: 'hatch',
      side: 'right',
      clipTo,
      commands: [moveTo(start.x, start.y), lineTo(end.x, end.y)],
      closed: false,
      weight: 'detail',
    });
  }

  return marks;
}

/** Which builder draws each layer. */
const LAYERS: Record<WingPattern, (context: PatternContext, rng: Rng) => InsectMark[]> = {
  dusting: (context, rng) => dusting(context, rng),
  marginalBand: (context) => marginalBands(context),
  apexPatch: (context) => apexPatch(context),
  discalSpot: (context) => discalSpot(context),
  eyespot: (context) => eyespots(context),
};

/**
 * Every pattern on one wing, in the order they are painted.
 *
 * `WING_PATTERNS` order rather than the order the form happens to list them in:
 * painting order is a property of the layers, not of how a preset was written,
 * and dusting laid over an eyespot would speckle the thing it is supposed to sit
 * under.
 */
export function buildWingPatterns(
  form: MothForm,
  profile: WingProfile,
  placement: WingPlacement,
  clipTo: string,
  rng: Rng,
): InsectMark[] {
  const context: PatternContext = { form, profile, placement, clipTo };
  const chosen = new Set(form.patterns);
  const marks: InsectMark[] = [];

  // Hatching first: it describes the surface everything else is painted onto.
  marks.push(...baseHatching(context, rng));

  for (const layer of WING_PATTERNS) {
    if (!chosen.has(layer)) continue;

    marks.push(...LAYERS[layer](context, rng));
  }

  return marks;
}
