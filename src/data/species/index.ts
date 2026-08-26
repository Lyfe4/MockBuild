import type { Species } from '@/types';

import { ACHERONTIA_ATROPOS } from './acherontia-atropos';
import { AESHNA_CYANEA } from './aeshna-cyanea';
import { AGLAIS_IO } from './aglais-io';
import { ANOPLOGNATHUS_VIRIDIAENEUS } from './anoplognathus-viridiaeneus';
import { BOMBUS_TERRESTRIS } from './bombus-terrestris';
import { CARABUS_VIOLACEUS } from './carabus-violaceus';
import { CETONIA_AURATA } from './cetonia-aurata';
import { CHRYSOLINA_COERULANS } from './chrysolina-coerulans';
import { COCCINELLA_SEPTEMPUNCTATA } from './coccinella-septempunctata';
import { EUPOECILA_AUSTRALASIAE } from './eupoecila-australasiae';
import { FORMICA_RUFA } from './formica-rufa';
import { GRAPHOSOMA_ITALICUM } from './graphosoma-italicum';
import { GRYLLUS_CAMPESTRIS } from './gryllus-campestris';
import { ISCHNURA_ELEGANS } from './ischnura-elegans';
import { LUCANUS_CERVUS } from './lucanus-cervus';
import { PALOMENA_PRASINA } from './palomena-prasina';
import { PAPILIO_MACHAON } from './papilio-machaon';
import { VESPA_CRABRO } from './vespa-crabro';
/**
 * The entomological collection.
 *
 * **In accession order** — the order the specimens entered the archive, which
 * is the order their catalogue numbers are assigned in below. Not alphabetical:
 * an accession number is a fact about when a thing arrived, and re-sorting this
 * array must never renumber a specimen that is already catalogued. Adding a
 * species means appending to the end.
 *
 * The catalogue reads out in whatever order the visitor asks for; the default
 * is this one.
 *
 * Records and plates are two arrays joined by the `species` id rather than one
 * object with a `plate` field, because they have different lifetimes: a record
 * is written once from published sources and a plate gets redrawn. The plates
 * live in `./plates`, which is a separate entry point on purpose - that module's
 * own comment says why, and it is worth reading before importing it.
 */
export const SPECIES: readonly Species[] = [
  LUCANUS_CERVUS,
  COCCINELLA_SEPTEMPUNCTATA,
  PAPILIO_MACHAON,
  AESHNA_CYANEA,
  PALOMENA_PRASINA,
  BOMBUS_TERRESTRIS,
  VESPA_CRABRO,
  CETONIA_AURATA,
  CARABUS_VIOLACEUS,
  CHRYSOLINA_COERULANS,
  AGLAIS_IO,
  ACHERONTIA_ATROPOS,
  ISCHNURA_ELEGANS,
  FORMICA_RUFA,
  GRAPHOSOMA_ITALICUM,
  GRYLLUS_CAMPESTRIS,
  ANOPLOGNATHUS_VIRIDIAENEUS,
  EUPOECILA_AUSTRALASIAE,
];

/** The prefix on every accession number. Thornfield Entomological Archive. */
export const CATALOGUE_PREFIX = 'TEA';

/**
 * Accession numbers, assigned here rather than stored on the record.
 *
 * A number is the archive's, not the animal's — two collections holding the
 * same species give it different ones — so it belongs to the index that holds
 * the specimen and not to the file that describes it. Assigned from position,
 * which is why `SPECIES` is in accession order and stays that way.
 */
const NUMBERS: ReadonlyMap<string, string> = new Map(
  SPECIES.map((species, index) => [
    species.id,
    `${CATALOGUE_PREFIX}-${String(index + 1).padStart(4, '0')}`,
  ]),
);

/**
 * The accession number for one species, as `TEA-0001`.
 *
 * Falls back to the slug for a species the index does not hold, which only
 * happens in a test fixture — better a visible oddity in one cell than a blank
 * where a catalogue number should be.
 */
export function catalogueNumberOf(species: Species): string {
  return NUMBERS.get(species.id) ?? species.id;
}

/**
 * The first and last accession numbers in the collection, as
 * `['TEA-0001', 'TEA-0016']`, or `undefined` while the collection is empty.
 *
 * Derived, never written down. The 404 page quotes the range to somebody who
 * followed a broken link, and a range typed into that page is a fact that goes
 * stale on the next accession — quietly, because nothing renders it beside the
 * catalogue where the two could be seen to disagree.
 *
 * `undefined` for an empty collection rather than a pair of blanks: a caller
 * has to decide what to say when there is no range, and the honest thing is to
 * say nothing.
 */
export function catalogueRange(): readonly [first: string, last: string] | undefined {
  const first = SPECIES[0];
  const last = SPECIES[SPECIES.length - 1];

  if (first === undefined || last === undefined) return undefined;

  return [catalogueNumberOf(first), catalogueNumberOf(last)];
}

/** One species by slug, or `undefined` if the collection has no such record. */
export function findSpecies(id: string): Species | undefined {
  return SPECIES.find((species) => species.id === id);
}

export { ACHERONTIA_ATROPOS } from './acherontia-atropos';
export { AESHNA_CYANEA } from './aeshna-cyanea';
export { AGLAIS_IO } from './aglais-io';
export { ANOPLOGNATHUS_VIRIDIAENEUS } from './anoplognathus-viridiaeneus';
export { BOMBUS_TERRESTRIS } from './bombus-terrestris';
export { CARABUS_VIOLACEUS } from './carabus-violaceus';
export { CETONIA_AURATA } from './cetonia-aurata';
export { CHRYSOLINA_COERULANS } from './chrysolina-coerulans';
export { COCCINELLA_SEPTEMPUNCTATA } from './coccinella-septempunctata';
export { EUPOECILA_AUSTRALASIAE } from './eupoecila-australasiae';
export { FORMICA_RUFA } from './formica-rufa';
export { GRAPHOSOMA_ITALICUM } from './graphosoma-italicum';
export { GRYLLUS_CAMPESTRIS } from './gryllus-campestris';
export { ISCHNURA_ELEGANS } from './ischnura-elegans';
export { LUCANUS_CERVUS } from './lucanus-cervus';
export { PALOMENA_PRASINA } from './palomena-prasina';
export { PAPILIO_MACHAON } from './papilio-machaon';
export { VESPA_CRABRO } from './vespa-crabro';
