import type { Species } from '@/types';

/**
 * *Aglais io* — the peacock butterfly.
 *
 * The record that makes `markings: 'eyespots'` mean something. The state has
 * been in `MARKING_FORMS` since the type was written and nothing in the
 * collection answered it, so the key offered an answer that led nowhere and the
 * label — "eyespots, ringed like an eye" — described a specimen the archive did
 * not hold. One record fixes that, and it happens to be the animal the character
 * was named for.
 *
 * It is also the second Nymphalid character the collection was missing: a
 * butterfly that overwinters as an *adult*. A swallowtail is on the wing in
 * March because it emerged from a pupa; a peacock is on the wing in March
 * because it has been asleep in a log pile since October, which is why its
 * `activeMonths` run nearly the whole year with a gap in midwinter rather than a
 * single summer block.
 */
export const AGLAIS_IO: Species = {
  id: 'aglais-io',
  taxonomy: {
    order: 'Lepidoptera',
    family: 'Nymphalidae',
    genus: 'Aglais',
    species: 'io',
    // Parenthesised: Linnaeus described it as a Papilio, and it has been through
    // Vanessa, Inachis and Nymphalis since. Kirby's plate calls it Vanessa io.
    authority: '(Linnaeus, 1758)',
  },
  commonName: 'Peacock butterfly',
  sizeMm: { min: 50, max: 63 },
  sizeBasis: 'wingspan',
  distribution:
    'Native across temperate Europe and Asia from Britain and Iberia to Japan, absent from the far north, and common along woodland edges, in gardens and anywhere stinging nettle grows.',
  // Two flights and a hibernation, which is why the run is so long: fresh adults
  // in July and August, then again from March after overwintering. January and
  // February are the only months no peacock is about, and a warm February will
  // wake them.
  activeMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],
  monthsHemisphere: 'northern',
  morphology: {
    wingCover: 'scaled',
    antennae: 'clavate',
    // Four of them, one to a wing, and the only record in the archive that says
    // this. See the plate.
    markings: 'eyespots',
    bodyShape: 'slender',
    sizeClass: 'large',
    colourFamily: 'red',
  },
  notes:
    'Rust-red above with a dark border and one large ringed eyespot on each of the four wings — blue-and-black on the forewing, blue-grey on the hind — and almost black underneath, so a peacock at rest with its wings closed is a dead leaf. Startled, it snaps them open and hisses by rubbing its wing bases together, which is enough to make a small bird leave. The caterpillars are black and spined and feed communally on stinging nettle inside a silk web. Adults overwinter in sheds, hollow trees and log piles, and are among the first butterflies out in spring.',
  sources: [
    {
      title: 'Aglais io — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Aglais_io',
    },
    {
      title: 'Aglais io (Linnaeus, 1758) — GBIF Backbone Taxonomy',
      url: 'https://www.gbif.org/species/8211070',
    },
    {
      title: 'Peacock — Butterfly Conservation',
      url: 'https://butterfly-conservation.org/butterflies/peacock',
    },
  ],
  // Russet: the palette's red earth, for the reddest animal in the collection
  // after the seven-spot.
  pigment: 2,
  // sqrt(63 / 110) against the southern hawker, which is the yardstick the two
  // other wingspan animals are measured on.
  scale: 0.76,
};
