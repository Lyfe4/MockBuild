import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { cx } from '@/lib/classNames';
import { isExternalHref, type Block, type Span } from '@/lib/journal';

import styles from './JournalProse.module.css';

/**
 * A parsed entry, rendered as elements.
 *
 * **There is no `dangerouslySetInnerHTML` here and there is no HTML string
 * anywhere upstream of it.** The markdown is parsed into blocks and spans by
 * `src/lib/journal`, and this component turns those into real React elements —
 * so text is escaped by React as text, and the only tags on the page are the
 * ones written below. Markup in a content file cannot become markup on the
 * page even if the sanitiser missed it, which is the property the sanitiser is
 * a second line of defence for rather than the mechanism.
 *
 * Links are split on destination rather than on how they were written: a
 * site-relative href becomes a router `<Link>`, so following one is a client
 * navigation like any other, and anything leaving the site gets `rel` and a new
 * tab like every other outbound link in the archive.
 */

export interface JournalProseProps {
  blocks: readonly Block[];
  className?: string | undefined;
}

/** A key for a span, since spans have no identity of their own. */
function keyFor(index: number, span: Span): string {
  return `${String(index)}-${span.kind}`;
}

function renderSpans(spans: readonly Span[]): ReactNode {
  return spans.map((span, index) => {
    const key = keyFor(index, span);

    switch (span.kind) {
      case 'text':
        return span.text;
      case 'emphasis':
        return <em key={key}>{renderSpans(span.spans)}</em>;
      case 'strong':
        return <strong key={key}>{renderSpans(span.spans)}</strong>;
      case 'code':
        return (
          <code key={key} className={styles.code}>
            {span.text}
          </code>
        );
      case 'link':
        return isExternalHref(span.href) ? (
          <a key={key} href={span.href} rel="noopener noreferrer" target="_blank">
            {renderSpans(span.spans)}
          </a>
        ) : (
          <Link key={key} to={span.href}>
            {renderSpans(span.spans)}
          </Link>
        );
    }
  });
}

function renderBlock(block: Block, index: number): ReactNode {
  const key = `${String(index)}-${block.kind}`;

  switch (block.kind) {
    case 'paragraph':
      return (
        <p key={key} className={styles.paragraph}>
          {renderSpans(block.spans)}
        </p>
      );
    case 'heading':
      // An entry sits under the page's h1, so its own headings start at h2 and
      // the level in the source is the level on the page.
      return block.level === 2 ? (
        <h2 key={key} className={styles.heading}>
          {renderSpans(block.spans)}
        </h2>
      ) : (
        <h3 key={key} className={styles.subheading}>
          {renderSpans(block.spans)}
        </h3>
      );
    case 'quote':
      return (
        <blockquote key={key} className={styles.quote}>
          <p>{renderSpans(block.spans)}</p>
        </blockquote>
      );
    case 'list':
      return (
        <ul key={key} className={styles.list} role="list">
          {block.items.map((item, at) => (
            <li key={`${key}-${String(at)}`}>{renderSpans(item)}</li>
          ))}
        </ul>
      );
  }
}

export function JournalProse({ blocks, className }: JournalProseProps) {
  return <div className={cx(styles.root, className)}>{blocks.map(renderBlock)}</div>;
}
