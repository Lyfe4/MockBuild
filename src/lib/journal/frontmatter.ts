/**
 * The frontmatter block: a deliberately tiny YAML subset.
 *
 * `key: value`, one to a line, values optionally quoted. No nesting, no lists,
 * no anchors, no multi-line scalars — a YAML parser would be a dependency and
 * a much larger surface than five keys need, and every feature it added would
 * be a feature the entries could start relying on.
 *
 * **Unknown keys are an error, not a shrug.** A file carrying `speciesid:`
 * instead of `speciesId:` would otherwise parse cleanly and lose its thumbnail
 * silently, which is precisely the class of failure this whole arrangement is
 * built to make loud.
 */

export interface FrontmatterBlock {
  /** The raw key/value pairs, in file order. */
  readonly fields: ReadonlyMap<string, string>;
  /** Everything after the closing delimiter. */
  readonly body: string;
  /** What is wrong with the block, in the order it was found. */
  readonly problems: readonly string[];
}

const DELIMITER = '---';

/** `key: value` with an optional single- or double-quoted value. */
const FIELD = /^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/;

/** Strip one matched pair of surrounding quotes, if there is one. */
function unquote(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed.at(-1);

    if ((first === '"' || first === "'") && last === first) return trimmed.slice(1, -1);
  }

  return trimmed;
}

/**
 * Split a file into its frontmatter fields and its body.
 *
 * Always returns a block: a file with no frontmatter comes back with no fields,
 * one problem and its whole content as the body, so a caller reports everything
 * wrong with a file at once rather than one thing per run.
 */
export function parseFrontmatter(raw: string): FrontmatterBlock {
  const problems: string[] = [];
  // Windows checkouts exist, and a stray `\r` would end up inside a value and
  // then inside a season name that no longer matches anything.
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');

  if (lines[0]?.trim() !== DELIMITER) {
    return {
      fields: new Map(),
      body: raw,
      problems: ['no frontmatter: the file must open with a --- delimiter'],
    };
  }

  const closing = lines.findIndex((line, index) => index > 0 && line.trim() === DELIMITER);

  if (closing === -1) {
    return {
      fields: new Map(),
      body: '',
      problems: ['unterminated frontmatter: no closing --- delimiter'],
    };
  }

  const fields = new Map<string, string>();

  for (const [offset, line] of lines.slice(1, closing).entries()) {
    const at = offset + 2; // 1-based, and the delimiter is line 1.

    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;

    const match = FIELD.exec(line);

    if (match === null) {
      problems.push(`line ${String(at)}: not a "key: value" pair — ${line.trim()}`);
      continue;
    }

    const [, key = '', value = ''] = match;

    if (fields.has(key)) {
      problems.push(`line ${String(at)}: duplicate key "${key}"`);
      continue;
    }

    fields.set(key, unquote(value));
  }

  return { fields, body: lines.slice(closing + 1).join('\n'), problems };
}
