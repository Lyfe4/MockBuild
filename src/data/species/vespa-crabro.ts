import type { Species } from '@/types';

/**
 * *Vespa crabro* — the European hornet.
 *
 * The largest social wasp in Europe, and the record that tests whether the
 * archive can write about a feared animal without either flattering it or
 * repeating the folklore. The line it holds: what a hornet does is
 * documented — it hunts other insects, it defends a nest within a few metres of
 * it, and its sting is no more venomous drop for drop than a honeybee's — and
 * what it is said to do is not.
 */
export const VESPA_CRABRO: Species = {
  id: 'vespa-crabro',
  taxonomy: {
    order: 'Hymenoptera',
    family: 'Vespidae',
    genus: 'Vespa',
    species: 'crabro',
    // Unparenthesised: Linnaeus put it in the genus it is still in.
    authority: 'Linnaeus, 1758',
  },
  commonName: 'European hornet',
  // Workers from about 18 mm, queens to about 35 mm. The range is the whole
  // caste spread, which for a social wasp is most of what the number means.
  sizeMm: { min: 18, max: 35 },
  sizeBasis: 'body length',
  distribution:
    'Across Europe and temperate Asia to Japan, and introduced to eastern North America in the mid-nineteenth century; in Britain it is commonest south of a line from the Humber to the Severn and has been spreading north.',
  // Only mated queens overwinter. They emerge in spring to found a colony, the
  // first workers appear in early summer, and the nest dies with the first hard
  // frosts.
  activeMonths: [4, 5, 6, 7, 8, 9, 10],
  monthsHemisphere: 'northern',
  morphology: {
    wingCover: 'membranous',
    antennae: 'filiform',
    markings: 'bands',
    bodyShape: 'elongate',
    sizeClass: 'large',
    colourFamily: 'reddish brown',
  },
  notes:
    'A brown and yellow wasp built on a larger scale than the yellowjackets it is usually mistaken for, with a chestnut thorax and dark bands across the abdomen that are notched back towards the midline. A colony is founded in spring by a single overwintered queen, usually in a hollow tree or a roof void, and rarely exceeds a few hundred workers before it dies out in autumn. The workers hunt other insects — flies, wasps, large beetles — and chew them into a paste for the larvae, which is why a hornet nest near an orchard is generally an asset. It is markedly less ready to sting than a common wasp and defends only the immediate area around the nest, and its venom is no more potent drop for drop than a honeybee’s.',
  sources: [
    {
      title: 'European hornet — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/European_hornet',
    },
    {
      title: 'Vespa crabro Linnaeus, 1758 — GBIF Backbone Taxonomy',
      url: 'https://www.gbif.org/species/1311477',
    },
    {
      title: 'Hornet — Bees, Wasps and Ants Recording Society',
      url: 'https://www.bwars.com/wasp/vespidae/vespinae/vespa-crabro',
    },
  ],
  // Russet: the chestnut of the thorax is the colour a reader would name first.
  pigment: 2,
  // sqrt(35 / 75) against the stag beetle.
  scale: 0.68,
};
