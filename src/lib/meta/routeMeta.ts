import { SITE, siteUrl } from '@/data/site';

/**
 * What one route says about itself to a crawler, a scraper and a tab strip.
 *
 * Pure data out — no React, no DOM — so the wording can be unit-tested without
 * rendering a page, and so `scripts/seo-builder` can reach the same helpers when
 * it writes the sitemap. `src/features/meta` is what puts it into the document.
 *
 * ## Why every field is required
 *
 * A partial metadata object is the failure this type exists to prevent. A route
 * that supplies a title and forgets a description does not fail; it inherits the
 * *previous route's* description, because the tag is already in the head and
 * nothing removed it. Requiring all of them makes that a compile error instead.
 */
export interface RouteMeta {
  /** The full `<title>`, archive name included. */
  readonly title: string;
  /** One or two sentences. Under about 160 characters, or Google truncates. */
  readonly description: string;
  /** Absolute canonical URL. */
  readonly canonical: string;
  /** `article` for a journal entry, `website` for everything else. */
  readonly ogType: 'website' | 'article';
}

/** The longest a description may be before search results start truncating it. */
export const DESCRIPTION_LIMIT = 160;

/**
 * `Lucanus cervus · Thornfield Entomological Archive`, or the archive's name
 * alone for the home page.
 *
 * The separator is a middle dot with hair spaces round it, matching what the
 * site uses between fields on a specimen row.
 */
export function documentTitle(pageTitle: string): string {
  return pageTitle === '' ? SITE.name : `${pageTitle} · ${SITE.name}`;
}

/**
 * Build a `RouteMeta` from the parts a route knows.
 *
 * Trims and collapses whitespace in the description, because several of them are
 * composed from record prose that arrives with newlines in it, and a description
 * tag containing a line break is a description tag that renders oddly in the one
 * place it is read.
 */
export function routeMeta(input: {
  title: string;
  description: string;
  path: string;
  ogType?: 'website' | 'article';
}): RouteMeta {
  return {
    title: documentTitle(input.title),
    description: input.description.replace(/\s+/g, ' ').trim(),
    canonical: siteUrl(input.path),
    ogType: input.ogType ?? 'website',
  };
}

/**
 * Cut prose to a length a search result will show, at a word boundary.
 *
 * Several descriptions are the first sentence or two of a record's `notes`,
 * which run to a paragraph. Truncating mid-word reads as a bug; truncating at a
 * space and adding an ellipsis reads as a summary.
 */
export function clampDescription(text: string, limit = DESCRIPTION_LIMIT): string {
  const flat = text.replace(/\s+/g, ' ').trim();

  if (flat.length <= limit) return flat;

  // Reserve one character for the ellipsis, then back off to the last space.
  const cut = flat.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(' ');

  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.]$/, '')}…`;
}
