import { describe, expect, it } from 'vitest';

// The real files, through Vite's `?raw` suffix — the same trick
// `securityHeaders.test.ts` uses, and for the same reason.
import { SITE, siteUrl } from '@/data/site';

import indexHtml from '../../index.html?raw';
import robotsTxt from '../../public/robots.txt?raw';
import sitemapXml from '../../public/sitemap.xml?raw';

/**
 * Guards the four copies of the site's origin.
 *
 * `src/data/site.ts` is the single source of truth, and three other files spell
 * the hostname out because they cannot import it: `index.html` is static markup
 * with no build-time substitution, and `robots.txt` and `sitemap.xml` are
 * generated but committed. `npm run seo:verify` catches drift in the last two;
 * nothing caught drift in `index.html`, which is exactly how it sat on
 * `https://example.com` for as long as it did.
 *
 * A stale canonical is the worst kind of wrong here — it does not break
 * anything, it just quietly tells every crawler that the real page is somewhere
 * else.
 */
describe('the site origin', () => {
  it('is the same in index.html as in site.ts', () => {
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(indexHtml)?.[1];
    const ogUrl = /<meta property="og:url" content="([^"]+)"/.exec(indexHtml)?.[1];
    const ogImage = /<meta property="og:image" content="([^"]+)"/.exec(indexHtml)?.[1];

    expect(canonical).toBe(siteUrl('/'));
    expect(ogUrl).toBe(siteUrl('/'));
    expect(ogImage).toBe(siteUrl(SITE.ogImagePath));
  });

  it('leaves no placeholder hostname anywhere a crawler reads', () => {
    for (const [name, text] of [
      ['index.html', indexHtml],
      ['robots.txt', robotsTxt],
      ['sitemap.xml', sitemapXml],
    ] as const) {
      // Matched in the markup rather than in the prose: the comment in
      // index.html mentions `example.com` on purpose, to say what it used to be.
      const attributes = text.match(/(?:href|content|loc)="?[^"<\s]+/g) ?? [];

      for (const attribute of attributes) {
        expect(attribute, name).not.toMatch(/example\.(com|org|net)/);
      }
    }
  });

  it('declares an og:image that is 1200 × 630 and actually built', () => {
    // The card is committed, so a wrong size here is a card that unfurls
    // letterboxed on every platform that reads these two numbers.
    expect(indexHtml).toContain('<meta property="og:image:width" content="1200" />');
    expect(indexHtml).toContain('<meta property="og:image:height" content="630" />');
    expect(SITE.ogImagePath).toMatch(/^\/[\w-]+\.png$/);
  });

  it('points robots.txt at the sitemap, on this origin', () => {
    expect(robotsTxt).toContain(`Sitemap: ${siteUrl('/sitemap.xml')}`);
    expect(sitemapXml).toContain(`<loc>${siteUrl('/')}</loc>`);
  });
});
