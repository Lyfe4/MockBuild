import type { Species } from '@/types';

/**
 * *Cetonia aurata* — the rose chafer.
 *
 * The record that makes `colourFamily: 'metallic'` earn its place in the union.
 * A rose chafer is not green the way a shield bug is green: the colour is
 * structural, produced by layers in the cuticle rather than by a pigment, and
 * it shifts through bronze and copper as the specimen turns. Naming a hue would
 * be naming one angle of view. The plate cannot draw it either — a plate is
 * inked in one of six seasonal earths — so the word is where the fact lives.
 */
export const CETONIA_AURATA: Species = {
  id: 'cetonia-aurata',
  taxonomy: {
    order: 'Coleoptera',
    family: 'Scarabaeidae',
    genus: 'Cetonia',
    species: 'aurata',
    // Unparenthesised: Linnaeus placed it in the genus it is still in.
    authority: 'Linnaeus, 1758',
  },
  commonName: 'Rose chafer',
  sizeMm: { min: 14, max: 20 },
  sizeBasis: 'body length',
  distribution:
    'Across most of Europe into southern Britain, and east through temperate Asia; commonest on chalk and sand, where the larvae have dead wood and leaf mould to develop in.',
  // On the wing on warm days from late spring to the end of summer. The larvae
  // take two years in rotting wood, so the adults are the short part of the
  // life cycle.
  activeMonths: [5, 6, 7, 8, 9],
  monthsHemisphere: 'northern',
  morphology: {
    wingCover: 'elytra',
    antennae: 'lamellate',
    // Broken white dashes rather than round spots, and asymmetric on any one
    // specimen — but a key asks whether the wing cases are marked, and they
    // are.
    markings: 'spots',
    bodyShape: 'oval',
    sizeClass: 'medium',
    colourFamily: 'metallic',
  },
  notes:
    'Brilliant metallic green above, usually with a coppery or bronze cast, scattered with short irregular white dashes across the wing cases; the last abdominal segment is left uncovered behind them, which is a chafer character rather than damage. It flies with the wing cases closed, using a notch at the side of each to let the hindwings out, so a rose chafer in the air looks like a beetle that has forgotten to open. Adults feed on pollen, nectar and soft fruit and are most often found sitting in open flowers on hot days. The larvae live for two years in rotting wood, compost and leaf mould, and are useful rather than harmful in a garden.',
  sources: [
    {
      title: 'Cetonia aurata — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Cetonia_aurata',
    },
    {
      title: 'Cetonia aurata (Linnaeus, 1758) — GBIF Backbone Taxonomy',
      url: 'https://www.gbif.org/species/4991487',
    },
    {
      title: 'Rose chafer — Royal Horticultural Society',
      url: 'https://www.rhs.org.uk/biodiversity/rose-chafer',
    },
  ],
  // Olive: the closest earth the palette has to a green beetle. The metallic
  // part of it is in the record, not in the ink.
  pigment: 3,
  // sqrt(20 / 75) against the stag beetle.
  scale: 0.52,
};
