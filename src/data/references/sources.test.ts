import { describe, expect, it } from 'vitest';

import { SPECIES } from '@/data';
import { findPlate } from '@/data/species/plates';

import {
  findReferenceSource,
  publicationLine,
  REFERENCE_SOURCES,
  referenceFileName,
} from './sources';

/**
 * The reference records, against the collection and against the plates.
 *
 * `references/SOURCES.md` is checked separately, by `npm run sources:verify`,
 * which compares bytes. What is left for a test is the agreement this
 * arrangement can still get wrong: a species with no reference, a reference for
 * no species, a file that is named but not committed, and — the one that would
 * be silent — a licence or a year that says one thing in this module and
 * another in the plate that captions itself from its own copy.
 */

/**
 * Every file actually sitting in `references/`, by name.
 *
 * A build-time glob rather than `node:fs`: the app project is browser-scoped by
 * design and pulling Node's types into it for one test would be the wrong
 * trade — the same call `src/test/securityHeaders.test.ts` makes. Not eager, so
 * the keys are all that is read and no reference image is ever loaded, let alone
 * bundled.
 */
const COMMITTED = new Set(
  Object.keys(import.meta.glob('../../../references/*.jpg')).map(
    (path) => path.split('/').at(-1) ?? '',
  ),
);

describe('REFERENCE_SOURCES', () => {
  it('covers every species in the collection, in accession order', () => {
    // Order is content here, like `SPECIES` itself: the credits list reads out
    // in the order the archive did the work, and a reference appended out of
    // order would quietly reorder the page.
    expect(REFERENCE_SOURCES.map((source) => source.species)).toStrictEqual(
      SPECIES.map((species) => species.id),
    );
  });

  it('names a file that is actually committed', () => {
    for (const source of REFERENCE_SOURCES) {
      expect(COMMITTED.has(referenceFileName(source)), referenceFileName(source)).toBe(true);
    }
  });

  it('agrees with the plate that was traced from it', () => {
    for (const source of REFERENCE_SOURCES) {
      const plate = findPlate(source.species);

      expect(plate, source.species).toBeDefined();

      // Four fields, because these are the four a plate carries its own copy
      // of. A drawing captions itself from the plate — the specimen sheet reads
      // `plate.reference` — and the About page credits it from this module, so
      // a difference between them is two different claims about one licence.
      expect(plate?.reference.artist, source.species).toBe(source.artist);
      expect(plate?.reference.year, source.species).toBe(source.year);
      expect(plate?.reference.licence, source.species).toBe(source.licence);
      expect(plate?.reference.source, source.species).toBe(source.sourcePage);
    }
  });

  it('finds a reference by species id, and nothing for an id it has never heard of', () => {
    expect(findReferenceSource('lucanus-cervus')?.artist).toBe('Emil Hochdanz');
    expect(findReferenceSource('anoplognathus-porosus')).toBeUndefined();
  });

  it('states a licence and a source page for every reference', () => {
    for (const source of REFERENCE_SOURCES) {
      expect(source.licence, source.species).toMatch(/public domain/i);
      // Every entry is public domain today. If one ever is not, this is the
      // assertion that should be argued with rather than deleted: the folder's
      // own preamble promises redistribution is permitted.
      expect(source.sourcePage, source.species).toMatch(/^https:\/\//);
      expect(source.notes.length, source.species).toBeGreaterThan(0);
    }
  });
});

describe('publicationLine', () => {
  it('credits the book’s author, then the work, then the imprint and figure', () => {
    const stag = findReferenceSource('lucanus-cervus');

    expect(stag).toBeDefined();
    expect(publicationLine(stag!)).toBe(
      'Carl Gustav Calwer & Gustav Jäger, _Käferbuch. Naturgeschichte der Käfer Europas_, ' +
        'Stuttgart: Julius Hoffmann, 1876 — Table 22, figure 20',
    );
  });

  it('omits an author who is the artist, and translates a title that needs it', () => {
    const chafer = findReferenceSource('cetonia-aurata');
    const hawker = findReferenceSource('aeshna-cyanea');

    expect(publicationLine(chafer!)).toContain(
      '_Zhuki Rossii i Zapadnoi Evropy_ (Beetles of Russia and Western Europe)',
    );
    // Lucas wrote and drew his own book, so naming him twice would read as two
    // people.
    expect(publicationLine(hawker!)).toBe(
      '_British Dragonflies (Odonata)_, London: L. Upcott Gill, 1900 — Plate XVII',
    );
  });

  it('appends a note after the figure as its own sentence', () => {
    const swallowtail = findReferenceSource('papilio-machaon');

    expect(publicationLine(swallowtail!)).toBe(
      '_Das kleine Schmetterlingsbuch: Die Tagfalter_, Insel-Bücherei Nr. 213. Reproduced there; ' +
        'the plate itself is Hübner’s and considerably older than that edition.',
    );
  });
});
