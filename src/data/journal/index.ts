import {
  byDateDescending,
  parseJournalEntry,
  type JournalEntry,
  type JournalParse,
} from '@/lib/journal';

import { SPECIES } from '../species';

/**
 * The field journal, read at build time.
 *
 * `import.meta.glob` with `?raw` and `eager: true`: the markdown files are
 * compiled into the bundle as strings and parsed once, at module load. No
 * fetch, no loader, no runtime markdown dependency — and the strict CSP is
 * untouched, because nothing is fetched and nothing becomes HTML. Vitest shares
 * Vite's transform pipeline, so a test sees exactly the same five files the
 * browser does.
 *
 * **Both halves of the parse are kept.** `JOURNAL_ENTRIES` is what parsed;
 * `JOURNAL_PARSES` is every file with its problems, and `journal.test.ts` fails
 * on any of them by name. A bad frontmatter key therefore fails a test rather
 * than dropping an entry out of the list quietly — which is what a route
 * filtering silently would do, and what makes "it worked on my machine" a
 * defensible sentence.
 */

/**
 * Every file under `src/content/journal`, keyed by path.
 *
 * Typed as `unknown` and narrowed rather than asserted: the glob's own type is
 * a promise the bundler makes, and this module can check it for the cost of one
 * `typeof`.
 */
const FILES: Record<string, unknown> = import.meta.glob('../../content/journal/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const SPECIES_IDS = SPECIES.map((species) => species.id);

/** `../../content/journal/five-legs.md` → `five-legs`. */
function slugOf(path: string): string {
  return (path.split('/').at(-1) ?? path).replace(/\.md$/, '');
}

/**
 * Every file, parsed, in file-name order.
 *
 * File-name order rather than date order, because this list is for the test:
 * a failure should read the same way twice, and a file with no valid date has
 * no place in a date ordering.
 */
export const JOURNAL_PARSES: readonly JournalParse[] = Object.entries(FILES)
  .map(([path, raw]) => {
    const slug = slugOf(path);

    if (typeof raw !== 'string') {
      return { slug, problems: [`${path} did not import as a string`] };
    }

    return parseJournalEntry(slug, raw, { species: SPECIES_IDS });
  })
  .sort((a, b) => (a.slug < b.slug ? -1 : 1));

/** The entries that parsed, newest first. */
export const JOURNAL_ENTRIES: readonly JournalEntry[] = JOURNAL_PARSES.flatMap((parse) =>
  parse.entry === undefined ? [] : [parse.entry],
).sort(byDateDescending);

/** One entry by slug, or `undefined`. */
export function findJournalEntry(slug: string): JournalEntry | undefined {
  return JOURNAL_ENTRIES.find((entry) => entry.slug === slug);
}

/**
 * The entries either side of one, in reading order.
 *
 * Reading order is the list's order — newest first — so `previous` is the
 * newer entry and `next` is the older one. Named for the position in the list
 * rather than for time, because that is what the two links do on the page.
 */
export function journalNeighbours(slug: string): {
  previous: JournalEntry | undefined;
  next: JournalEntry | undefined;
} {
  const at = JOURNAL_ENTRIES.findIndex((entry) => entry.slug === slug);

  if (at === -1) return { previous: undefined, next: undefined };

  return { previous: JOURNAL_ENTRIES[at - 1], next: JOURNAL_ENTRIES[at + 1] };
}
