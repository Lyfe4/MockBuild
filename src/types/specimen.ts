import type { PlantForm } from '@/lib/plant';

import type { Season } from './season';

/**
 * The archive's core record: one mounted sheet, one accession.
 *
 * Enumerations are `as const` tuples rather than TypeScript `enum`s. A tuple
 * gives the same union type plus an iterable list of its members at runtime,
 * which is what filter UIs and the dataset tests need — and it disappears
 * entirely under `verbatimModuleSyntax` instead of emitting a runtime object.
 */

/**
 * Where a specimen was collected.
 *
 * Broad landscape types rather than a formal vegetation classification: enough
 * to filter by, coarse enough that a curator does not have to adjudicate.
 */
export const HABITATS = [
  'coastal-heath',
  'montane-forest',
  'riverine',
  'arid-scrub',
  'wetland',
  'grassland',
  'alpine',
  'rainforest-margin',
] as const;

export type Habitat = (typeof HABITATS)[number];

/** Display names. The stored values are slugs so they can go in a URL unescaped. */
export const HABITAT_LABELS: Record<Habitat, string> = {
  'coastal-heath': 'Coastal heath',
  'montane-forest': 'Montane forest',
  riverine: 'Riverine',
  'arid-scrub': 'Arid scrub',
  wetland: 'Wetland',
  grassland: 'Grassland',
  alpine: 'Alpine',
  'rainforest-margin': 'Rainforest margin',
};

/**
 * Conservation status, modelled loosely on the IUCN Red List categories.
 *
 * Loosely: the real list has more categories and a formal assessment process
 * behind each one. These are the six a fictional archive needs, in increasing
 * order of concern, and the order of this tuple is meaningful — sorts and
 * severity comparisons rely on it.
 */
export const CONSERVATION_STATUSES = ['LC', 'NT', 'VU', 'EN', 'CR', 'EX'] as const;

export type ConservationStatus = (typeof CONSERVATION_STATUSES)[number];

export const CONSERVATION_STATUS_LABELS: Record<ConservationStatus, string> = {
  LC: 'Least concern',
  NT: 'Near threatened',
  VU: 'Vulnerable',
  EN: 'Endangered',
  CR: 'Critically endangered',
  EX: 'Extinct',
};

export interface Specimen {
  /** Catalogue number, `TBA-` and four digits. Unique across the archive. */
  id: string;

  /** Invented binomial. Italicised in display, never in the data. */
  scientificName: string;

  commonName: string;

  /** Botanical family. Real families; the species within them are not. */
  family: string;

  habitat: Habitat;

  /**
   * When the plant flowers, and so when it is worth collecting. One to three
   * seasons; never empty.
   */
  seasons: readonly Season[];

  conservationStatus: ConservationStatus;

  /** Collection date, ISO 8601 `YYYY-MM-DD`, as written on the label. */
  collectedOn: string;

  collectedBy: string;

  /** Locality, as recorded. Fictional places. */
  region: string;

  /**
   * The curator's note. One or two sentences in herbarium-label register:
   * what is on the sheet, what is missing, what is unresolved.
   */
  notes: string;

  /**
   * Parameters for this specimen's illustration.
   *
   * Stored on the record rather than derived from it, because the drawing is a
   * curatorial judgement about how the plant looks, not something that falls
   * out of its taxonomy. The seed is derived from `id`, so the illustration is
   * stable without needing to be stored.
   */
  form: PlantForm;
}
