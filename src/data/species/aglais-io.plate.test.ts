import { describe, expect, it } from 'vitest';

import { boundsOf, parsePathData, pathPoints, type PlateFill, type PlatePartId } from '@/lib/plate';
import { describePlateContract } from '@/test/plateContract';
import { flattenClosed, inside } from '@/test/plateGeometry';

import { AGLAIS_IO as SPECIES } from './aglais-io';
import { AGLAIS_IO_PLATE as PLATE } from './aglais-io.plate';

/**
 * The peacock butterfly, checked.
 *
 * The shared contract covers what every plate must be. What is only true here is
 * the eyespots: four of them, one to a wing, each built out of three rings with
 * the highlight off centre. That is the whole identification and it is the only
 * record in the archive that answers `eyespots`, so it is worth asking about
 * carefully rather than counting shapes.
 */

function parts(id: PlatePartId) {
  return PLATE.parts.filter((part) => part.id === id);
}

/** The wing markings on one surface, in drawing order. */
function markingsOn(surface: PlatePartId) {
  return PLATE.parts.filter((part) => part.id === 'wing-marking' && part.clipTo === surface);
}

/** The centre and extent of a closed path. */
function centreOf(d: string): { x: number; y: number; width: number; height: number } {
  const bounds = boundsOf(flattenClosed(d));
  const minX = bounds?.minX ?? 0;
  const maxX = bounds?.maxX ?? 0;
  const minY = bounds?.minY ?? 0;
  const maxY = bounds?.maxY ?? 0;

  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY };
}

/** The concentric rings of one eyespot on a wing, largest first. */
function eyespotOn(surface: PlatePartId) {
  const wanted: readonly PlateFill[] = ['pigment-deep', 'pigment', 'surface'];

  return markingsOn(surface)
    .filter((part) => part.d.startsWith('M') && wanted.includes(part.fill))
    .filter((part) => {
      const { width, height } = centreOf(part.d);

      // The rings are round; the border and the pale band are long thin strips
      // that follow the margin, so an aspect ratio near 1 separates them.
      return width > 0 && height > 0 && width / height < 1.6 && height / width < 1.6;
    });
}

describe('the Aglais io plate', () => {
  describePlateContract(PLATE, SPECIES);

  it('gives every wing an eyespot, and the record the word for it', () => {
    expect(SPECIES.morphology.markings).toBe('eyespots');
    // One on each wing of the authored half; the renderer's reflection makes
    // four, which is what the animal has and what the name refers to.
    expect(eyespotOn('forewing').length).toBeGreaterThanOrEqual(3);
    expect(eyespotOn('hindwing').length).toBeGreaterThanOrEqual(3);
  });

  it('rings each eyespot rather than drawing it as a spot', () => {
    for (const surface of ['forewing', 'hindwing'] as const) {
      const rings = eyespotOn(surface);
      const sizes = rings.map((ring) => centreOf(ring.d).width);

      // Drawn outward in, so each ring is smaller than the one before and the
      // dark edge is laid down first. A single ellipse would be a spot, and the
      // ringing is what makes an eyespot read as an eye.
      for (const [index, size] of sizes.entries()) {
        const before = sizes[index - 1];

        if (before === undefined) continue;

        expect(size, `${surface} ring ${String(index)}`).toBeLessThan(before);
      }

      expect(rings[0]?.fill).toBe('pigment-deep');
      expect(rings.at(-1)?.fill).toBe('surface');
    }
  });

  it('sets the highlight off centre, which is the trick the animal is playing', () => {
    for (const surface of ['forewing', 'hindwing'] as const) {
      const rings = eyespotOn(surface);
      const outer = centreOf(rings[0]?.d ?? 'M0 0');
      const pupil = centreOf(rings.at(-1)?.d ?? 'M0 0');
      const offset = Math.hypot(pupil.x - outer.x, pupil.y - outer.y);

      // A pupil in the middle of its rings is a target. Off centre it is a
      // catchlight, and that is what makes a bird see an eye rather than a mark.
      expect(offset, surface).toBeGreaterThan(outer.width * 0.1);
    }
  });

  it('keeps every eyespot on the wing it belongs to', () => {
    for (const surface of ['forewing', 'hindwing'] as const) {
      const outline = flattenClosed(parts(surface)[0]?.d ?? 'M0 0');

      for (const ring of eyespotOn(surface)) {
        const off = flattenClosed(ring.d).filter((point) => !inside(outline, point));

        // Filled markings are asked the sharp question rather than the sampled
        // one the contract uses: the whole outline is on the wing, not most of it.
        expect(off, `${surface} ${ring.fill}`).toHaveLength(0);
      }
    }
  });

  it('borders both wings from one traced edge at two depths', () => {
    for (const surface of ['forewing', 'hindwing'] as const) {
      const strips = markingsOn(surface).filter((part) => {
        const { width, height } = centreOf(part.d);

        return width / height > 1.6 || height / width > 1.6;
      });

      // Two: the pale band first and wider, the dark border over it and
      // narrower. What shows of the wider one is the band, which is one measured
      // edge rather than two — the second of which would be the first offset by
      // hand and wrong by a few units all the way round.
      expect(strips, surface).toHaveLength(2);
      expect(strips[0]?.fill).toBe('surface');
      expect(strips[1]?.fill).toBe('pigment-deep');
    }
  });

  it('throws the forewing apex forward, which a tortoiseshell does not', () => {
    const forewing = boundsOf(pathPoints(parsePathData(parts('forewing')[0]?.d ?? 'M0 0')));
    const hindwing = boundsOf(pathPoints(parsePathData(parts('hindwing')[0]?.d ?? 'M0 0')));

    // The forewing reaches further out than the hindwing and well above the
    // head end, which is the nymphalid silhouette. A rounded apex no further
    // forward than the thorax would be a different animal.
    expect(forewing?.maxX ?? 0).toBeGreaterThan(hindwing?.maxX ?? 0);
    expect(forewing?.minY ?? 0).toBeLessThan(-150);
  });

  it('draws no legs, because a spread nymphalid shows none', () => {
    // And this family has only four walking legs anyway — the forelegs are
    // reduced to brushes held against the thorax. `REQUIRED_PARTS.lepidoptera`
    // does not ask, which is why this is worth stating rather than assuming.
    expect(PLATE.parts.filter((part) => part.id.includes('leg'))).toHaveLength(0);
  });

  it('clubs the antenna, which is what makes it a butterfly', () => {
    const antennae = parts('antenna');

    expect(antennae.length).toBeGreaterThanOrEqual(3);
    // A filled club at the end of two open strokes. The death's-head hawkmoth
    // tapers to a point instead, and that is the character separating them.
    expect(antennae.at(-1)?.fill).toBe('pigment-deep');
    expect(SPECIES.morphology.antennae).toBe('clavate');
  });
});
