/**
 * The sanitiser step, and why it exists for first-party content.
 *
 * Nothing in `src/content/journal` comes from a stranger. The files are written
 * by whoever wrote the rest of the repository, reviewed in the same diff, and
 * compiled into the bundle at build time — there is no upload form, no comment
 * box and no CMS. So this module is, today, defence in depth. It runs anyway,
 * for four reasons:
 *
 * 1. **It is the cheap half of the argument.** The expensive half — never
 *    building an HTML string, never calling `dangerouslySetInnerHTML` — is a
 *    property of the renderer, and a property has to be maintained. A
 *    sanitiser that only runs on untrusted input is a sanitiser nobody
 *    remembers to run on the day the input changes.
 * 2. **The output does not only go through React.** A lede goes into a
 *    document title today and could go into a meta description, a feed or an
 *    `aria-label` tomorrow, and those are string sinks where React's escaping
 *    does nothing.
 * 3. **The CSP would report the failure, not prevent it.** `script-src 'self'`
 *    stops an injected `<script>` executing; it does nothing about an
 *    `onerror` attribute smuggled into a string that some later component
 *    interpolates.
 * 4. **It makes the parser's contract honest.** The block list this library
 *    produces is *text and structure*. Markup in a text span would be a lie
 *    about the type.
 *
 * Two functions, because there are two kinds of dangerous string: text that
 * might carry markup, and a URL that might carry a scheme.
 */

/**
 * Schemes a link may use.
 *
 * An allowlist, not a blocklist: `javascript:` is the one everybody thinks of
 * and `data:` — `data:text/html,...` — is the one that gets missed. A relative
 * path or a fragment carries no scheme at all and is allowed by the check
 * below.
 */
const SAFE_SCHEMES = ['http:', 'https:', 'mailto:'];

/**
 * Anything shaped like a tag, a closing tag, a comment or an instruction.
 *
 * Two things worth knowing about the shape. The closing `>` is optional, so
 * `<script` with nothing after it is stripped as well — the string being
 * defended against is one that becomes markup *later*, when something else
 * supplies the bracket. And a tag must start with a letter (after an optional
 * `/`, `!` or `?`), so `2 < 4` is arithmetic rather than an unterminated tag
 * running to the end of the paragraph. The first version had no such rule and
 * ate the rest of the sentence.
 */
const TAGGISH = /<!--[\s\S]*?(?:-->|$)|<[/!?]?[A-Za-z][^>]*>?/g;

/**
 * Strip markup from a run of text.
 *
 * Tag-shaped sequences go entirely — with what they contain, so
 * `<script>alert(1)</script>` leaves nothing rather than leaving `alert(1)`
 * looking like prose. Stray angle brackets go too: they cannot be markup on
 * their own, and keeping them would leave a string that becomes markup as soon
 * as it is concatenated with another one.
 *
 * Entities are deliberately **not** decoded. `&lt;script&gt;` in a journal file
 * is somebody writing about a script tag, and it renders as those five
 * characters because React escapes text; decoding it here would be this
 * function creating the markup it exists to remove.
 */
export function sanitiseText(text: string): string {
  return text.replace(TAGGISH, '').replace(/[<>]/g, '');
}

/**
 * A link's `href`, or `undefined` if it is not one this site will follow.
 *
 * A rejected URL does not become a broken link: the caller drops the link and
 * keeps the label as text, so the words survive and the destination does not.
 *
 * Site-relative paths and fragments are allowed and returned unchanged.
 * Protocol-relative `//host` is rejected — it inherits the page's scheme and
 * reads like a path, which is the whole trick.
 */
export function safeHref(href: string): string | undefined {
  const trimmed = href.trim();

  if (trimmed === '') return undefined;
  if (trimmed.startsWith('//')) return undefined;
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;

  // `URL` needs a base for a relative reference; anything that parses with a
  // scheme of its own keeps it, and the base is only there so a bare `foo/bar`
  // does not throw.
  let parsed: URL;

  try {
    parsed = new URL(trimmed, 'https://thornfield.example');
  } catch {
    return undefined;
  }

  if (!SAFE_SCHEMES.includes(parsed.protocol)) return undefined;

  // A relative reference resolved against the placeholder base: keep it
  // relative rather than handing back a link to a domain that does not exist.
  if (parsed.origin === 'https://thornfield.example' && !/^https?:/i.test(trimmed)) {
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  }

  return parsed.href;
}

/** Whether a link leaves the site, and so needs `rel` and a new tab. */
export function isExternalHref(href: string): boolean {
  return /^https?:/i.test(href) || href.startsWith('mailto:');
}
