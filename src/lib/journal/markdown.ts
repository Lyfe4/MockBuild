/**
 * Markdown in, blocks out — the small subset an entry is written in.
 *
 * Blocks are separated by a blank line. A block is a heading (`## `, `### `), a
 * quote (every line prefixed `> `), a list (every line prefixed `- `) or a
 * paragraph. Inline: `**strong**`, `_emphasis_` or `*emphasis*`, `` `code` ``
 * and `[label](href)`, and a link's label may itself carry any of them.
 *
 * Emphasis is written `_like this_` in the content files because Prettier
 * normalises markdown emphasis to underscores, and the files are formatted with
 * everything else. Both are accepted so the rule is Prettier's business rather
 * than the writer's.
 *
 * Every text span goes through `sanitiseText` and every href through
 * `safeHref`. See `sanitise.ts` for why that happens to first-party content.
 */

import { safeHref, sanitiseText } from './sanitise';
import type { Block, Span } from './types';

/**
 * The inline patterns, tried leftmost-first.
 *
 * Order inside the alternation matters at a given position: `**strong**` has to
 * be offered before `*emphasis*`, or `**a**` parses as an emphasis of `*a`.
 */
const INLINE =
  /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_/;

/** Push a text span, dropping it if sanitising leaves nothing behind. */
function pushText(spans: Span[], text: string): void {
  const clean = sanitiseText(text);

  if (clean !== '') spans.push({ kind: 'text', text: clean });
}

/** Parse one line's worth of inline markup. */
export function parseSpans(source: string): readonly Span[] {
  const spans: Span[] = [];
  let rest = source;

  for (let match = INLINE.exec(rest); match !== null; match = INLINE.exec(rest)) {
    const [whole, code, label, href, strong, strongAlt, emphasis, emphasisAlt] = match;

    if (match.index > 0) pushText(spans, rest.slice(0, match.index));

    if (code !== undefined) {
      spans.push({ kind: 'code', text: sanitiseText(code) });
    } else if (label !== undefined && href !== undefined) {
      const safe = safeHref(href);
      const inner = parseSpans(label);

      // A rejected URL loses the link and keeps the words. Dropping the label
      // as well would silently delete a sentence's subject.
      if (safe === undefined) spans.push(...inner);
      else spans.push({ kind: 'link', href: safe, spans: inner });
    } else if (strong !== undefined || strongAlt !== undefined) {
      spans.push({ kind: 'strong', spans: parseSpans(strong ?? strongAlt ?? '') });
    } else {
      spans.push({ kind: 'emphasis', spans: parseSpans(emphasis ?? emphasisAlt ?? '') });
    }

    rest = rest.slice(match.index + whole.length);
  }

  if (rest !== '') pushText(spans, rest);

  return spans;
}

/** Every span's text, concatenated — for a lede, a title or an alt string. */
export function plainText(spans: readonly Span[]): string {
  return spans
    .map((span) =>
      span.kind === 'text' || span.kind === 'code' ? span.text : plainText(span.spans),
    )
    .join('');
}

/** One block of source, already trimmed and known to be non-empty. */
function parseBlock(source: string): Block {
  const lines = source.split('\n');

  if (source.startsWith('### ')) {
    return { kind: 'heading', level: 3, spans: parseSpans(source.slice(4)) };
  }

  if (source.startsWith('## ')) {
    return { kind: 'heading', level: 2, spans: parseSpans(source.slice(3)) };
  }

  if (lines.every((line) => line.startsWith('> '))) {
    return { kind: 'quote', spans: parseSpans(lines.map((line) => line.slice(2)).join(' ')) };
  }

  if (lines.every((line) => line.startsWith('- '))) {
    return { kind: 'list', items: lines.map((line) => parseSpans(line.slice(2))) };
  }

  // A paragraph's own line breaks are the writer's wrapping, not content: the
  // files are hard-wrapped, and honouring those breaks would set the entry as
  // it happens to sit in the editor.
  return { kind: 'paragraph', spans: parseSpans(lines.join(' ')) };
}

/** An entry's body, as blocks. */
export function parseBlocks(body: string): readonly Block[] {
  return body
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block !== '')
    .map(parseBlock);
}
