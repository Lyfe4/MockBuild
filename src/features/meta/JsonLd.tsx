export interface JsonLdProps {
  /** The graph, as a plain object. Serialised here, never composed as a string. */
  data: Record<string, unknown>;
}

/**
 * One block of schema.org JSON-LD.
 *
 * ## It is a `<script>`, and the CSP allows it
 *
 * `script-src 'self'` forbids inline scripts, and this is an inline `<script>`.
 * It is not blocked, and the reason is not a loophole: the HTML spec's "prepare
 * the script element" algorithm classifies a `<script>` whose type is neither a
 * JavaScript MIME type nor `module`/`importmap` as a **data block**, and stops
 * before the step that asks Content Security Policy anything. A data block is
 * never executed, so there is nothing for `script-src` to be about.
 *
 * `src/test/securityHeaders.test.ts` and the deploy check both look for console
 * violations on every route, which is where this claim is actually tested rather
 * than merely argued.
 *
 * ## Rendered in the body, not hoisted
 *
 * JSON-LD is valid anywhere in the document and Google reads it from the body,
 * so it is left where it is written. Hoisting it would mean relying on React's
 * rules for a script type React has no opinion about.
 *
 * ## `dangerouslySetInnerHTML`, and why it is the safe form here
 *
 * The journal's markdown pipeline never builds an HTML string, and this is not
 * an exception to that: what goes in is `JSON.stringify` of an object this
 * repository composed, so the only characters that can appear are the ones JSON
 * permits. The one sequence that could break out of a `<script>` element is
 * `</script`, and `<` is escaped below — a string field would have to contain a
 * literal `<` for it to matter, and after escaping it cannot close the element.
 * The alternative, a text child, is escaped by React as *HTML* and would put
 * `&quot;` inside the JSON, which no parser accepts.
 */
export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      // See the note above: the content is `JSON.stringify` output with `<`
      // escaped, which cannot close the script element or introduce markup.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
