import { describe, expect, it } from 'vitest';

// Imported as raw text through Vite's `?raw` suffix rather than read with
// `node:fs`. These are the real files, but the app project is browser-scoped by
// design and pulling Node's types into it for one test would be the wrong trade.
import indexHtml from '../../index.html?raw';
import headersFile from '../../public/_headers?raw';

/**
 * Guards the split between the two copies of the Content-Security-Policy.
 *
 * `public/_headers` carries the authoritative policy that Netlify serves;
 * `index.html` carries the same policy minus `frame-ancestors` as a fallback
 * for hosts that ignore `_headers`. Duplicated configuration drifts, and the
 * failure is silent — a directive tightened in one file and not the other looks
 * fine in review and only shows up as a CSP violation in production, or worse,
 * as protection that quietly is not there.
 *
 * These read the real files rather than a fixture, which is the whole point.
 */

/** Splits a policy into a normalised, order-independent set of directives. */
function directives(policy: string): Set<string> {
  return new Set(
    policy
      .split(';')
      .map((directive) => directive.trim().replace(/\s+/g, ' '))
      .filter((directive) => directive.length > 0),
  );
}

function headersPolicy(): string {
  const match = /^\s*Content-Security-Policy:\s*(.+)$/m.exec(headersFile);

  if (match?.[1] === undefined) throw new Error('no Content-Security-Policy in public/_headers');

  return match[1].trim();
}

function metaPolicy(): string {
  const match = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(indexHtml);

  if (match?.[1] === undefined) throw new Error('no CSP meta tag in index.html');

  return match[1].trim();
}

describe('security headers', () => {
  it('serves frame-ancestors as a header, where browsers honour it', () => {
    expect(directives(headersPolicy())).toContain("frame-ancestors 'none'");
  });

  it('omits frame-ancestors from the meta tag, where browsers ignore it', () => {
    // Present in a <meta> tag it does nothing except log an error, which reads
    // as clickjacking protection that is not actually in place.
    expect(metaPolicy()).not.toContain('frame-ancestors');
  });

  it('keeps the meta policy identical to the header policy apart from frame-ancestors', () => {
    const fromHeader = directives(headersPolicy());

    fromHeader.delete("frame-ancestors 'none'");

    expect(directives(metaPolicy())).toStrictEqual(fromHeader);
  });

  it.each([
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'Cross-Origin-Opener-Policy: same-origin',
  ])('sets %s', (header) => {
    expect(headersFile).toContain(header);
  });

  it('denies every feature it names in the Permissions-Policy', () => {
    const match = /^\s*Permissions-Policy:\s*(.+)$/m.exec(headersFile);

    expect(match?.[1]).toBeDefined();

    const features = match![1]!.split(',').map((entry) => entry.trim());

    expect(features.length).toBeGreaterThan(10);

    // An allowlist that is not empty would be granting something. `()` is the
    // only value this site should ever carry.
    for (const feature of features) {
      expect(feature).toMatch(/^[a-z-]+=\(\)$/);
    }
  });

  it('applies the headers to every path', () => {
    // Netlify treats an unindented line as a path pattern. Losing the `/*`
    // block would leave the header lines orphaned and silently unapplied.
    expect(headersFile).toMatch(/^\/\*$/m);
  });
});
