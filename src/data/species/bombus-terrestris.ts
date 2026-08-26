import type { Species } from '@/types';

/**
 * *Bombus terrestris* — the buff-tailed bumblebee.
 *
 * The record where `commonName` earns the rule about sentence case. "Buff-tailed
 * bumblebee" is not a decoration: buff is the character that separates this
 * species from *Bombus lucorum*, whose tail is white, and the two are otherwise
 * so alike that a worker of either is often recorded only as *terrestris*
 * agg. — which is also why `sizeMm` spans the whole caste range rather than
 * describing a queen.
 *
 * The plate cannot draw the distinction: a tail drawn as bare paper is whatever
 * the season's surface token happens to be. So the word carries it.
 */
export const BOMBUS_TERRESTRIS: Species = {
  id: 'bombus-terrestris',
  taxonomy: {
    order: 'Hymenoptera',
    family: 'Apidae',
    genus: 'Bombus',
    species: 'terrestris',
    // Parenthesised: Linnaeus described it as *Apis terrestris*, and the
    // brackets are the record of its having been moved out of that genus.
    authority: '(Linnaeus, 1758)',
  },
  commonName: 'Buff-tailed bumblebee',
  // Workers from about 11 mm, queens to about 22 mm. A single number would
  // describe a caste rather than a species.
  sizeMm: { min: 11, max: 22 },
  sizeBasis: 'body length',
  distribution:
    'Native across Europe, North Africa and western Asia, and introduced for glasshouse pollination to Chile, New Zealand, Japan and Tasmania, where it has escaped and established.',
  // The first bumblebee out in spring and one of the last in: queens emerge in
  // February in mild years, and in southern England some colonies now stay
  // active through the winter on garden flowers.
  activeMonths: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  monthsHemisphere: 'northern',
  morphology: {
    wingCover: 'membranous',
    antennae: 'filiform',
    markings: 'bands',
    bodyShape: 'oval',
    sizeClass: 'medium',
    colourFamily: 'black',
  },
  notes:
    'Black and densely furred, with a dull yellow collar across the front of the thorax, a second band across the abdomen, and a tail that is buff in the queen and off-white in most workers. It nests underground, often in an abandoned rodent burrow, in colonies of a few hundred; the queen founds the nest alone and the first workers take over foraging within weeks. It is a short-tongued bumblebee and will bite a hole in the base of a long flower to reach nectar it cannot reach legitimately, a habit called nectar robbing that other insects then use. Commercial colonies are raised in vast numbers for glasshouse tomatoes, which is how the species reached South America and New Zealand.',
  sources: [
    {
      title: 'Bombus terrestris — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Bombus_terrestris',
    },
    {
      title: 'Bombus terrestris (Linnaeus, 1758) — GBIF Backbone Taxonomy',
      url: 'https://www.gbif.org/species/1340503',
    },
    {
      title: 'Buff-tailed bumblebee — Bumblebee Conservation Trust',
      url: 'https://www.bumblebeeconservation.org/bee-faqs/bumblebee-species-guide/',
    },
  ],
  // Umber: the animal is black, and umber is the darkest earth the palette has.
  pigment: 5,
  // sqrt(22 / 75) against the stag beetle.
  scale: 0.54,
};
