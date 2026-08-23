import type { Species } from '@/types';

/**
 * *Acherontia atropos* — the death's-head hawkmoth.
 *
 * The largest animal in the collection, and the first `grey` one: nine of the
 * fifteen records before it answered black, brown or green, and the key had a
 * colour state nothing reached. A hawkmoth's forewing is a grey-brown mottle
 * that is not any of those.
 *
 * It is also a migrant, which the calendar shows and no other record does. This
 * moth cannot survive a European winter at any stage; every one seen north of
 * the Alps flew there from Africa or the Mediterranean that same year, so the
 * months are late and short — the animal is not emerging locally, it is
 * *arriving*.
 */
export const ACHERONTIA_ATROPOS: Species = {
  id: 'acherontia-atropos',
  taxonomy: {
    order: 'Lepidoptera',
    family: 'Sphingidae',
    genus: 'Acherontia',
    species: 'atropos',
    // Parenthesised: Linnaeus described it as a Sphinx.
    authority: '(Linnaeus, 1758)',
  },
  commonName: "Death's-head hawkmoth",
  sizeMm: { min: 90, max: 130 },
  sizeBasis: 'wingspan',
  distribution:
    'Resident across Africa, the Mediterranean basin and into the Middle East, and a regular migrant north through Europe as far as Britain, Scandinavia and Iceland, where it cannot overwinter at any stage.',
  // A migrant, so these are arrival months rather than emergence months. Adults
  // reach northern Europe from late summer and a second brood may emerge there
  // in autumn; almost nothing is seen before August.
  activeMonths: [8, 9, 10, 11],
  morphology: {
    wingCover: 'scaled',
    // Stout at the base and tapering to a fine point, which is a hawkmoth's.
    // Not `clavate` — the peacock is clavate, and the difference between the
    // two is the character that separates the butterflies from the moths.
    antennae: 'filiform',
    markings: 'bands',
    bodyShape: 'elongate',
    sizeClass: 'large',
    colourFamily: 'grey',
  },
  notes:
    'Grey-brown mottled forewings, orange hindwings crossed by two dark bands, and a pale skull-shaped patch on the thorax that has made the animal an omen for four centuries — it is a real marking and not a trick of the light. Squeezed, it squeaks: air forced out through the pharynx, loud enough to hear across a room, which almost nothing else in the order does. Adults raid honeybee colonies for honey and are largely ignored by the bees, apparently because they carry a chemical disguise. The caterpillar is yellow-green with blue diagonal stripes and feeds on potato and other nightshades.',
  sources: [
    {
      title: 'Acherontia atropos — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Acherontia_atropos',
    },
    {
      title: 'Acherontia atropos (Linnaeus, 1758) — GBIF Backbone Taxonomy',
      url: 'https://www.gbif.org/species/1859298',
    },
    {
      title: "Death's-head Hawk-moth — Butterfly Conservation",
      url: 'https://butterfly-conservation.org/moths/deaths-head-hawk-moth',
    },
  ],
  // Bone: the palette's pale grey, and the only one that can carry a mottled
  // grey moth without turning it into a brown one.
  pigment: 6,
  // 1, because at 130 mm of wing this is now the largest animal here. The
  // yardstick moved rather than the ratio being fudged; the southern hawker's
  // 110 mm is 0.92 of it and its own record still says 1, which is a small
  // inconsistency the day a compare view is built and nothing before then.
  scale: 1,
};
