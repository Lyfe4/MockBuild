import type { Species } from '@/types';

/**
 * *Palomena prasina* — the green shield bug.
 *
 * The first true bug in the collection, and the record that asked for the fifth
 * `wingCover` state. A hemelytron is hard at the base and membranous at the tip
 * — half elytron, half wing — and the animal is named for exactly that, so for
 * one release this record answered `membranous`, which is the closer of two
 * wrong answers and still wrong: it filed a shield bug with the hornets on the
 * character that separates them. `hemelytra` is now a state of its own and this
 * is the record that carries it.
 */
export const PALOMENA_PRASINA: Species = {
  id: 'palomena-prasina',
  taxonomy: {
    order: 'Hemiptera',
    family: 'Pentatomidae',
    genus: 'Palomena',
    species: 'prasina',
    // Parenthesised: Linnaeus described it as *Cimex prasinus*.
    authority: '(Linnaeus, 1761)',
  },
  commonName: 'Green shield bug',
  sizeMm: { min: 12, max: 13.5 },
  sizeBasis: 'body length',
  distribution:
    'Across Europe, North Africa and temperate Asia as far east as Japan; in Britain it was a southern insect until the 1990s and has since spread well into Scotland.',
  // Adults overwinter and come out of hibernation in spring, so the year has a
  // gap in the middle rather than at the ends: the old generation is on the
  // wing from April, the new one from August, and both are counted here.
  activeMonths: [4, 5, 6, 7, 8, 9, 10],
  monthsHemisphere: 'northern',
  morphology: {
    // Hard at the base, membranous at the tip. See the note above.
    wingCover: 'hemelytra',
    antennae: 'filiform',
    markings: 'none',
    bodyShape: 'oval',
    sizeClass: 'small',
    colourFamily: 'green',
  },
  notes:
    'Plain green above with a finely pitted surface, a rounded-shouldered pronotum and a scutellum running a third of the way down the back; the pale bands along the abdominal margin are the segment edges showing beyond the folded wings. It changes colour to a dull bronze before hibernating under leaf litter and turns green again in spring, which is why an autumn specimen and a summer one look like different animals. It feeds by sucking sap from a wide range of shrubs and trees — hazel, birch, bramble and beans among them — and, unlike its relatives, does no real damage to crops. Handled or threatened it releases the aldehyde that gives the family its other name.',
  sources: [
    {
      title: 'Palomena prasina — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Palomena_prasina',
    },
    {
      title: 'Palomena prasina (Linnaeus, 1761) — GBIF Backbone Taxonomy',
      url: 'https://www.gbif.org/species/4485762',
    },
    {
      title: 'Palomena prasina — British Bugs',
      url: 'https://www.britishbugs.org.uk/heteroptera/Pentatomidae/palomena_prasina.html',
    },
  ],
  // Olive: the one colour the animal has, and the only green in the palette.
  pigment: 3,
  // sqrt(13.5 / 75) against the stag beetle.
  scale: 0.42,
};
