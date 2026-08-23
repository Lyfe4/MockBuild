import { describe, expect, it } from 'vitest';

import { isExternalHref, safeHref, sanitiseText } from './sanitise';

describe('sanitiseText', () => {
  it('removes a tag and what it contains', () => {
    // Not just the brackets: leaving `alert(1)` behind would put the payload on
    // the page as prose, which reads as a mistake rather than as an attack and
    // so never gets fixed.
    expect(sanitiseText('before <script>alert(1)</script> after')).toBe('before alert(1) after');
  });

  it('removes an unterminated tag', () => {
    // The string that becomes markup later, when something else supplies the
    // bracket.
    expect(sanitiseText('a <img src=x onerror=alert(1)')).toBe('a ');
  });

  it('removes stray angle brackets', () => {
    expect(sanitiseText('5 > 3 and 2 < 4')).toBe('5  3 and 2  4');
  });

  it('leaves ordinary prose exactly as it was', () => {
    const prose = 'Nineteen to twenty-seven millimetres long — a third as wide as long.';

    expect(sanitiseText(prose)).toBe(prose);
  });

  it('does not decode entities', () => {
    // Somebody writing *about* a script tag gets the five characters they typed.
    // Decoding here would be this function creating the markup it exists to
    // remove.
    expect(sanitiseText('&lt;script&gt;')).toBe('&lt;script&gt;');
  });
});

describe('safeHref', () => {
  it('keeps a site-relative path and a fragment', () => {
    expect(safeHref('/specimen/lucanus-cervus')).toBe('/specimen/lucanus-cervus');
    expect(safeHref('#notes')).toBe('#notes');
  });

  it('keeps http, https and mailto', () => {
    expect(safeHref('https://commons.wikimedia.org/wiki/File:x.jpg')).toBe(
      'https://commons.wikimedia.org/wiki/File:x.jpg',
    );
    expect(safeHref('mailto:reading.room@example.org')).toBe('mailto:reading.room@example.org');
  });

  it('rejects a javascript: URL, however it is written', () => {
    expect(safeHref('javascript:alert(1)')).toBeUndefined();
    expect(safeHref('  JavaScript:alert(1)')).toBeUndefined();
  });

  it('rejects data: and other schemes', () => {
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    expect(safeHref('vbscript:msgbox(1)')).toBeUndefined();
  });

  it('rejects a protocol-relative URL', () => {
    // It inherits the page's scheme and reads like a path, which is the trick.
    expect(safeHref('//evil.example/x')).toBeUndefined();
  });

  it('rejects an empty href', () => {
    expect(safeHref('   ')).toBeUndefined();
  });

  it('keeps a bare relative reference relative', () => {
    // Resolved against a placeholder base to parse it, then handed back as it
    // was — a link to a domain that does not exist would be worse than none.
    expect(safeHref('about')).toBe('/about');
  });
});

describe('isExternalHref', () => {
  it('separates outbound links from internal ones', () => {
    expect(isExternalHref('https://example.org')).toBe(true);
    expect(isExternalHref('mailto:a@example.org')).toBe(true);
    expect(isExternalHref('/journal/five-legs')).toBe(false);
    expect(isExternalHref('#notes')).toBe(false);
  });
});
