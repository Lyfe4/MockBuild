import { seasonOfMonth } from '@/lib/season';
import { SEASONS, type Month, type Season } from '@/types';

import { parseFrontmatter } from './frontmatter';
import { parseBlocks, plainText } from './markdown';
import { sanitiseText } from './sanitise';
import type { JournalEntry } from './types';

/**
 * One file in, one entry or a list of problems out.
 *
 * **Never throws, and never half-parses.** A bad file comes back as problems
 * with no entry, and `src/data/journal` keeps both: the route renders what
 * parsed and `journal.test.ts` fails on anything that did not, naming the file
 * and what is wrong with it. That is the whole point of the arrangement — a
 * frontmatter typo has to fail somewhere loud, and "the build" is not loud
 * enough if it fails on a Tuesday for the person who touched an unrelated file.
 *
 * The problems are collected rather than thrown one at a time, so a file with
 * three mistakes reports three.
 */

/** The keys an entry's frontmatter may carry, and which are required. */
const REQUIRED_KEYS = ['title', 'date', 'season'] as const;
const OPTIONAL_KEYS = ['speciesId'] as const;

const KNOWN_KEYS: readonly string[] = [...REQUIRED_KEYS, ...OPTIONAL_KEYS];

/** `YYYY-MM-DD`, and nothing else. */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface JournalParseOptions {
  /** The species slugs a `speciesId` is allowed to name. */
  readonly species: readonly string[];
}

export interface JournalParse {
  readonly slug: string;
  /** The entry, where the file parsed. Absent where it did not. */
  readonly entry?: JournalEntry;
  readonly problems: readonly string[];
}

/**
 * Whether `YYYY-MM-DD` names a day that exists.
 *
 * Built with `Date.UTC` and checked component by component, which is what
 * catches the 31st of February: `new Date('2026-02-31')` rolls over to March
 * and reports no error at all. No `Date.now()` and no local time zone — the
 * date in the file is a date, not an instant.
 */
function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const at = new Date(Date.UTC(year, month - 1, day));

  return at.getUTCFullYear() === year && at.getUTCMonth() === month - 1 && at.getUTCDate() === day;
}

function isSeason(value: string): value is Season {
  return (SEASONS as readonly string[]).includes(value);
}

export function parseJournalEntry(
  slug: string,
  raw: string,
  options: JournalParseOptions,
): JournalParse {
  const { fields, body, problems: frontmatterProblems } = parseFrontmatter(raw);
  const problems = [...frontmatterProblems];

  if (!SLUG.test(slug)) {
    problems.push(`file name "${slug}" is not a lower-case kebab-case slug`);
  }

  for (const key of REQUIRED_KEYS) {
    if (!fields.has(key)) problems.push(`missing "${key}"`);
  }

  for (const key of fields.keys()) {
    // A typo'd key is the failure this catches: `speciesid` would otherwise
    // parse cleanly and lose the entry's thumbnail without a word.
    if (!KNOWN_KEYS.includes(key)) problems.push(`unknown key "${key}"`);
  }

  const title = sanitiseText(fields.get('title') ?? '').trim();

  if (fields.has('title') && title === '') problems.push('"title" is empty');

  const date = fields.get('date') ?? '';
  const dateMatch = ISO_DATE.exec(date);
  let month: Month | undefined;

  if (fields.has('date')) {
    if (dateMatch === null) {
      problems.push(`"date" is not YYYY-MM-DD — ${date}`);
    } else {
      const [, year = '', rawMonth = '', day = ''] = dateMatch;

      if (!isRealDate(Number(year), Number(rawMonth), Number(day))) {
        problems.push(`"date" is not a real day — ${date}`);
      } else {
        month = Number(rawMonth) as Month;
      }
    }
  }

  const season = fields.get('season') ?? '';

  if (fields.has('season')) {
    if (!isSeason(season)) {
      problems.push(`"season" is not one of ${SEASONS.join(', ')} — ${season}`);
    } else if (month !== undefined && seasonOfMonth(month) !== season) {
      // The archive keeps a southern calendar, and the season in the file has to
      // be the one the date falls in — an entry dated in April and tagged summer
      // is a typo, and it is invisible on the page because the tag is what the
      // page shows.
      problems.push(
        `"season" is ${season} but ${date} is ${seasonOfMonth(month)} in Thornfield's calendar`,
      );
    }
  }

  const speciesId = fields.get('speciesId');

  if (speciesId !== undefined && !options.species.includes(speciesId)) {
    problems.push(`"speciesId" names no specimen in the collection — ${speciesId}`);
  }

  const blocks = parseBlocks(body);
  const firstParagraph = blocks.find((block) => block.kind === 'paragraph');

  if (firstParagraph === undefined) problems.push('no prose: the entry has no paragraph');

  if (problems.length > 0 || !isSeason(season) || firstParagraph === undefined) {
    return { slug, problems };
  }

  return {
    slug,
    problems,
    entry: {
      slug,
      title,
      date,
      season,
      ...(speciesId === undefined ? {} : { speciesId }),
      blocks,
      lede: plainText(firstParagraph.spans),
    },
  };
}

/** Newest first, and ties broken by slug so the order is total. */
export function byDateDescending(a: JournalEntry, b: JournalEntry): number {
  // ISO dates sort correctly as strings, which is most of why they are stored
  // as strings.
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;

  return a.slug < b.slug ? -1 : 1;
}
