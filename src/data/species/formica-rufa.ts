import type { Species } from '@/types';

/**
 * *Formica rufa* — the red wood ant.
 *
 * The record that fills the last hole in the key's first question. `wingCover`
 * has six states and until this animal arrived one of them — `absent` — was an
 * answer no species gave, so a reader who picked "no wings visible" from the
 * opening screen was told nothing matched. A wingless worker is the most
 * ordinary insect there is; the collection just did not have one.
 *
 * It cost `REQUIRED_PARTS.hymenoptera` its wings, and rightly: winglessness is
 * normal in this order rather than exceptional. See the landmark file.
 *
 * The caste is worth naming. A wood ant nest also produces winged queens and
 * males, which fly in a few days of high summer and would answer `membranous`;
 * what a visitor finds on a path is a worker, and a worker is what the record
 * and the plate describe.
 */
export const FORMICA_RUFA: Species = {
  id: 'formica-rufa',
  taxonomy: {
    order: 'Hymenoptera',
    family: 'Formicidae',
    genus: 'Formica',
    species: 'rufa',
    // Unparenthesised: Linnaeus put it in the genus it is still in.
    authority: 'Linnaeus, 1761',
  },
  commonName: 'Red wood ant',
  sizeMm: { min: 4.5, max: 9 },
  sizeBasis: 'body length',
  distribution:
    'Native across Europe from Britain and Iberia east to Siberia, in and beside woodland — mostly conifer, and mostly at the sunny edge of it, where the nest mound can be warmed.',
  // Workers are out whenever it is warm enough to forage and spend the winter
  // clustered deep in the mound. The winged castes fly in a few days of high
  // summer, which is not what this record describes.
  activeMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  monthsHemisphere: 'northern',
  morphology: {
    // A worker has none at all. The only record in the collection that says so.
    wingCover: 'absent',
    // `geniculate` would be the right word and the union has no such state. The
    // joints past the elbow are a chain of equal segments, which is what
    // `filiform` describes; the elbow itself is in the drawing.
    antennae: 'filiform',
    markings: 'none',
    bodyShape: 'elongate',
    sizeClass: 'small',
    colourFamily: 'reddish brown',
  },
  notes:
    'Reddish brown with a darker head and gaster, wingless as a worker, and built in three parts with a pinched waist between the last two. A nest is a thatched mound of conifer needles a metre across and as much again below ground, holding a hundred thousand workers and often several queens, and the same mound may be occupied for decades. It has no sting: threatened, it bites and sprays formic acid from the tip of the gaster, which it can do accurately over some distance. Foragers tend aphids for honeydew and carry a great many caterpillars home, which is why a wood ant colony measurably changes the insects in the trees around it.',
  sources: [
    {
      title: 'Formica rufa — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Formica_rufa',
    },
    {
      title: 'Formica rufa Linnaeus, 1761 — GBIF Backbone Taxonomy',
      url: 'https://www.gbif.org/species/1314271',
    },
    {
      title: 'Red wood ant — The Wildlife Trusts',
      url: 'https://www.wildlifetrusts.org/wildlife-explorer/invertebrates/ants-and-wasps/red-wood-ant',
    },
  ],
  // Umber: a warm brown, for an animal whose name is the colour.
  pigment: 5,
  // sqrt(9 / 75) against the stag beetle.
  scale: 0.35,
};
