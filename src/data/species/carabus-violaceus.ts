import type { Species } from '@/types';

/**
 * *Carabus violaceus* — the violet ground beetle.
 *
 * The collection's first beetle that does not fly. Its wing cases are fused
 * along the suture and there are no flight wings under them, which is why a
 * ground beetle is found by turning over a log rather than at a window — and
 * why the record still says `elytra`: the cases are there and they are hard,
 * and the key asks what covers the back rather than what is under it.
 *
 * It is also the first `filiform` beetle. Every other beetle in the archive is a
 * scarab or a ladybird and answers `lamellate` or `clavate`, so the key had
 * nothing to separate the Coleoptera on but shape and size; a chain of equal
 * antennal joints is a character a reader can see at arm's length.
 */
export const CARABUS_VIOLACEUS: Species = {
  id: 'carabus-violaceus',
  taxonomy: {
    order: 'Coleoptera',
    family: 'Carabidae',
    genus: 'Carabus',
    species: 'violaceus',
    // Unparenthesised: Linnaeus put it in the genus it is still in.
    authority: 'Linnaeus, 1758',
  },
  commonName: 'Violet ground beetle',
  sizeMm: { min: 20, max: 35 },
  sizeBasis: 'body length',
  distribution:
    'Native across northern and central Europe from the Pyrenees to the Urals, and common through Britain and Ireland, in woodland, hedgerows, gardens and moorland up to about 1,000 m.',
  // Adults overwinter and are out from the first mild nights of spring until the
  // frosts. Nocturnal, so the months are when it is active rather than when it
  // is seen.
  activeMonths: [4, 5, 6, 7, 8, 9, 10],
  morphology: {
    wingCover: 'elytra',
    antennae: 'filiform',
    markings: 'none',
    bodyShape: 'oval',
    sizeClass: 'large',
    // Black, with the violet only on the turned-up rim. A reader asked to name
    // the colour of this beetle says black, and the key asks the reader.
    colourFamily: 'black',
  },
  notes:
    'Black with a violet or indigo sheen confined to the reflexed outer margin of the wing cases and the edge of the pronotum, which is where the name comes from; the rest of the beetle is matt and finely granulate rather than striate. Flightless — the elytra are fused and there are no hindwings beneath them — so it hunts on foot at night, running down slugs, worms and caterpillars and killing them with a digestive secretion before eating them. Both adults and larvae are predatory, and a garden with a log pile keeps them. Handled, it will bite hard enough to be felt and spray a foul-smelling defensive fluid from the tip of the abdomen.',
  sources: [
    {
      title: 'Carabus violaceus — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Carabus_violaceus',
    },
    {
      title: 'Carabus violaceus Linnaeus, 1758 — GBIF Backbone Taxonomy',
      url: 'https://www.gbif.org/species/1032055',
    },
    {
      title: 'Violet ground beetle — The Wildlife Trusts',
      url: 'https://www.wildlifetrusts.org/wildlife-explorer/invertebrates/beetles/violet-ground-beetle',
    },
  ],
  // Slate: the coolest dark the palette has, and the only one that can carry a
  // beetle whose whole colour note is a violet rim.
  pigment: 4,
  // sqrt(35 / 75) against the stag beetle, the same yardstick every
  // body-length animal here is measured on.
  scale: 0.68,
};
