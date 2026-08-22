import { commandPoints, mapCommands, mirrorCommands, mirrorPoint } from './path';
import type { InsectGeometry, InsectMark, PathCommand, Point, ViewBox } from './types';

/**
 * Mirroring and fitting — the two steps every order finishes with.
 *
 * Shared because both must behave identically: a beetle and a moth on the same
 * plate have to be centred the same way and reflected by the same rule, or the
 * sheet reads as two different drawings rather than two specimens.
 */

/** Padding inside the view box, in canvas units, at `scale` 1. */
const PADDING = 8;

/**
 * Reflects a right-hand mark into its left-hand counterpart.
 *
 * This is the entire symmetry mechanism. Every paired part is authored once, on
 * the right, and passed through here — so an insect cannot come out lopsided
 * unless the reflection itself is wrong, which the mirror tests cover.
 *
 * `clipTo` is remapped alongside, so a pattern on the right wing is clipped to
 * the right wing after reflection rather than to its own original surface.
 */
function mirrorMark(mark: InsectMark): InsectMark {
  const clipTo = mark.clipTo === undefined ? undefined : mirrorClipName(mark.clipTo);
  const base = { side: 'left' as const, ...(clipTo === undefined ? {} : { clipTo }) };

  return mark.kind === 'dot'
    ? { ...mark, ...base, center: mirrorPoint(mark.center) }
    : { ...mark, ...base, commands: mirrorCommands(mark.commands) };
}

/** Clip surfaces are named `<surface>-<side>`; reflecting swaps the side. */
export function mirrorClipName(name: string): string {
  return name.endsWith('-right') ? `${name.slice(0, -6)}-left` : name;
}

/** Every point a mark occupies, including the extent of a dot's radius. */
export function markPoints(mark: InsectMark): Point[] {
  if (mark.kind === 'dot') {
    return [
      { x: mark.center.x - mark.radius, y: mark.center.y - mark.radius },
      { x: mark.center.x + mark.radius, y: mark.center.y + mark.radius },
    ];
  }

  return commandPoints(mark.commands);
}

export interface ComposeOptions {
  /** The canvas to fit into. */
  readonly viewBox: ViewBox;
  /** How much of it to fill, 0.5–1. */
  readonly scale: number;
  /**
   * Outlines to expose as clip paths, keyed by name, in insect space. Right-hand
   * surfaces are mirrored automatically, exactly as the marks are.
   */
  readonly clips?: Readonly<Record<string, readonly PathCommand[]>>;
}

/**
 * Mirrors the authored right-hand marks, then fits the whole animal to the
 * canvas.
 *
 * @param authored Marks in insect space. `right` marks get a `left` twin;
 *   `centre` marks are emitted once and must already be symmetric.
 */
export function composeAndFit(
  authored: readonly InsectMark[],
  options: ComposeOptions,
): InsectGeometry {
  const { viewBox, scale } = options;

  const mirrored: InsectMark[] = [];

  for (const mark of authored) {
    mirrored.push(mark);

    if (mark.side === 'right') mirrored.push(mirrorMark(mark));
  }

  /** Clip outlines are mirrored on the same rule, so they follow their marks. */
  const clipEntries: [string, readonly PathCommand[]][] = [];

  for (const [name, commands] of Object.entries(options.clips ?? {})) {
    clipEntries.push([name, commands]);

    if (name.endsWith('-right')) {
      clipEntries.push([mirrorClipName(name), mirrorCommands(commands)]);
    }
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
    throw new Error('composeAndFit received no geometry to fit');
  }

  const contentWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 1);

  const availableWidth = (viewBox.width - PADDING * 2) * scale;
  const availableHeight = (viewBox.height - PADDING * 2) * scale;

  const factor = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);

  /**
   * Centred on the midline rather than on the content's bounding box.
   *
   * These are not the same thing and the difference is the whole point: an
   * antenna sweeping further one way than its mirror reaches the other would,
   * under bounding-box centring, shift the *animal* sideways to compensate.
   * Mapping `x = 0` to the middle of the frame keeps the axis of symmetry where
   * the eye expects it, which is what a pinned plate looks like.
   */
  const centreX = viewBox.width / 2;
  const offsetY = (viewBox.height - contentHeight * factor) / 2;

  const toCanvas = (point: Point): Point => ({
    x: centreX + point.x * factor,
    y: offsetY + (point.y - bounds.minY) * factor,
  });

  const marks: InsectMark[] = mirrored.map((mark) =>
    mark.kind === 'dot'
      ? {
          ...mark,
          center: toCanvas(mark.center),
          radius: mark.radius * factor,
          ...(mark.ring === undefined ? {} : { ring: mark.ring * factor }),
        }
      : { ...mark, commands: mapCommands(mark.commands, toCanvas), width: mark.width * factor },
  );

  return {
    viewBox,
    marks,
    clips: Object.fromEntries(
      clipEntries.map(([name, commands]) => [name, mapCommands(commands, toCanvas)]),
    ),
  };
}
