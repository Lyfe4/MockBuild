/**
 * Where this site lives, and what it calls itself.
 *
 * One constant, because the origin is baked into six different things — every
 * canonical link, every `og:url`, the `og:image`, `robots.txt`, `sitemap.xml`
 * and the JSON-LD — and six copies of a hostname is how a site ends up
 * announcing two of them. `scripts/seo-builder` reads this module directly under
 * Node type stripping, the same way `scripts/sources-builder` reads
 * `src/data/references`, so the generated files and the rendered pages cannot
 * disagree about where the site is.
 *
 * ## The origin
 *
 * `index.html` carried `https://example.com` with a comment saying to replace it
 * before the site went anywhere public, which is the right instinct and the
 * wrong mechanism: nothing failed if you forgot, and the placeholder was in four
 * places by the time anybody looked.
 *
 * The value below is Netlify's default subdomain for the site name in
 * `netlify.toml`. It is correct the moment the site is deployed and needs no
 * DNS. **A custom domain is a one-line change here** — nothing else in the
 * repository spells a hostname out.
 */
export const SITE = {
  origin: 'https://thornfield-archive.netlify.app',
  name: 'Thornfield Entomological Archive',
  /** The short form, for a title suffix and the `og:site_name`. */
  shortName: 'Thornfield',
  locale: 'en_AU',
  /** The 1200 × 630 card, built by `npm run og:build`. Root-relative. */
  ogImagePath: '/og-image.png',
} as const;

/**
 * An absolute URL for a path within the site.
 *
 * Canonical links and `og:url` must be absolute — a relative canonical is legal
 * but a relative `og:url` is not, and scrapers vary in what they do with one.
 *
 * The path is normalised to exactly one leading slash and no trailing one, so
 * `/catalogue`, `catalogue` and `/catalogue/` are one URL rather than three
 * pages that a crawler treats as duplicates of each other. The site root is the
 * one exception and keeps its trailing slash, which is the conventional form.
 */
export function siteUrl(path: string): string {
  const trimmed = path.replace(/^\/+/, '').replace(/\/+$/, '');

  return trimmed === '' ? `${SITE.origin}/` : `${SITE.origin}/${trimmed}`;
}
