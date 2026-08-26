import type { Species } from '@/types';

/**
 * *Graphosoma italicum* — the Italian striped shield bug.
 *
 * The second Hemiptera, and it is here because the first one made the order look
 * plain. The green shield bug answers `none` to markings and `green` to colour,
 * which is true and is also the whole of it; a reader who keyed one out learnt
 * that true bugs are green ovals. This animal is a red-and-black humbug with a
 * scutellum that covers its entire back, and it answers `stripes`, which the
 * archive had only one other record for.
 *
 * The two also part company on shape — `round` against `oval` — which is a
 * distinction the union can just about carry and the plates carry properly.
 */
export const GRAPHOSOMA_ITALICUM: Species = {
  id: 'graphosoma-italicum',
  taxonomy: {
    order: 'Hemiptera',
    family: 'Pentatomidae',
    genus: 'Graphosoma',
    species: 'italicum',
    // Parenthesised: Müller described it as a Cimex.
    authority: '(O. F. Müller, 1766)',
  },
  commonName: 'Italian striped shield bug',
  sizeMm: { min: 8, max: 12 },
  sizeBasis: 'body length',
  distribution:
    'Native across southern and central Europe from Iberia to the Balkans, and spreading north — it reached the Netherlands and southern England this century — on umbellifers in dry, sunny, open ground.',
  // Adults overwinter under leaf litter and are on the umbels from late spring
  // to autumn; one generation a year.
  activeMonths: [5, 6, 7, 8, 9, 10],
  monthsHemisphere: 'northern',
  morphology: {
    wingCover: 'hemelytra',
    antennae: 'filiform',
    // Six of them, running head to tail across the pronotum and down the
    // scutellum. The other record in the collection that says `stripes` is a
    // damselfly, which is about as far from this animal as the archive reaches.
    markings: 'stripes',
    bodyShape: 'round',
    sizeClass: 'small',
    colourFamily: 'red',
  },
  notes:
    'Orange-red with six black stripes running the length of the body, and a scutellum so enlarged that it covers almost the whole abdomen and leaves the hemelytra as a narrow strip down each side. Found in numbers on the flat white flowerheads of hogweed, wild carrot and their relatives, where it feeds on the developing seeds; the nymphs are rounder and mottled rather than striped. Long confused with Graphosoma lineatum, which is Mediterranean and has the front of the pronotum spotted rather than striped — most older plates, including the one this drawing was traced from, use the other name. The pattern is a warning: it is distasteful, and it does not hide.',
  sources: [
    {
      title: 'Graphosoma italicum — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Graphosoma_italicum',
    },
    {
      title: 'Graphosoma italicum (O. F. Müller, 1766) — GBIF Backbone Taxonomy',
      url: 'https://www.gbif.org/species/4485690',
    },
    {
      title: 'Graphosoma italicum — British Bugs',
      url: 'https://www.britishbugs.org.uk/heteroptera/Pentatomidae/graphosoma_italicum.html',
    },
  ],
  // Russet, like the peacock and the seven-spot: the palette's red earth.
  pigment: 2,
  // sqrt(12 / 75) against the stag beetle.
  scale: 0.4,
};
