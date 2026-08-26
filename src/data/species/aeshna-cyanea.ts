import type { Species } from '@/types';

/**
 * *Aeshna cyanea* — the southern hawker.
 *
 * The collection's dragonfly, and the reason the plate schema grew an
 * `opacity` field. Four clear wings that overlap each other and the abdomen
 * cannot be drawn with an opaque fill without hiding the animal behind itself.
 *
 * The authority is parenthesised because Müller described it in *Libellula*,
 * which is not where it sits now.
 */
export const AESHNA_CYANEA: Species = {
  id: 'aeshna-cyanea',
  taxonomy: {
    order: 'Odonata',
    family: 'Aeshnidae',
    genus: 'Aeshna',
    species: 'cyanea',
    authority: '(Müller, 1764)',
  },
  commonName: 'Southern hawker',
  sizeMm: { min: 95, max: 110 },
  sizeBasis: 'wingspan',
  distribution:
    'One of the commonest dragonflies in Europe: west to Ireland, north to Scotland and southern Scandinavia, south to Italy and the northern Balkans, east as far as the Urals, and across into north-west Africa.',
  // On the wing from June to October, with the odd individual in May and
  // November.
  activeMonths: [5, 6, 7, 8, 9, 10, 11],
  monthsHemisphere: 'northern',
  morphology: {
    wingCover: 'membranous',
    antennae: 'setaceous',
    markings: 'spots',
    bodyShape: 'elongate',
    sizeClass: 'large',
    colourFamily: 'dark brown',
  },
  notes:
    'A brown hawker with two broad green stripes down the thorax, paired pale spots along a long abdomen, and a black T on the forehead. The wings are clear with a dark pterostigma and a darkened leading edge. Inquisitive to the point of nuisance: it will hover a foot away and inspect a person, and it hunts well away from water, down hedgerows and along woodland rides. Eggs are jabbed into rotting wood or waterside vegetation and hatch the following spring; the nymphs spend two or three years underwater before emerging in July or August. The claspers at the tip of the abdomen are sometimes taken for a sting, and it has none.',
  sources: [
    {
      title: 'Aeshna cyanea — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Aeshna_cyanea',
    },
    {
      title: 'Aeshna cyanea (O. F. Müller, 1764) — GBIF Backbone Taxonomy',
      url: 'https://www.gbif.org/species/1425428',
    },
    {
      title: 'Southern Hawker — British Dragonfly Society',
      url: 'https://british-dragonflies.org.uk/species/southern-hawker/',
    },
  ],
  // Olive: the green of the thoracic stripes is the animal's one strong colour.
  pigment: 3,
  scale: 1,
};
