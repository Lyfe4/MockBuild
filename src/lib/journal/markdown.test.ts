import { describe, expect, it } from 'vitest';

import { parseBlocks, parseSpans, plainText } from './markdown';
import type { Span } from './types';

/**
 * The markdown subset, and the injection fixture.
 *
 * The fixture at the bottom is the one that matters. It is a journal file
 * written the way an attacker would write one, and what the parser produces for
 * it has to be text and structure with no markup in it anywhere — because the
 * renderer will faithfully render whatever this returns.
 */

/** Every text span's text, for asserting nothing survived that should not. */
function texts(spans: readonly Span[]): string[] {
  return spans.flatMap((span) =>
    span.kind === 'text' || span.kind === 'code' ? [span.text] : texts(span.spans),
  );
}

describe('parseSpans', () => {
  it('reads plain text as one span', () => {
    expect(parseSpans('a quiet week')).toStrictEqual([{ kind: 'text', text: 'a quiet week' }]);
  });

  it('reads strong before emphasis', () => {
    // `**a**` has to be offered ahead of `*a*`, or it parses as an emphasis of
    // `*a`.
    expect(parseSpans('**five legs**')).toStrictEqual([
      { kind: 'strong', spans: [{ kind: 'text', text: 'five legs' }] },
    ]);
  });

  it('reads emphasis written with underscores or asterisks', () => {
    // Prettier normalises markdown emphasis to underscores and the content
    // files are formatted with everything else, so both have to work.
    expect(parseSpans('_Käferbuch_')).toStrictEqual(parseSpans('*Käferbuch*'));
  });

  it('reads a link, and the emphasis inside its label', () => {
    expect(parseSpans('[_Lucanus cervus_](/specimen/lucanus-cervus)')).toStrictEqual([
      {
        kind: 'link',
        href: '/specimen/lucanus-cervus',
        spans: [{ kind: 'emphasis', spans: [{ kind: 'text', text: 'Lucanus cervus' }] }],
      },
    ]);
  });

  it('reads code', () => {
    expect(parseSpans('run `npm run check`')).toStrictEqual([
      { kind: 'text', text: 'run ' },
      { kind: 'code', text: 'npm run check' },
    ]);
  });

  it('keeps the words of a rejected link and drops the destination', () => {
    const spans = parseSpans('[click here](javascript:alert(1))');

    expect(spans.some((span) => span.kind === 'link')).toBe(false);
    expect(plainText(spans)).toContain('click here');
  });
});

describe('parseBlocks', () => {
  it('splits on blank lines and joins a paragraph’s own wrapping', () => {
    const blocks = parseBlocks('One line\nand its wrap.\n\nA second paragraph.');

    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.kind).toBe('paragraph');
    // The files are hard-wrapped, so honouring those breaks would set the entry
    // as it happens to sit in an editor.
    expect(plainText(blocks[0]?.kind === 'paragraph' ? blocks[0].spans : [])).toBe(
      'One line and its wrap.',
    );
  });

  it('reads headings at two levels', () => {
    const blocks = parseBlocks('## A section\n\n### Below it');

    expect(blocks.map((block) => (block.kind === 'heading' ? block.level : null))).toStrictEqual([
      2, 3,
    ]);
  });

  it('reads a quote and a list', () => {
    const blocks = parseBlocks('> Nine strokes to a wing.\n\n- one\n- two');

    expect(blocks[0]?.kind).toBe('quote');
    expect(blocks[1]?.kind).toBe('list');
    expect(blocks[1]?.kind === 'list' ? blocks[1].items : []).toHaveLength(2);
  });

  it('ignores blank space between blocks', () => {
    expect(parseBlocks('\n\n  \n\nOne.\n\n\n\nTwo.\n')).toHaveLength(2);
  });
});

/**
 * A journal file written by somebody who should not have write access.
 *
 * Every line is a different sink: an element, an attribute, a scheme, and an
 * unterminated tag that only becomes markup once something concatenates it.
 */
const INJECTION_FIXTURE = [
  'A paragraph with <script>alert("xss")</script> in it.',
  '',
  '## A heading <img src=x onerror=alert(1)>',
  '',
  '> A quote with <iframe src="https://evil.example"></iframe> inside.',
  '',
  '- an item with <b>bold</b> markup',
  '- an item with <span onclick="steal()">a handler</span>',
  '',
  'A [link](javascript:alert(1)) and a [data link](data:text/html,<script>x</script>).',
  '',
  'An unterminated <script src="https://evil.example/x.js"',
].join('\n');

describe('the sanitiser step, on an injection fixture', () => {
  const blocks = parseBlocks(INJECTION_FIXTURE);

  it('produces the blocks the file asked for', () => {
    // The structure is honoured: this is a sanitiser, not a rejection. The
    // words survive; the markup does not.
    expect(blocks.map((block) => block.kind)).toStrictEqual([
      'paragraph',
      'heading',
      'quote',
      'list',
      'paragraph',
      'paragraph',
    ]);
  });

  it('leaves no tag in any text span', () => {
    for (const block of blocks) {
      const spans = block.kind === 'list' ? block.items.flat() : block.spans;

      for (const text of texts(spans)) {
        expect(text, text).not.toMatch(/[<>]/);
      }
    }
  });

  it('leaves no link with an unsafe scheme', () => {
    const hrefs = blocks.flatMap((block) => {
      const spans = block.kind === 'list' ? block.items.flat() : block.spans;

      return spans.flatMap((span) => (span.kind === 'link' ? [span.href] : []));
    });

    expect(hrefs).toStrictEqual([]);
  });

  it('keeps the prose either side of what it removed', () => {
    const first = blocks[0];

    expect(first?.kind).toBe('paragraph');
    expect(plainText(first?.kind === 'paragraph' ? first.spans : [])).toContain('A paragraph with');
    expect(plainText(first?.kind === 'paragraph' ? first.spans : [])).toContain('in it.');
  });
});
