import type { Species } from '@/types';

/**
 * *Chrysolina coerulans* — the blue mint beetle.
 *
 * A substitution, and worth saying so where somebody will read it. The
 * collection wanted an Australian Christmas beetle here — an *Anoplognathus*,
 * for the local relevance an archive that calls itself southern ought to have —
 * and there is no public-domain figure of one. Every image of the genus on
 * Wikimedia Commons is either a modern photograph under a Creative Commons
 * licence or a museum type-specimen photograph taken well after 1923, and the
 * plate contract requires a reference whose copyright has expired. Rather than
 * draw an animal from a photograph nobody may redistribute, or invent one, the
 * slot went to a documented European species with a usable lithograph: this.
 *
 * What it brings is the collection's broadest beetle. At 0.65 as wide as it is
 * long it sits at the far end of a range whose other end is the violet ground
 * beetle at 0.39, and `bodyShape` cannot say that — both are `oval`, which is
 * true of both. The plates say it, which is what the plates are for.
 */
export const CHRYSOLINA_COERULANS: Species = {
  id: 'chrysolina-coerulans',
  taxonomy: {
    order: 'Coleoptera',
    family: 'Chrysomelidae',
    genus: 'Chrysolina',
    species: 'coerulans',
    // Parenthesised: Scriba described it as a Chrysomela.
    authority: '(Scriba, 1791)',
  },
  commonName: 'Blue mint beetle',
  sizeMm: { min: 7, max: 10 },
  sizeBasis: 'body length',
  distribution:
    'Native across most of Europe and into western and central Asia, wherever mint grows on damp ground — ditches, riverbanks, marsh edges — and introduced to eastern North America, where it is a pest of cultivated mint.',
  // Adults overwinter in the soil and are on the plant from the first warm
  // weather; two generations in a good year, so they are found until autumn.
  activeMonths: [4, 5, 6, 7, 8, 9],
  monthsHemisphere: 'northern',
  morphology: {
    wingCover: 'elytra',
    antennae: 'filiform',
    markings: 'none',
    bodyShape: 'oval',
    sizeClass: 'small',
    // Blue-green and structural, so it shifts with the angle: `metallic` is the
    // honest answer and the plate cannot draw it at all.
    colourFamily: 'metallic',
  },
  notes:
    'Strongly domed and metallic blue-green, the whole upper surface finely and closely punctured in rough longitudinal rows; about two thirds as wide as it is long, which makes it one of the roundest beetles in Europe. It eats nothing but mint and its relatives — water mint, spearmint, catmint — and takes on their smell, which is where the English name comes from. Adults and larvae feed on the same leaves and both overwinter, the adults in soil at the base of the plant. Where mint is grown commercially it is a pest; everywhere else it is the reason a mint patch by a ditch has holes in it.',
  sources: [
    {
      title: 'Chrysolina coerulans — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Chrysolina_coerulans',
    },
    {
      title: 'Chrysolina coerulans (Scriba, 1791) — GBIF Backbone Taxonomy',
      url: 'https://www.gbif.org/species/4457971',
    },
    {
      title: 'Chrysolina coerulans — Fauna Europaea',
      url: 'https://fauna-eu.org/cdm_dataportal/taxon/8b18e0f6-5b98-4a2c-9b0f-40ee6f7b6dd6',
    },
  ],
  // Olive: the palette's green, for a beetle whose blue runs to green.
  pigment: 3,
  // sqrt(10 / 75) against the stag beetle.
  scale: 0.37,
};
