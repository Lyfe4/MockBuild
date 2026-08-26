import type { Species } from '@/types';

/**
 * *Papilio machaon* — the Old World swallowtail.
 *
 * The type species of *Papilio*, and the first animal anybody called a
 * swallowtail. It is here because it is the order's obvious representative and
 * because a spread-wing butterfly is the case the plate schema had to grow for:
 * four wings, venation drawn on them, and no legs to speak of from above.
 *
 * `sizeMm` is a wingspan — see `sizeBasis`. Eighty-six millimetres of butterfly
 * is a much smaller animal than seventy-five of stag beetle, and the two
 * numbers mean nothing side by side without the basis beside them.
 */
export const PAPILIO_MACHAON: Species = {
  id: 'papilio-machaon',
  taxonomy: {
    order: 'Lepidoptera',
    family: 'Papilionidae',
    genus: 'Papilio',
    species: 'machaon',
    authority: 'Linnaeus, 1758',
  },
  commonName: 'Old World swallowtail',
  sizeMm: { min: 65, max: 86 },
  sizeBasis: 'wingspan',
  distribution:
    'Throughout the Palearctic from Ireland to Japan, south to Arabia and the Himalaya, and across into Alaska, Canada and the United States — so not confined to the Old World its common name gives it.',
  // Two or three broods a year at low elevations, March to September. In the
  // north there is one, because the summer is too short for more.
  activeMonths: [3, 4, 5, 6, 7, 8, 9],
  monthsHemisphere: 'northern',
  morphology: {
    wingCover: 'scaled',
    antennae: 'clavate',
    markings: 'bands',
    bodyShape: 'slender',
    sizeClass: 'large',
    colourFamily: 'yellow',
  },
  notes:
    'Yellow wings crossed by black bands and veins, with a tail on each hindwing — the resemblance to the bird is where the family gets its name. Just inside each tail sits a row of blue lunules and one red eyespot, which is the quickest field mark. A strong, fast flier that stops to hover at flowers; the males hilltop, gathering near summits to intercept passing females. The British subspecies britannicus is more heavily marked in black than the continental gorganus and stays close to its fenland, where the caterpillars feed on milk-parsley. The caterpillar is a bird dropping when small, and when large a green, black and orange thing with a forked orange scent gland it everts when handled.',
  sources: [
    {
      title: 'Papilio machaon — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Papilio_machaon',
    },
    {
      title: 'Papilio machaon Linnaeus, 1758 — GBIF Backbone Taxonomy',
      url: 'https://www.gbif.org/species/1938854',
    },
    {
      title: 'Swallowtail — Butterfly Conservation',
      url: 'https://butterfly-conservation.org/butterflies/swallowtail',
    },
  ],
  // Ochre: the ground colour of the wing is a pale, warm yellow.
  pigment: 1,
  scale: 1,
};
