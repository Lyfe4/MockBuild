import type { Species } from '@/types';

/**
 * *Lucanus cervus* — the European stag beetle.
 *
 * The first hand-authored plate, and the record it is drawn against. Every
 * field is real and every claim is in `sources`. That is the whole point of the
 * change of direction: the archive's earlier specimens were invented and their
 * binomials constructed, so the drawings had nothing to be faithful to. A real
 * species gives the plate something to be measured against and the
 * identification key something true to key out.
 *
 * The male is the animal drawn. Both sexes are covered by `sizeMm`, which is
 * why its range is so wide: a small female and a large male are not the same
 * size of animal by a factor of three.
 */
export const LUCANUS_CERVUS: Species = {
  id: 'lucanus-cervus',
  taxonomy: {
    order: 'Coleoptera',
    family: 'Lucanidae',
    genus: 'Lucanus',
    species: 'cervus',
    // Parenthesised because Linnaeus placed the animal in another genus.
    authority: '(Linnaeus, 1758)',
  },
  commonName: 'European stag beetle',
  // Females from about 25 mm; the largest males reach 75 mm, which makes this
  // the largest beetle in Europe.
  sizeMm: { min: 25, max: 75 },
  distribution:
    'Widespread across continental Europe and locally in south-east England, absent from Ireland, and extending east through Asia Minor and the Caucasus to western Kazakhstan.',
  // Adults emerge from late May and are gone by early August.
  activeMonths: [5, 6, 7, 8],
  morphology: {
    wingCover: 'elytra',
    antennae: 'lamellate',
    markings: 'none',
    bodyShape: 'elongate',
    sizeClass: 'large',
    colourFamily: 'dark brown',
  },
  notes:
    'The male carries enormously enlarged mandibles, branched like a stag’s antlers, which he uses to lever rival males off a branch rather than to bite; the female’s jaws are short and much stronger. Larvae spend three to seven years in decaying wood underground — old stumps, buried roots and rotting fence posts — while the adults live only a few weeks and feed on sap and fallen fruit. The species is assessed as Near Threatened on the IUCN Red List, and its decline follows the tidying away of dead wood.',
  sources: [
    {
      title: 'Lucanus cervus — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Lucanus_cervus',
    },
    {
      title: 'Lucanus cervus (Linnaeus, 1758) — GBIF Backbone Taxonomy',
      url: 'https://www.gbif.org/species/5743122',
    },
    {
      title: 'Stag beetle — Natural History Museum, London',
      url: 'https://www.nhm.ac.uk/discover/stag-beetle.html',
    },
    {
      title: 'Lucanus cervus — IUCN Red List of Threatened Species',
      url: 'https://www.iucnredlist.org/species/157554/5090163',
    },
  ],
  // Russet: the elytra are the one warm note on an otherwise black animal.
  pigment: 2,
  // The largest beetle in Europe sets the top of the scale.
  scale: 1,
};
