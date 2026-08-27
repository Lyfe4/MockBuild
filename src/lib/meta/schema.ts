import { SITE, siteUrl } from '@/data/site';
import type { Species } from '@/types';

/**
 * schema.org descriptions of what this site holds.
 *
 * ## What is and is not claimed
 *
 * Structured data is read by machines that will not read the About page, so the
 * fiction has to be disclosed *inside* the markup or not asserted at all. The
 * rule here is: **describe the data, never the institution.**
 *
 * So there is no `Organization`, no `Museum`, no `address`, no `foundingDate`.
 * Thornfield is invented, and a `Museum` node with a town and a founding year in
 * it is a machine-readable claim that an entomological collection exists in
 * Armidale, which is exactly the sort of thing a search engine will repeat
 * without the paragraph that says otherwise. `INSTITUTION` is deliberately not
 * imported by this module.
 *
 * What *is* claimed is true. The catalogue is a `Dataset`: eighteen records
 * about real species, each with a licence and a provenance, which is a fair
 * description of what the repository actually contains. Each specimen page
 * carries the `Taxon` the record is about — the binomial, the rank, the
 * authority, the parent order — because those are facts about the animal and
 * they are the same whoever holds the pin.
 *
 * The disclosure rides along in the `Dataset` description rather than being left
 * to the page, so a consumer that reads only the JSON-LD still gets it.
 */

/** The URL a taxon's page lives at. */
export function specimenPath(species: Species): string {
  return `/specimen/${species.id}`;
}

/**
 * The catalogue as a `Dataset`.
 *
 * `creativeWorkStatus` and the licence are the honest parts: the records are
 * compiled from published sources, the plates are original work, and the
 * repository is MIT. `isAccessibleForFree` is true and worth saying — a dataset
 * node without it invites the assumption that there is a paywall.
 */
export function catalogueDataset(species: readonly Species[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${SITE.name} — specimen catalogue`,
    url: siteUrl('/catalogue'),
    description:
      `Accession records for ${String(species.length)} insect species across six orders, each ` +
      'with taxonomy, distribution, months of adult activity, six morphological characters and a ' +
      'hand-drawn plate traced from a public-domain reference. The species and the records are ' +
      'real and sourced; the holding institution is a fiction, and no specimens exist.',
    keywords: [
      'entomology',
      'insects',
      'taxonomy',
      'phenology',
      'scientific illustration',
      'identification key',
    ],
    license: 'https://opensource.org/licenses/MIT',
    isAccessibleForFree: true,
    creativeWorkStatus: 'Published',
    variableMeasured: [
      'taxonomy',
      'body length',
      'distribution',
      'months of adult activity',
      'wing cover',
      'antennal form',
      'markings',
      'body shape',
      'size class',
      'colour',
    ],
    // Every record names its own sources on its own page; this is the count, so
    // a consumer knows the size of the thing without crawling it.
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'text/html',
      contentUrl: siteUrl('/catalogue'),
    },
  };
}

/**
 * One species as a `Taxon`.
 *
 * Only the fields that are facts about the animal. No `image`: the plate is this
 * archive's drawing of the species rather than a photograph of a specimen, and
 * an `image` on a `Taxon` reads as the latter. No accession number either — that
 * is the invented archive's, not the animal's, which is the same reason the
 * record does not store one.
 */
export function speciesTaxon(species: Species): Record<string, unknown> {
  const { taxonomy } = species;

  return {
    '@context': 'https://schema.org',
    '@type': 'Taxon',
    name: `${taxonomy.genus} ${taxonomy.species}`,
    alternateName: species.commonName,
    taxonRank: 'species',
    url: siteUrl(specimenPath(species)),
    description: species.distribution,
    parentTaxon: {
      '@type': 'Taxon',
      name: taxonomy.family,
      taxonRank: 'family',
      parentTaxon: {
        '@type': 'Taxon',
        name: taxonomy.order,
        taxonRank: 'order',
      },
    },
    // The authority is part of the name in the sense that matters to anyone
    // checking it against a nomenclator, so it travels as an identifier rather
    // than being glued onto `name`.
    identifier: `${taxonomy.genus} ${taxonomy.species} ${taxonomy.authority}`,
    isPartOf: {
      '@type': 'Dataset',
      name: `${SITE.name} — specimen catalogue`,
      url: siteUrl('/catalogue'),
    },
  };
}
