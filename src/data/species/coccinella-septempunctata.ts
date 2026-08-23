import type { Species } from '@/types';

/**
 * *Coccinella septempunctata* — the seven-spot ladybird.
 *
 * The small end of the collection, and there on purpose: a catalogue whose
 * every specimen is a spectacular beetle is a catalogue of spectacular beetles
 * rather than of insects. At under eight millimetres this is a tenth the length
 * of the stag beetle, and `scale` is what stops the two being drawn the same
 * size.
 *
 * `markings: 'spots'` is the character a key would reach for first. The *count*
 * is in the plate rather than the record, because the schema has nowhere to put
 * "seven" — which is a gap worth noticing the day the key is written.
 */
export const COCCINELLA_SEPTEMPUNCTATA: Species = {
  id: 'coccinella-septempunctata',
  taxonomy: {
    order: 'Coleoptera',
    family: 'Coccinellidae',
    genus: 'Coccinella',
    species: 'septempunctata',
    // Unparenthesised: Linnaeus put it in the genus it is still in.
    authority: 'Linnaeus, 1758',
  },
  commonName: 'Seven-spot ladybird',
  sizeMm: { min: 6.5, max: 7.8 },
  sizeBasis: 'body length',
  distribution:
    'Native across Europe, most of Asia and North Africa, from sea level to about 1,500 m, and introduced to North America as a biological control for aphids.',
  // Out from the first warm days of spring until the cold sends them into
  // hibernation. They overwinter as adults, clustered under bark and in leaf
  // litter, rather than as eggs or pupae.
  activeMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  morphology: {
    wingCover: 'elytra',
    antennae: 'clavate',
    markings: 'spots',
    bodyShape: 'round',
    sizeClass: 'small',
    colourFamily: 'red',
  },
  notes:
    'Three black spots on each wing case and a seventh straddling the join, which is where the name comes from; the two white patches at the front of the pronotum are the quickest way to separate it from the harlequin. Adults and larvae both eat aphids, and one beetle will clear several thousand in a season — the reason it was carried to North America deliberately. When aphids run short it will take pollen, nectar, thrips and whitefly, but it cannot breed on them. Handled roughly it bleeds a bitter yellow alkaloid from its leg joints, which is what the red advertises.',
  sources: [
    {
      title: 'Coccinella septempunctata — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Coccinella_septempunctata',
    },
    {
      title: 'Coccinella septempunctata Linnaeus, 1758 — GBIF Backbone Taxonomy',
      url: 'https://www.gbif.org/species/4989904',
    },
    {
      title: '7-spot ladybird — UK Ladybird Survey',
      url: 'https://www.coleoptera.org.uk/coccinellidae/coccinella-septempunctata',
    },
  ],
  // Russet is the reddest earth the palette has, and a seven-spot is scarlet.
  pigment: 2,
  // sqrt(7.8 / 75) against the stag beetle. A linear ratio would draw this
  // animal as a dot.
  scale: 0.32,
};
