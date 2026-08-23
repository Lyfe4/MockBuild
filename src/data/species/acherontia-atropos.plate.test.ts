import { describe, expect, it } from 'vitest';

import { boundsOf, parsePathData, pathPoints, type PlatePartId } from '@/lib/plate';
import { describePlateContract } from '@/test/plateContract';
import { capsuleWidth, flattenClosed, inside } from '@/test/plateGeometry';

import { ACHERONTIA_ATROPOS as SPECIES } from './acherontia-atropos';
import { ACHERONTIA_ATROPOS_PLATE as PLATE } from './acherontia-atropos.plate';

/**
 * The death's-head hawkmoth, checked.
 *
 * The shared contract covers what every plate must be. What is only true here is
 * the skull — a pale patch on the thorax with two dark sockets and a dark mouth
 * — and it is asked about as an *arrangement* rather than as three shapes,
 * because the arrangement is the whole reason a marking on a moth's back reads
 * as a face.
 */

function parts(id: PlatePartId) {
  return PLATE.parts.filter((part) => part.id === id);
}

/** The markings clipped to one surface, in drawing order. */
function markingsOn(surface: PlatePartId) {
  return PLATE.parts.filter((part) => part.id === 'marking' && part.clipTo === surface);
}

function centreOf(d: string): { x: number; y: number; width: number; height: number } {
  const bounds = boundsOf(flattenClosed(d));
  const minX = bounds?.minX ?? 0;
  const maxX = bounds?.maxX ?? 0;
  const minY = bounds?.minY ?? 0;
  const maxY = bounds?.maxY ?? 0;

  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY };
}

describe('the Acherontia atropos plate', () => {
  describePlateContract(PLATE, SPECIES);

  it('draws a skull on the thorax: a pale ground, two sockets and a mouth', () => {
    const skull = markingsOn('thorax');

    expect(skull).toHaveLength(3);

    const [ground, sockets, mouth] = skull;

    // The pale ground first, so the dark marks land on top of it.
    expect(ground?.fill).toBe('surface');
    expect(ground?.mirror).toBe(false);
    // The sockets are one entry, mirrored — which is what makes them a pair and
    // makes them symmetric. Drawn separately they would be a squint.
    expect(sockets?.fill).toBe('ink');
    expect(sockets?.mirror).not.toBe(false);
    expect(mouth?.fill).toBe('ink');
    expect(mouth?.mirror).toBe(false);
  });

  it('puts the sockets above the mouth, which is what makes it a face', () => {
    const [ground, sockets, mouth] = markingsOn('thorax');
    const pale = centreOf(ground?.d ?? 'M0 0');
    const eye = centreOf(sockets?.d ?? 'M0 0');
    const jaw = centreOf(mouth?.d ?? 'M0 0');

    // High, wide and paired; low, narrow and central. Swap them and it is a
    // pale patch with three dots on it.
    expect(eye.y).toBeLessThan(jaw.y);
    expect(eye.x).toBeGreaterThan(jaw.x + 10);
    expect(jaw.height).toBeGreaterThan(jaw.width);
    // And all three sit inside the pale ground rather than beside it.
    expect(eye.y).toBeGreaterThan(pale.y - pale.height / 2);
    expect(jaw.y).toBeLessThan(pale.y + pale.height / 2);
  });

  it('keeps the skull on the thorax it is drawn on', () => {
    const outline = flattenClosed(parts('thorax')[0]?.d ?? 'M0 0');

    for (const mark of markingsOn('thorax')) {
      const off = flattenClosed(mark.d).filter((point) => !inside(outline, point));

      // The sharp question rather than the sampled one: a filled marking is
      // wholly on its surface or it is somewhere else.
      expect(off, mark.fill).toHaveLength(0);
    }
  });

  it('bands the abdomen and runs a stripe down it', () => {
    const bands = parts('abdomen-segment');
    const stripe = markingsOn('abdomen');

    // Seven bands across and one stripe along, which is the arrangement that
    // makes a banded abdomen read as banded rather than as ringed.
    expect(bands.length).toBeGreaterThanOrEqual(6);
    expect(stripe).toHaveLength(1);
    expect(stripe[0]?.mirror).toBe(false);
    expect(SPECIES.morphology.markings).toBe('bands');

    const along = centreOf(stripe[0]?.d ?? 'M0 0');

    // Long and narrow and on the axis.
    expect(along.height).toBeGreaterThan(along.width * 4);
    expect(Math.abs(along.x)).toBeLessThan(2);
  });

  it('bands the hindwing from one traced edge at three depths', () => {
    const strips = PLATE.parts.filter(
      (part) => part.id === 'wing-marking' && part.clipTo === 'hindwing' && part.fill !== 'none',
    );

    // Deepest first, then the ground over it, then the outer band over that.
    // What shows is band, ground, band — two dark bands on orange, which is
    // what the reference has, from one measured edge rather than three.
    expect(strips).toHaveLength(3);
    expect(strips.map((strip) => strip.fill)).toStrictEqual([
      'pigment-deep',
      'pigment',
      'pigment-deep',
    ]);

    const widths = strips.map((strip) => centreOf(strip.d).width);

    for (const [index, width] of widths.entries()) {
      const before = widths[index - 1];

      if (before === undefined) continue;

      expect(width, `strip ${String(index)}`).toBeLessThan(before);
    }
  });

  it('tapers the antenna to a point rather than clubbing it', () => {
    const widths = parts('antenna').map((part) => capsuleWidth(part.d));

    // A Sphingid's antenna is stout at the base and finishes in a fine point.
    // The peacock two accessions earlier clubs its own, and that difference is
    // the character `morphology.antennae` is recording.
    expect(SPECIES.morphology.antennae).toBe('filiform');
    expect(widths.length).toBeGreaterThanOrEqual(3);

    for (const [index, width] of widths.entries()) {
      const before = widths[index - 1];

      if (before === undefined) continue;

      expect(width, `joint ${String(index)}`).toBeLessThan(before);
    }

    // `capsuleWidth` reports the widest cross-section of a segment, so the last
    // joint's number is its base rather than its point. Even so it is well
    // under the scape, which is the taper.
    expect(widths.at(-1) ?? 0).toBeLessThan((widths[0] ?? 0) * 0.75);
  });

  it('draws the palps, which a hawkmoth shows from above and a butterfly does not', () => {
    // `palp` had been in `PLATE_PART_IDS` unused; this is the first plate that
    // needed it.
    expect(parts('palp')).toHaveLength(1);
    expect(parts('palp')[0]?.mirror).not.toBe(false);
  });

  it('draws the longest wing in the collection', () => {
    const forewing = boundsOf(pathPoints(parsePathData(parts('forewing')[0]?.d ?? 'M0 0')));

    // 1.15 body lengths of half-span, measured off Kirby's figure, which is
    // what 130 mm of wing on 55 mm of body comes to.
    expect((forewing?.maxX ?? 0) / 1000).toBeGreaterThan(1);
    expect(SPECIES.sizeBasis).toBe('wingspan');
  });
});
