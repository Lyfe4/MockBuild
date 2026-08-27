import { describe, expect, it } from 'vitest';

import { SPECIES } from '@/data';
import { SITE, siteUrl } from '@/data/site';

import { clampDescription, DESCRIPTION_LIMIT, documentTitle, routeMeta } from './routeMeta';
import { catalogueDataset, specimenPath, speciesTaxon } from './schema';

describe('siteUrl', () => {
  it('makes one URL out of the several ways a path can be written', () => {
    // The point of normalising: `/catalogue`, `catalogue` and `/catalogue/` are
    // the same page, and three canonical links spelling it three ways is three
    // pages as far as a crawler is concerned.
    expect(siteUrl('/catalogue')).toBe(`${SITE.origin}/catalogue`);
    expect(siteUrl('catalogue')).toBe(`${SITE.origin}/catalogue`);
    expect(siteUrl('/catalogue/')).toBe(`${SITE.origin}/catalogue`);
  });

  it('keeps the root’s trailing slash, which is the conventional form', () => {
    expect(siteUrl('/')).toBe(`${SITE.origin}/`);
    expect(siteUrl('')).toBe(`${SITE.origin}/`);
  });

  it('names a real origin rather than a placeholder', () => {
    // `index.html` carried `https://example.com` behind a comment saying to
    // replace it before the site went public. Nothing failed if you forgot.
    expect(SITE.origin).toMatch(/^https:\/\//);
    expect(SITE.origin).not.toMatch(/example\.(com|org|net)/);
    expect(SITE.origin).not.toMatch(/\/$/);
  });
});

describe('documentTitle', () => {
  it('appends the archive’s name, and does not repeat it on the home page', () => {
    expect(documentTitle('Calendar')).toBe(`Calendar · ${SITE.name}`);
    expect(documentTitle('')).toBe(SITE.name);
  });
});

describe('clampDescription', () => {
  it('leaves a description that already fits', () => {
    expect(clampDescription('Short enough.')).toBe('Short enough.');
  });

  it('cuts at a word boundary rather than mid-word', () => {
    const clamped = clampDescription('a'.repeat(20) + ' ' + 'b'.repeat(200), 40);

    expect(clamped.length).toBeLessThanOrEqual(40);
    expect(clamped.endsWith('…')).toBe(true);
    // The whole first word survives; the second is dropped rather than halved.
    expect(clamped).toBe('a'.repeat(20) + '…');
  });

  it('flattens the whitespace a record’s prose arrives with', () => {
    expect(clampDescription('one\n  two\tthree')).toBe('one two three');
  });

  it('does not leave a dangling comma before the ellipsis', () => {
    expect(clampDescription('Broad, heavily convex, and metallic green', 20)).not.toMatch(
      /[,;:.]…$/,
    );
  });
});

describe('routeMeta', () => {
  it('composes a complete set, absolute canonical included', () => {
    const meta = routeMeta({ title: 'Calendar', description: 'When they fly.', path: '/calendar' });

    expect(meta).toStrictEqual({
      title: `Calendar · ${SITE.name}`,
      description: 'When they fly.',
      canonical: `${SITE.origin}/calendar`,
      ogType: 'website',
    });
  });

  it('defaults to a website and lets a journal entry say otherwise', () => {
    expect(routeMeta({ title: 'a', description: 'b', path: '/c' }).ogType).toBe('website');
    expect(routeMeta({ title: 'a', description: 'b', path: '/c', ogType: 'article' }).ogType).toBe(
      'article',
    );
  });
});

describe('every specimen’s metadata', () => {
  it('fits what a search result will show, and names both names', () => {
    for (const species of SPECIES) {
      const binomial = `${species.taxonomy.genus} ${species.taxonomy.species}`;
      const meta = routeMeta({
        title: `${binomial} — ${species.commonName}`,
        description: clampDescription(
          `${species.commonName}, ${species.taxonomy.family}. ${species.notes}`,
        ),
        path: specimenPath(species),
      });

      // Both names, because the two audiences search for different ones.
      expect(meta.title, species.id).toContain(binomial);
      expect(meta.title, species.id).toContain(species.commonName);
      expect(meta.description.length, species.id).toBeLessThanOrEqual(DESCRIPTION_LIMIT);
      expect(meta.description, species.id).not.toMatch(/\s{2,}|\n/);
      expect(meta.canonical, species.id).toBe(`${SITE.origin}/specimen/${species.id}`);
    }
  });
});

describe('the structured data', () => {
  it('describes the catalogue as a dataset and discloses the fiction in it', () => {
    const dataset = catalogueDataset(SPECIES);

    expect(dataset['@type']).toBe('Dataset');
    expect(dataset.name).toContain(SITE.name);
    // The disclosure has to be *in* the markup. A machine that reads only the
    // JSON-LD never sees the About page, and this is the one place the claim
    // "the institution is a fiction" can travel with the data.
    expect(String(dataset.description)).toMatch(/fiction/i);
    expect(String(dataset.description)).toContain(String(SPECIES.length));
  });

  it('claims no organisation anywhere, which is the whole rule', () => {
    // Thornfield is invented. A `Museum` or `Organization` node with a town and
    // a founding year is a machine-readable claim that it exists, made in the
    // one place a reader never looks — so no schema on this site has one, and
    // this test is what keeps it that way.
    const graphs = [catalogueDataset(SPECIES), ...SPECIES.map((s) => speciesTaxon(s))];

    for (const graph of graphs) {
      const json = JSON.stringify(graph);

      expect(json).not.toMatch(/"@type"\s*:\s*"(Organization|Museum|CollectionPage|Place)"/);
      expect(json).not.toMatch(/foundingDate|address|geo|telephone/);
    }
  });

  it('describes each species as a taxon, with its rank and its parents', () => {
    for (const species of SPECIES) {
      const taxon = speciesTaxon(species);

      expect(taxon['@type'], species.id).toBe('Taxon');
      expect(taxon.name, species.id).toBe(`${species.taxonomy.genus} ${species.taxonomy.species}`);
      expect(taxon.taxonRank, species.id).toBe('species');
      expect(taxon.url, species.id).toBe(`${SITE.origin}/specimen/${species.id}`);

      const json = JSON.stringify(taxon);

      expect(json, species.id).toContain(species.taxonomy.family);
      expect(json, species.id).toContain(species.taxonomy.order);
      // No accession number: that is Thornfield's, not the animal's, which is
      // the same reason the record does not store one.
      expect(json, species.id).not.toMatch(/TEA-\d{4}/);
      // And no image: the plate is this archive's drawing, not a photograph of
      // a specimen, and an `image` on a taxon reads as the latter.
      expect(json, species.id).not.toContain('"image"');
    }
  });
});
