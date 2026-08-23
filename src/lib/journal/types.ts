import type { Season } from '@/types';

/**
 * A field-journal entry, parsed.
 *
 * The entries are markdown files in `src/content/journal`, read at build time.
 * This module is the shape they parse into, and — like `src/lib/plate` and
 * `src/lib/key` — it is **pure data out**: no React, no DOM, no
 * `dangerouslySetInnerHTML` anywhere downstream. A block list is rendered by
 * `JournalProse`, which builds real elements, so the markdown never becomes an
 * HTML string at any point in its life.
 *
 * That is the first half of why injected markup cannot reach the page. The
 * second half is `sanitise.ts`, which runs anyway. See its comment.
 */

/** A run of inline content inside a block. */
export type Span =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'emphasis'; readonly spans: readonly Span[] }
  | { readonly kind: 'strong'; readonly spans: readonly Span[] }
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'link'; readonly href: string; readonly spans: readonly Span[] };

/**
 * A block of an entry.
 *
 * Deliberately few. This is a curator's journal, not a CMS: paragraphs, a
 * subheading, a pulled quote and the occasional list is the whole vocabulary,
 * and a parser that supports exactly what the content uses is a parser whose
 * behaviour can be read in one sitting. Anything else in a file is a parse
 * problem rather than a silently dropped line.
 */
export type Block =
  | { readonly kind: 'paragraph'; readonly spans: readonly Span[] }
  | { readonly kind: 'heading'; readonly level: 2 | 3; readonly spans: readonly Span[] }
  | { readonly kind: 'quote'; readonly spans: readonly Span[] }
  | { readonly kind: 'list'; readonly items: readonly (readonly Span[])[] };

/** The fields every entry's frontmatter carries. */
export interface JournalFrontmatter {
  readonly title: string;
  /** ISO `YYYY-MM-DD`. Stored as a string, never a `Date` — see `entry.ts`. */
  readonly date: string;
  /**
   * Thornfield's season for that date.
   *
   * Written in the file rather than derived, and then **checked** against the
   * date: it is the one field a writer can get wrong in a way that is invisible
   * on the page, and stating it means the file says what it means rather than
   * depending on a function nobody reading the file can see.
   */
  readonly season: Season;
  /** Slug of the specimen the entry is about, where it is about one. */
  readonly speciesId?: string;
}

/** One parsed entry. */
export interface JournalEntry extends JournalFrontmatter {
  /** The file name without its extension, and the entry's URL. */
  readonly slug: string;
  readonly blocks: readonly Block[];
  /** The first paragraph as plain text, for the index page. */
  readonly lede: string;
}
