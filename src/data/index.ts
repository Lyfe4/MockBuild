export { INSTITUTION } from './institution';
export { findJournalEntry, JOURNAL_ENTRIES, JOURNAL_PARSES, journalNeighbours } from './journal';
export type { ReferenceSource } from './references';
export {
  findReferenceSource,
  publicationLine,
  REFERENCE_SOURCES,
  referenceFileName,
} from './references';
export { SITE, siteUrl } from './site';
export { catalogueNumberOf, catalogueRange, findSpecies, SPECIES } from './species';

/**
 * `findPlate` is deliberately **not** re-exported here.
 *
 * This barrel is the records — every route imports it, including the eagerly
 * loaded catalogue, so anything reachable from it is on the critical path. The
 * eighteen plates are 258 kB of path data and were reachable from it, which is
 * how they came to be `modulepreload`ed ahead of the landing page's first paint.
 *
 * Drawings come from `@/data/species/plates` instead, and that module's own
 * comment sets out what importing it costs. Re-exporting it from here would
 * quietly undo the split, since the cost is invisible at the call site.
 */
