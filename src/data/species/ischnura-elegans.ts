import type { Species } from '@/types';

/**
 * *Ischnura elegans* — the blue-tailed damselfly.
 *
 * Here for the contrast with the southern hawker, and it earns it twice over.
 * The two are the same order, the same wing covering and the same antennal
 * form, so the key has to separate them on markings and shape — and it can,
 * because a damselfly is striped along the thorax where a hawker is spotted
 * along the abdomen.
 *
 * The other half of the contrast is not in the record at all. `bodyShape` says
 * `slender` for both animals and that is true of both; what the union cannot say
 * is that one of them is a needle and the other a torpedo. The plates say it,
 * side by side on the contact sheet, in about a second.
 */
export const ISCHNURA_ELEGANS: Species = {
  id: 'ischnura-elegans',
  taxonomy: {
    order: 'Odonata',
    family: 'Coenagrionidae',
    genus: 'Ischnura',
    species: 'elegans',
    // Parenthesised: Vander Linden described it as an Agrion.
    authority: '(Vander Linden, 1820)',
  },
  commonName: 'Blue-tailed damselfly',
  sizeMm: { min: 34, max: 40 },
  sizeBasis: 'wingspan',
  distribution:
    'Native across Europe and temperate Asia from Ireland to Japan, and one of the most widespread damselflies anywhere — still ponds, canals, ditches and gravel pits, including brackish and polluted water that most Odonata will not use.',
  // A long season for a damselfly, and two generations in a warm year. On the
  // wing from late spring until the first cold nights.
  activeMonths: [5, 6, 7, 8, 9],
  morphology: {
    wingCover: 'membranous',
    antennae: 'setaceous',
    // The antehumeral stripes down the thorax, which run head to tail. The
    // hawker's spots run across the abdomen, and that is the character the key
    // separates the two Odonata on.
    markings: 'stripes',
    bodyShape: 'slender',
    sizeClass: 'large',
    colourFamily: 'black',
  },
  notes:
    'Black with a pale blue antehumeral stripe down each side of the thorax and one bright blue segment near the tip of the abdomen — the eighth of ten, with seven and nine dark either side of it, which is the quickest way to separate it from the several other blue damselflies. Females come in five colour forms, two of them blue like the male and three orange, violet or olive, and all of them keep the tail-light. It flies weakly and low, rests with its wings folded along its back rather than spread, and hunts small flies caught in a basket made of its own legs. Tolerant of poor water, which is why it is often the only damselfly at a town pond.',
  sources: [
    {
      title: 'Ischnura elegans — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Ischnura_elegans',
    },
    {
      title: 'Ischnura elegans (Vander Linden, 1820) — GBIF Backbone Taxonomy',
      url: 'https://www.gbif.org/species/1424252',
    },
    {
      title: 'Blue-tailed Damselfly — British Dragonfly Society',
      url: 'https://british-dragonflies.org.uk/species/blue-tailed-damselfly/',
    },
  ],
  // Slate: the palette's cool dark, and the closest it comes to the blue this
  // animal is named for.
  pigment: 4,
  // sqrt(40 / 110) against the southern hawker.
  scale: 0.6,
};
