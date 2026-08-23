import type { Species } from '@/types';

/**
 * *Gryllus campestris* — the field cricket.
 *
 * The sixth order, and the one that made `WING_COVERS` grow. An orthopteran's
 * forewings are *tegmina*: leathery rather than hardened, and overlapping one
 * another rather than meeting at a seam. Neither `elytra` nor `membranous` was
 * true of them, and the union gained a state rather than the record being made
 * to answer approximately — which is the same call the green shield bug forced
 * when `hemelytra` was added.
 *
 * That state was inserted in the middle of the list, between `hemelytra` and
 * `membranous`, where the character belongs. It used to be impossible to do
 * that safely: key answers travelled in a URL as their position in the union.
 * They travel as a hash of their name now, and this insertion is the first thing
 * that proved it.
 */
export const GRYLLUS_CAMPESTRIS: Species = {
  id: 'gryllus-campestris',
  taxonomy: {
    order: 'Orthoptera',
    family: 'Gryllidae',
    genus: 'Gryllus',
    species: 'campestris',
    // Unparenthesised: Linnaeus put it in the genus it is still in.
    authority: 'Linnaeus, 1758',
  },
  commonName: 'Field cricket',
  sizeMm: { min: 19, max: 27 },
  sizeBasis: 'body length',
  distribution:
    'Native across southern and central Europe and North Africa, on dry, short, sunny grassland with bare ground to burrow in; at the northern edge of that range, in Britain, it came within a handful of individuals of extinction and survives on a few managed heaths.',
  // Adults sing from late spring and are gone by high summer; the animal
  // overwinters as a nymph, so its season is short and early for its size.
  activeMonths: [5, 6, 7],
  morphology: {
    // Leathery covers, one overlapping the other. The state this record added.
    wingCover: 'tegmina',
    antennae: 'filiform',
    markings: 'none',
    bodyShape: 'elongate',
    sizeClass: 'medium',
    colourFamily: 'black',
  },
  notes:
    'Glossy black and heavy-bodied, with a large rounded head, a saddle-shaped pronotum and a yellow patch at the base of each leathery forewing. It digs a burrow in bare sunny ground, sits at the mouth of it and sings — the male rasps a file on one forewing across a scraper on the other, and the sound carries a hundred metres and more. Flightless: the hindwings are vestigial, so a population that loses its patch of short turf cannot reach the next one. That is why the British population collapsed to a single site by 1990, and why its recovery has had to be done by hand, moving nymphs to prepared heathland.',
  sources: [
    {
      title: 'Gryllus campestris — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Gryllus_campestris',
    },
    {
      title: 'Gryllus campestris Linnaeus, 1758 — GBIF Backbone Taxonomy',
      url: 'https://www.gbif.org/species/1716462',
    },
    {
      title: 'Field cricket — Species Recovery Trust',
      url: 'https://www.speciesrecoverytrust.org.uk/field-cricket',
    },
  ],
  // Umber, like the wood ant: a warm dark, and the cricket is black with brown
  // tegmina rather than black all through.
  pigment: 5,
  // sqrt(27 / 75) against the stag beetle.
  scale: 0.6,
};
