import type { SpeciesPlate } from '@/lib/plate';
import type { Species } from '@/types';

import { AESHNA_CYANEA } from './aeshna-cyanea';
import { AESHNA_CYANEA_PLATE } from './aeshna-cyanea.plate';
import { BOMBUS_TERRESTRIS } from './bombus-terrestris';
import { BOMBUS_TERRESTRIS_PLATE } from './bombus-terrestris.plate';
import { CETONIA_AURATA } from './cetonia-aurata';
import { CETONIA_AURATA_PLATE } from './cetonia-aurata.plate';
import { COCCINELLA_SEPTEMPUNCTATA } from './coccinella-septempunctata';
import { COCCINELLA_SEPTEMPUNCTATA_PLATE } from './coccinella-septempunctata.plate';
import { LUCANUS_CERVUS } from './lucanus-cervus';
import { LUCANUS_CERVUS_PLATE } from './lucanus-cervus.plate';
import { PALOMENA_PRASINA } from './palomena-prasina';
import { PALOMENA_PRASINA_PLATE } from './palomena-prasina.plate';
import { PAPILIO_MACHAON } from './papilio-machaon';
import { PAPILIO_MACHAON_PLATE } from './papilio-machaon.plate';
import { VESPA_CRABRO } from './vespa-crabro';
import { VESPA_CRABRO_PLATE } from './vespa-crabro.plate';

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
 * is written once from published sources and a plate gets redrawn.
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
];

const PLATES: readonly SpeciesPlate[] = [
  LUCANUS_CERVUS_PLATE,
  COCCINELLA_SEPTEMPUNCTATA_PLATE,
  PAPILIO_MACHAON_PLATE,
  AESHNA_CYANEA_PLATE,
  PALOMENA_PRASINA_PLATE,
  BOMBUS_TERRESTRIS_PLATE,
  VESPA_CRABRO_PLATE,
  CETONIA_AURATA_PLATE,
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

/** One species by slug, or `undefined` if the collection has no such record. */
export function findSpecies(id: string): Species | undefined {
  return SPECIES.find((species) => species.id === id);
}

/** The plate for one species, or `undefined` if none has been drawn yet. */
export function findPlate(id: string): SpeciesPlate | undefined {
  return PLATES.find((plate) => plate.species === id);
}

export { AESHNA_CYANEA } from './aeshna-cyanea';
export { AESHNA_CYANEA_PLATE } from './aeshna-cyanea.plate';
export { BOMBUS_TERRESTRIS } from './bombus-terrestris';
export { BOMBUS_TERRESTRIS_PLATE } from './bombus-terrestris.plate';
export { CETONIA_AURATA } from './cetonia-aurata';
export { CETONIA_AURATA_PLATE } from './cetonia-aurata.plate';
export { COCCINELLA_SEPTEMPUNCTATA } from './coccinella-septempunctata';
export { COCCINELLA_SEPTEMPUNCTATA_PLATE } from './coccinella-septempunctata.plate';
export { LUCANUS_CERVUS } from './lucanus-cervus';
export { LUCANUS_CERVUS_PLATE } from './lucanus-cervus.plate';
export { PALOMENA_PRASINA } from './palomena-prasina';
export { PALOMENA_PRASINA_PLATE } from './palomena-prasina.plate';
export { PAPILIO_MACHAON } from './papilio-machaon';
export { PAPILIO_MACHAON_PLATE } from './papilio-machaon.plate';
export { VESPA_CRABRO } from './vespa-crabro';
export { VESPA_CRABRO_PLATE } from './vespa-crabro.plate';
