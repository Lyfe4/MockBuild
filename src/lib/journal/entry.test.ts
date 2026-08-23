import { describe, expect, it } from 'vitest';

import { byDateDescending, parseJournalEntry } from './entry';
import { parseFrontmatter } from './frontmatter';
import type { JournalEntry } from './types';

/**
 * Frontmatter validation, one mistake at a time.
 *
 * Every case here is a file somebody will write. The point of each assertion is
 * that the mistake is *named* rather than absorbed: an entry that loses its
 * thumbnail or shows the wrong season tag looks fine on the page, so the only
 * place it can be caught is here.
 */

const SPECIES = ['lucanus-cervus', 'aeshna-cyanea'];

/** A valid file, with `fields` merged over its frontmatter. */
function file(fields: Record<string, string | null> = {}, body = 'A paragraph of prose.'): string {
  const frontmatter: Record<string, string | null> = {
    title: 'Five legs',
    date: '2026-03-07',
    season: 'autumn',
    ...fields,
  };

  const lines = Object.entries(frontmatter)
    .filter(([, value]) => value !== null)
    .map(([key, value]) => `${key}: ${String(value)}`);

  return ['---', ...lines, '---', '', body].join('\n');
}

function parse(raw: string, slug = 'five-legs') {
  return parseJournalEntry(slug, raw, { species: SPECIES });
}

describe('parseFrontmatter', () => {
  it('reads key/value pairs and hands back the body', () => {
    const block = parseFrontmatter('---\ntitle: A\n---\n\nBody.\n');

    expect(block.problems).toStrictEqual([]);
    expect(block.fields.get('title')).toBe('A');
    expect(block.body.trim()).toBe('Body.');
  });

  it('strips one pair of surrounding quotes', () => {
    const block = parseFrontmatter('---\ntitle: "A: with a colon"\n---\n');

    expect(block.fields.get('title')).toBe('A: with a colon');
  });

  it('reports a missing opening delimiter and keeps the whole file as body', () => {
    const block = parseFrontmatter('title: A\n\nBody.');

    expect(block.problems).toStrictEqual([
      'no frontmatter: the file must open with a --- delimiter',
    ]);
    expect(block.body).toContain('Body.');
  });

  it('reports an unterminated block', () => {
    expect(parseFrontmatter('---\ntitle: A\n\nBody.').problems).toStrictEqual([
      'unterminated frontmatter: no closing --- delimiter',
    ]);
  });

  it('reports a line that is not a pair, and a duplicate key', () => {
    const block = parseFrontmatter('---\ntitle: A\nnot a pair\ntitle: B\n---\n');

    expect(block.problems).toHaveLength(2);
    expect(block.problems[0]).toContain('not a "key: value" pair');
    expect(block.problems[1]).toContain('duplicate key "title"');
    // The first value wins, so a duplicate cannot silently override.
    expect(block.fields.get('title')).toBe('A');
  });

  it('survives CRLF line endings', () => {
    const block = parseFrontmatter('---\r\ntitle: A\r\n---\r\n\r\nBody.\r\n');

    expect(block.problems).toStrictEqual([]);
    // A stray \r would end up inside a season name and match nothing.
    expect(block.fields.get('title')).toBe('A');
  });
});

describe('parseJournalEntry', () => {
  it('parses a good file', () => {
    const { entry, problems } = parse(file({ speciesId: 'lucanus-cervus' }));

    expect(problems).toStrictEqual([]);
    expect(entry?.title).toBe('Five legs');
    expect(entry?.date).toBe('2026-03-07');
    expect(entry?.season).toBe('autumn');
    expect(entry?.speciesId).toBe('lucanus-cervus');
    expect(entry?.lede).toBe('A paragraph of prose.');
  });

  it('omits speciesId rather than carrying an undefined', () => {
    const { entry } = parse(file());

    // `exactOptionalPropertyTypes`: the key is absent, not present-and-undefined.
    expect(entry !== undefined && 'speciesId' in entry).toBe(false);
  });

  it('names every missing required field', () => {
    const { entry, problems } = parse(['---', 'title: A', '---', '', 'Prose.'].join('\n'));

    expect(problems).toStrictEqual(['missing "date"', 'missing "season"']);
    expect(entry).toBeUndefined();
  });

  it('rejects an unknown key', () => {
    // The real failure: `speciesid` would parse cleanly and lose the thumbnail.
    expect(parse(file({ speciesid: 'lucanus-cervus' })).problems).toStrictEqual([
      'unknown key "speciesid"',
    ]);
  });

  it('rejects a date that is not YYYY-MM-DD', () => {
    expect(parse(file({ date: '7 March 2026' })).problems[0]).toContain('is not YYYY-MM-DD');
  });

  it('rejects a date that no calendar has', () => {
    // `new Date('2026-02-31')` rolls over to March and reports nothing, which is
    // why the check is component by component.
    expect(parse(file({ date: '2026-02-31', season: 'summer' })).problems[0]).toContain(
      'is not a real day',
    );
  });

  it('rejects a season that is not one of the four', () => {
    expect(parse(file({ season: 'monsoon' })).problems[0]).toContain('"season" is not one of');
  });

  it('rejects a season that disagrees with its own date', () => {
    // Invisible on the page — the tag is what the page shows — so this is the
    // only place it can be caught.
    expect(parse(file({ season: 'summer' })).problems).toStrictEqual([
      `"season" is summer but 2026-03-07 is autumn in Thornfield's calendar`,
    ]);
  });

  it('rejects a speciesId that names no specimen', () => {
    expect(parse(file({ speciesId: 'anoplognathus-porosus' })).problems[0]).toContain(
      'names no specimen',
    );
  });

  it('rejects a file with no prose', () => {
    expect(parse(file({}, '')).problems).toStrictEqual(['no prose: the entry has no paragraph']);
  });

  it('rejects a file name that is not a slug', () => {
    expect(parse(file(), 'Five Legs!').problems[0]).toContain('is not a lower-case kebab-case');
  });

  it('collects several problems from one file', () => {
    const { problems } = parse(file({ title: '', date: 'March', speciesId: 'nothing' }));

    expect(problems).toHaveLength(3);
  });

  it('strips markup from a title', () => {
    const { entry } = parse(file({ title: 'Five <script>alert(1)</script> legs' }));

    expect(entry?.title).toBe('Five alert(1) legs');
  });
});

describe('byDateDescending', () => {
  const entry = (slug: string, date: string): JournalEntry => ({
    slug,
    title: slug,
    date,
    season: 'autumn',
    blocks: [],
    lede: '',
  });

  it('sorts newest first, and breaks a tie on the slug', () => {
    const sorted = [
      entry('b', '2026-01-01'),
      entry('a', '2026-03-01'),
      entry('a', '2026-01-01'),
    ].sort(byDateDescending);

    expect(sorted.map((one) => `${one.date} ${one.slug}`)).toStrictEqual([
      '2026-03-01 a',
      '2026-01-01 a',
      '2026-01-01 b',
    ]);
  });
});
