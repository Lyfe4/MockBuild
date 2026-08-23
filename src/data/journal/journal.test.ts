import { describe, expect, it } from 'vitest';

import { SPECIES } from '@/data';
import { parseJournalEntry, plainText } from '@/lib/journal';

import { findJournalEntry, JOURNAL_ENTRIES, JOURNAL_PARSES, journalNeighbours } from './index';

/**
 * The real content files, parsed the way the site parses them.
 *
 * The first test is the one that matters and it is the reason the parse keeps
 * its problems instead of throwing: **a bad file fails here, by name, with what
 * is wrong with it.** The route renders what parsed, so without this a
 * frontmatter typo would drop an entry out of the index and nothing anywhere
 * would say so.
 */

describe('the journal content', () => {
  it('parses every file with no problems', () => {
    const broken = JOURNAL_PARSES.filter((parse) => parse.problems.length > 0).map(
      (parse) => `${parse.slug}: ${parse.problems.join('; ')}`,
    );

    expect(broken, broken.join('\n')).toStrictEqual([]);
  });

  it('found the files at all', () => {
    // A glob that matches nothing is a silently empty journal, which looks
    // exactly like a journal with no entries yet.
    expect(JOURNAL_ENTRIES.length).toBeGreaterThanOrEqual(5);
    expect(JOURNAL_ENTRIES).toHaveLength(JOURNAL_PARSES.length);
  });

  it('is ordered newest first', () => {
    const dates = JOURNAL_ENTRIES.map((entry) => entry.date);

    expect(dates).toStrictEqual([...dates].sort().reverse());
  });

  it('names a real specimen wherever it names one', () => {
    const ids = SPECIES.map((species) => species.id);

    for (const entry of JOURNAL_ENTRIES) {
      if (entry.speciesId === undefined) continue;

      expect(ids, entry.slug).toContain(entry.speciesId);
    }
  });

  it('links to the specimen it is about, in the prose as well as the margin', () => {
    // The margin thumbnail comes from `speciesId`; the link in the text is the
    // writer's, and an entry about an animal that never names it reads as
    // filler.
    for (const entry of JOURNAL_ENTRIES) {
      if (entry.speciesId === undefined) continue;

      const hrefs = entry.blocks.flatMap((block) => {
        const spans = block.kind === 'list' ? block.items.flat() : block.spans;

        return spans.flatMap((span) => (span.kind === 'link' ? [span.href] : []));
      });

      expect(hrefs, entry.slug).toContain(`/specimen/${entry.speciesId}`);
    }
  });

  it('gives every entry a lede that reads as a sentence', () => {
    for (const entry of JOURNAL_ENTRIES) {
      expect(entry.lede.length, entry.slug).toBeGreaterThan(40);
      // Plain text, so it can go into a title attribute or a feed without
      // carrying markup with it.
      expect(entry.lede, entry.slug).not.toMatch(/[<>*_[\]]/);
    }
  });

  it('keeps every entry between 150 and 250 words', () => {
    for (const entry of JOURNAL_ENTRIES) {
      const words = entry.blocks
        .map((block) => plainText(block.kind === 'list' ? block.items.flat() : block.spans))
        .join(' ')
        .split(/\s+/)
        .filter((word) => word !== '').length;

      expect(words, `${entry.slug} has ${String(words)} words`).toBeGreaterThanOrEqual(150);
      expect(words, `${entry.slug} has ${String(words)} words`).toBeLessThanOrEqual(250);
    }
  });
});

describe('findJournalEntry', () => {
  it('finds an entry by slug, and nothing for a slug it has never heard of', () => {
    expect(findJournalEntry('five-legs')?.title).toBe('Five legs');
    expect(findJournalEntry('a-week-in-provence')).toBeUndefined();
  });
});

describe('journalNeighbours', () => {
  it('walks the list, with nothing either side of the ends', () => {
    const first = JOURNAL_ENTRIES[0];
    const last = JOURNAL_ENTRIES.at(-1);

    expect(first).toBeDefined();
    expect(last).toBeDefined();
    expect(journalNeighbours(first!.slug).previous).toBeUndefined();
    expect(journalNeighbours(last!.slug).next).toBeUndefined();
    // "Previous" is the newer entry, because the list reads newest first.
    expect(journalNeighbours(JOURNAL_ENTRIES[1]!.slug).previous?.slug).toBe(first!.slug);
  });

  it('reports nothing for a slug that is not in the list', () => {
    expect(journalNeighbours('nothing')).toStrictEqual({
      previous: undefined,
      next: undefined,
    });
  });
});

describe('a bad file', () => {
  it('is reported rather than absorbed', () => {
    // The same parse the data module runs, on a file with two mistakes in it.
    // This is what the first test in this file would print if a real entry ever
    // looked like this.
    const { entry, problems } = parseJournalEntry(
      'a-bad-entry',
      ['---', 'title: A', 'date: 2026-02-30', 'season: winter', '---', ''].join('\n'),
      { species: SPECIES.map((species) => species.id) },
    );

    expect(entry).toBeUndefined();
    expect(problems).toStrictEqual([
      '"date" is not a real day — 2026-02-30',
      'no prose: the entry has no paragraph',
    ]);
  });
});
