import type { SpeciesPlate } from '@/lib/plate';

/**
 * The drawings, in a module of their own - and a **separate entry point** from
 * the records beside them.
 *
 * ## Why this is not in `index.ts`
 *
 * It was, and it cost the landing page most of two seconds.
 *
 * Eighteen plates are 258 kB of path data. `src/data/species/index.ts` imported
 * every one of them to build the array below, `src/data/index.ts` re-exported
 * `findPlate`, and the catalogue - the one route that is eagerly imported,
 * because it is the page a visitor lands on - imports `SPECIES` from that
 * barrel. So the whole 258 kB became a dependency of the entry chunk, was
 * `modulepreload`ed, and had to arrive and be parsed before React could mount.
 *
 * Lighthouse measured a 4.4 s largest contentful paint on that build, nine
 * tenths of it render delay, on an LCP element that is a paragraph of plain
 * text.
 *
 * Splitting the module is what fixes it. `@/data` is now records - names,
 * taxonomy, months, morphology, provenance - and reaches no path data at all. A
 * caller that wants a drawing asks for one from here, and that import is a chunk
 * boundary the bundler can see.
 *
 * ## So importing this has a cost, and it is meant to be visible
 *
 * Reaching for `findPlate` pulls in every plate in the collection, because the
 * catalogue, the calendar and the key each draw all of them and one shared chunk
 * is the honest shape of that dependency. Every route that imports it is itself
 * lazily loaded, so the cost lands with the route rather than ahead of it; the
 * catalogue, which is not lazy, loads its thumbnails through `SpecimenRow`'s own
 * dynamic import after the page has painted.
 *
 * If you are adding an import of this module to something eager, that is the
 * thing to think about first.
 */
import { ACHERONTIA_ATROPOS_PLATE } from './acherontia-atropos.plate';
import { AESHNA_CYANEA_PLATE } from './aeshna-cyanea.plate';
import { AGLAIS_IO_PLATE } from './aglais-io.plate';
import { ANOPLOGNATHUS_VIRIDIAENEUS_PLATE } from './anoplognathus-viridiaeneus.plate';
import { BOMBUS_TERRESTRIS_PLATE } from './bombus-terrestris.plate';
import { CARABUS_VIOLACEUS_PLATE } from './carabus-violaceus.plate';
import { CETONIA_AURATA_PLATE } from './cetonia-aurata.plate';
import { CHRYSOLINA_COERULANS_PLATE } from './chrysolina-coerulans.plate';
import { COCCINELLA_SEPTEMPUNCTATA_PLATE } from './coccinella-septempunctata.plate';
import { EUPOECILA_AUSTRALASIAE_PLATE } from './eupoecila-australasiae.plate';
import { FORMICA_RUFA_PLATE } from './formica-rufa.plate';
import { GRAPHOSOMA_ITALICUM_PLATE } from './graphosoma-italicum.plate';
import { GRYLLUS_CAMPESTRIS_PLATE } from './gryllus-campestris.plate';
import { ISCHNURA_ELEGANS_PLATE } from './ischnura-elegans.plate';
import { LUCANUS_CERVUS_PLATE } from './lucanus-cervus.plate';
import { PALOMENA_PRASINA_PLATE } from './palomena-prasina.plate';
import { PAPILIO_MACHAON_PLATE } from './papilio-machaon.plate';
import { VESPA_CRABRO_PLATE } from './vespa-crabro.plate';

/**
 * Every plate, in the same order as `SPECIES`.
 *
 * Records and plates are two arrays joined by the `species` id rather than one
 * object with a `plate` field, because they have different lifetimes: a record
 * is written once from published sources and a plate gets redrawn. That is also
 * what makes this split possible at all.
 */
export const PLATES: readonly SpeciesPlate[] = [
  LUCANUS_CERVUS_PLATE,
  COCCINELLA_SEPTEMPUNCTATA_PLATE,
  PAPILIO_MACHAON_PLATE,
  AESHNA_CYANEA_PLATE,
  PALOMENA_PRASINA_PLATE,
  BOMBUS_TERRESTRIS_PLATE,
  VESPA_CRABRO_PLATE,
  CETONIA_AURATA_PLATE,
  CARABUS_VIOLACEUS_PLATE,
  CHRYSOLINA_COERULANS_PLATE,
  AGLAIS_IO_PLATE,
  ACHERONTIA_ATROPOS_PLATE,
  ISCHNURA_ELEGANS_PLATE,
  FORMICA_RUFA_PLATE,
  GRAPHOSOMA_ITALICUM_PLATE,
  GRYLLUS_CAMPESTRIS_PLATE,
  ANOPLOGNATHUS_VIRIDIAENEUS_PLATE,
  EUPOECILA_AUSTRALASIAE_PLATE,
];

/** The plate for one species, or `undefined` if none has been drawn yet. */
export function findPlate(id: string): SpeciesPlate | undefined {
  return PLATES.find((plate) => plate.species === id);
}

export { ACHERONTIA_ATROPOS_PLATE } from './acherontia-atropos.plate';
export { AESHNA_CYANEA_PLATE } from './aeshna-cyanea.plate';
export { AGLAIS_IO_PLATE } from './aglais-io.plate';
export { ANOPLOGNATHUS_VIRIDIAENEUS_PLATE } from './anoplognathus-viridiaeneus.plate';
export { BOMBUS_TERRESTRIS_PLATE } from './bombus-terrestris.plate';
export { CARABUS_VIOLACEUS_PLATE } from './carabus-violaceus.plate';
export { CETONIA_AURATA_PLATE } from './cetonia-aurata.plate';
export { CHRYSOLINA_COERULANS_PLATE } from './chrysolina-coerulans.plate';
export { COCCINELLA_SEPTEMPUNCTATA_PLATE } from './coccinella-septempunctata.plate';
export { EUPOECILA_AUSTRALASIAE_PLATE } from './eupoecila-australasiae.plate';
export { FORMICA_RUFA_PLATE } from './formica-rufa.plate';
export { GRAPHOSOMA_ITALICUM_PLATE } from './graphosoma-italicum.plate';
export { GRYLLUS_CAMPESTRIS_PLATE } from './gryllus-campestris.plate';
export { ISCHNURA_ELEGANS_PLATE } from './ischnura-elegans.plate';
export { LUCANUS_CERVUS_PLATE } from './lucanus-cervus.plate';
export { PALOMENA_PRASINA_PLATE } from './palomena-prasina.plate';
export { PAPILIO_MACHAON_PLATE } from './papilio-machaon.plate';
export { VESPA_CRABRO_PLATE } from './vespa-crabro.plate';
