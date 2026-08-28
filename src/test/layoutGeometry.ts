/**
 * Computed geometry for the page grid, without a browser.
 *
 * ## Why this exists
 *
 * Alignment is the one thing about a layout that cannot be asserted from the
 * DOM. Every rule that decides where the wordmark, the filter margin and the
 * first specimen row start is in CSS, and jsdom has no layout engine at all:
 * `getBoundingClientRect` returns zeroes, and `getComputedStyle` resolves the
 * cascade but ignores `@media` entirely — so it answers every breakpoint
 * question with the mobile answer. Reading either would give a test that passes
 * whatever the stylesheet says.
 *
 * So the geometry is computed here instead, from the stylesheets the app
 * actually ships. jsdom's CSSOM keeps rules, media conditions, custom
 * properties and `grid-template-columns` verbatim — including the line names,
 * which is the part that matters — and `Element.matches` answers which rules
 * apply. That is enough to do the arithmetic the browser would do, for the one
 * subset of CSS the page grid is built from.
 *
 * ## What it models, and what it refuses to
 *
 * Deliberately narrow: fixed and `fr` tracks, `repeat()`, `minmax(0, …)`, named
 * lines, `span`, sparse auto-placement along one axis, subgrid pass-through,
 * and the inline padding/border/margin of a plain block descending inside a
 * placed item. Lengths may be `px`, `rem`, `%`, `vw`, and any nesting of
 * `calc()`, `clamp()`, `min()`, `max()` and `var()`.
 *
 * Anything else throws. That is the important half: a layout this cannot model
 * is one whose alignment it would otherwise report confidently and wrongly, and
 * a loud failure in a test is the correct outcome of the page grid growing a
 * feature this file has not been taught.
 *
 * Two assumptions it does not check, both true of `RootLayout`: the grid's
 * containing block is the viewport, and no element carries an inline style —
 * the second guaranteed by the CSP rather than by convention.
 */

const ROOT_FONT_SIZE = 16;

const WHITESPACE = /\s/;

/** `min-width` in `rem` or `px`, which is every media query in this project. */
const MIN_WIDTH = /min-width:\s*([\d.]+)(rem|px)/;

/* ------------------------------------------------------------------ *
 * The cascade
 * ------------------------------------------------------------------ */

interface Match {
  readonly rule: CSSStyleRule;
  /** Order of appearance across all sheets; the tie-break within a weight. */
  readonly order: number;
  readonly specificity: number;
}

/**
 * Every style rule in the document, in order, with the media rules that do not
 * apply at this width left out.
 *
 * A media condition this cannot read counts as *not* matching rather than as
 * matching, so a query of a kind the project does not use today fails the test
 * that depends on it instead of quietly passing it.
 */
function styleRules(viewportWidth: number): CSSStyleRule[] {
  const found: CSSStyleRule[] = [];

  const walk = (rules: CSSRuleList): void => {
    for (const rule of rules) {
      if (rule instanceof CSSMediaRule) {
        if (mediaApplies(rule.conditionText, viewportWidth)) walk(rule.cssRules);
        continue;
      }

      if (rule instanceof CSSStyleRule) found.push(rule);
    }
  };

  for (const sheet of document.styleSheets) walk(sheet.cssRules);

  return found;
}

function mediaApplies(condition: string, viewportWidth: number): boolean {
  const found = MIN_WIDTH.exec(condition);
  const amount = found?.[1];

  if (amount === undefined) return false;

  return viewportWidth >= Number(amount) * (found?.[2] === 'rem' ? ROOT_FONT_SIZE : 1);
}

/**
 * A selector's weight as one comparable number.
 *
 * Crude on purpose — ids, then classes and attributes and pseudo-classes, then
 * elements — because the page grid's selectors are all one or two classes deep
 * and the only comparison that has to come out right is `.container > *`
 * against a route's own `.root`. A selector list takes its highest weight,
 * which is what the cascade does for the branch that matched.
 */
function specificityOf(selector: string): number {
  let highest = 0;

  for (const part of selector.split(',')) {
    const ids = part.match(/#[\w-]+/g)?.length ?? 0;
    const classes = part.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+(?!\()/g)?.length ?? 0;
    const elements = part.match(/(^|[\s>+~])[a-z]+/gi)?.length ?? 0;

    highest = Math.max(highest, ids * 10_000 + classes * 100 + elements);
  }

  return highest;
}

/**
 * The declarations that apply to an element at this viewport width.
 *
 * Custom properties included, so `var()` on `:root` resolves through the same
 * path as everything else.
 */
export function declaredStyle(element: Element, viewportWidth: number): Map<string, string> {
  const matches: Match[] = [];

  styleRules(viewportWidth).forEach((rule, order) => {
    if (!element.matches(rule.selectorText)) return;

    matches.push({ rule, order, specificity: specificityOf(rule.selectorText) });
  });

  matches.sort((a, b) => a.specificity - b.specificity || a.order - b.order);

  const declared = new Map<string, string>();

  for (const { rule } of matches) {
    for (const property of rule.style) {
      declared.set(property, rule.style.getPropertyValue(property).trim());
    }
  }

  return declared;
}

/* ------------------------------------------------------------------ *
 * Lengths
 * ------------------------------------------------------------------ */

interface LengthContext {
  readonly viewportWidth: number;
  /** Custom properties, from `:root`. Layout tokens live nowhere else. */
  readonly variables: Map<string, string>;
  /** What a percentage is a percentage of, where one is allowed. */
  readonly percentBasis?: number | undefined;
}

/** Expands `var(--name)` and `var(--name, fallback)` until none are left. */
function expandVariables(value: string, variables: Map<string, string>): string {
  let expanded = value;

  for (let pass = 0; pass < 8; pass += 1) {
    const start = expanded.indexOf('var(');

    if (start === -1) return expanded;

    let depth = 0;
    let end = start;

    for (; end < expanded.length; end += 1) {
      if (expanded[end] === '(') depth += 1;
      if (expanded[end] === ')') {
        depth -= 1;
        if (depth === 0) break;
      }
    }

    const inside = expanded.slice(start + 4, end);
    const comma = inside.indexOf(',');
    const name = (comma === -1 ? inside : inside.slice(0, comma)).trim();
    const fallback = comma === -1 ? undefined : inside.slice(comma + 1).trim();
    const resolved = variables.get(name) ?? fallback;

    if (resolved === undefined) throw new Error(`no value for custom property ${name}`);

    expanded = expanded.slice(0, start) + resolved + expanded.slice(end + 1);
  }

  throw new Error(`custom properties in "${value}" nest more than eight deep`);
}

/**
 * A length in pixels.
 *
 * A recursive-descent parser rather than a regex, because the tokens genuinely
 * nest: `clamp(1.25rem, 0.7rem + 3vw, 4rem)` is the page gutter, and the middle
 * argument is an expression whose terms carry two different units.
 */
export function toPixels(value: string, context: LengthContext): number {
  // Collapsed first: a declaration may be written across lines, and every rule
  // below is about spaces rather than about whitespace.
  const source = expandVariables(value.trim(), context.variables).replace(/\s+/g, ' ');
  let at = 0;

  const skipSpace = (): void => {
    while (at < source.length && source[at] === ' ') at += 1;
  };

  const expression = (): number => {
    let total = term();

    for (;;) {
      skipSpace();

      const operator = source[at];

      if (operator !== '+' && operator !== '-') return total;

      at += 1;
      total = operator === '+' ? total + term() : total - term();
    }
  };

  const term = (): number => {
    let total = factor();

    for (;;) {
      skipSpace();

      const operator = source[at];

      if (operator !== '*' && operator !== '/') return total;

      at += 1;
      total = operator === '*' ? total * factor() : total / factor();
    }
  };

  const args = (): number[] => {
    const values: number[] = [];

    at += 1; // the opening bracket

    for (;;) {
      values.push(expression());
      skipSpace();

      const next = source[at];

      at += 1;

      if (next === ')') return values;
      if (next !== ',') throw new Error(`unexpected "${String(next)}" in "${source}"`);
    }
  };

  const factor = (): number => {
    skipSpace();

    if (source[at] === '(') return args()[0] ?? 0;

    const name = /^[a-z-]+\(/.exec(source.slice(at))?.[0];

    if (name !== undefined) {
      at += name.length - 1;

      const values = args();

      if (name === 'calc(') return values[0] ?? 0;
      if (name === 'min(') return Math.min(...values);
      if (name === 'max(') return Math.max(...values);
      if (name === 'clamp(') {
        const [low = 0, preferred = 0, high = 0] = values;

        return Math.min(Math.max(preferred, low), high);
      }

      throw new Error(`unsupported function ${name} in "${source}"`);
    }

    const number = /^-?[\d.]+(px|rem|vw|%)?/.exec(source.slice(at));

    if (number === null) throw new Error(`cannot read a length from "${source.slice(at)}"`);

    at += number[0].length;

    const amount = Number.parseFloat(number[0]);

    switch (number[1]) {
      case 'px':
      case undefined:
        return amount;
      case 'rem':
        return amount * ROOT_FONT_SIZE;
      case 'vw':
        return (amount * context.viewportWidth) / 100;
      default: {
        if (context.percentBasis === undefined) {
          throw new Error(`"${source}" is a percentage of nothing here`);
        }

        return (amount * context.percentBasis) / 100;
      }
    }
  };

  const result = expression();

  skipSpace();

  if (at !== source.length) throw new Error(`trailing "${source.slice(at)}" in "${source}"`);

  return result;
}

/* ------------------------------------------------------------------ *
 * Tracks
 * ------------------------------------------------------------------ */

interface Track {
  /** A `fr` share, or 0 for a track sized in pixels. */
  readonly flex: number;
  readonly pixels: number;
}

interface Template {
  readonly tracks: readonly Track[];
  /** Line name to line index, zero-based: line 0 is the content box's start. */
  readonly lines: ReadonlyMap<string, number>;
}

/**
 * A CSS value split on its top-level spaces.
 *
 * Depth-aware, which is the whole reason it is not `.split(' ')`: a track list
 * holds `minmax(0, 1fr)` and a gutter holds `clamp(1.25rem, 0.7rem + 3vw, 4rem)`,
 * and both contain spaces that do not separate anything. Bracketed line names
 * come back whole, brackets included.
 */
function topLevelTokens(value: string): string[] {
  const tokens: string[] = [];
  let at = 0;

  while (at < value.length) {
    // Any whitespace, not just a space: a track list long enough to need three
    // lines in the stylesheet arrives with its newlines and its indentation.
    if (WHITESPACE.test(value[at] ?? '')) {
      at += 1;
      continue;
    }

    if (value[at] === '[') {
      const close = value.indexOf(']', at);

      if (close === -1) throw new Error(`unclosed line names in "${value}"`);

      tokens.push(value.slice(at, close + 1));
      at = close + 1;
      continue;
    }

    const start = at;
    let depth = 0;

    while (at < value.length) {
      const char = value[at];

      if (char === '(') depth += 1;
      else if (char === ')') depth -= 1;
      else if (depth === 0 && WHITESPACE.test(char ?? '')) break;

      at += 1;
    }

    tokens.push(value.slice(start, at));
  }

  return tokens;
}

/** `minmax(0, 1fr)`, `1fr`, or a length. Anything else is not modelled. */
function parseTrack(spec: string, context: LengthContext): Track {
  const trimmed = spec.trim();
  const minmax = /^minmax\(\s*0(?:px)?\s*,\s*(.+)\)$/.exec(trimmed);
  const sizing = minmax?.[1]?.trim() ?? trimmed;
  const flex = /^([\d.]+)fr$/.exec(sizing);

  if (flex?.[1] !== undefined) return { flex: Number(flex[1]), pixels: 0 };

  return { flex: 0, pixels: toPixels(sizing, context) };
}

/**
 * `grid-template-columns` as tracks and named lines.
 *
 * Written against exactly what `styles/pageGrid.module.css` declares: bracketed
 * line names, `repeat(n, …)` with a literal count, and one track per remaining
 * chunk.
 */
export function parseTemplate(template: string, context: LengthContext): Template {
  const tracks: Track[] = [];
  const lines = new Map<string, number>();

  for (const token of topLevelTokens(template)) {
    if (token.startsWith('[')) {
      for (const name of token.slice(1, -1).split(/\s+/).filter(Boolean)) {
        lines.set(name, tracks.length);
      }
      continue;
    }

    const repeated = /^repeat\(\s*(\d+)\s*,\s*(.+)\)$/.exec(token);

    if (repeated?.[1] !== undefined && repeated[2] !== undefined) {
      const track = parseTrack(repeated[2], context);

      for (let index = 0; index < Number(repeated[1]); index += 1) tracks.push(track);
      continue;
    }

    tracks.push(parseTrack(token, context));
  }

  return { tracks, lines };
}

/* ------------------------------------------------------------------ *
 * Placement
 * ------------------------------------------------------------------ */

export interface Edges {
  readonly left: number;
  readonly right: number;
}

/** A `grid-column` value as a pair of line indices, or null if auto-placed. */
function parsePlacement(
  value: string,
  lines: ReadonlyMap<string, number>,
  lineCount: number,
): { start: number; end: number } | { span: number } {
  const [rawStart = 'auto', rawEnd = 'auto'] = value.split('/').map((part) => part.trim());

  const lineOf = (token: string): number | null => {
    if (token === 'auto') return null;

    const named = lines.get(token);

    if (named !== undefined) return named;

    const numbered = /^-?\d+$/.exec(token);

    if (numbered === null) return null;

    const index = Number(token);

    // A negative index counts back from the end, as in CSS.
    return index > 0 ? index - 1 : lineCount + index;
  };

  const spanOf = (token: string): number | null => {
    const span = /^span\s+(\d+)$/.exec(token);

    return span?.[1] === undefined ? null : Number(span[1]);
  };

  const start = lineOf(rawStart);
  const end = lineOf(rawEnd);
  const startSpan = spanOf(rawStart);
  const endSpan = spanOf(rawEnd);

  if (start !== null && end !== null) return { start, end };
  if (start !== null && endSpan !== null) return { start, end: start + endSpan };
  if (end !== null && startSpan !== null) return { start: end - startSpan, end };

  return { span: startSpan ?? endSpan ?? 1 };
}

/**
 * The page grid, measured.
 *
 * `edgesOf` is the whole interface: give it any element inside the grid and it
 * answers where the browser would put its left and right edges.
 */
export interface PageGrid {
  /** The grid's own content box — `content-start` and `content-end`. */
  readonly contentStart: number;
  readonly contentEnd: number;
  readonly columnGap: number;
  /**
   * A named column, by the stem of its two lines: `column('margin')` reads
   * `margin-start` and `margin-end`.
   */
  column: (name: string) => Edges;
  edgesOf: (element: Element) => Edges;
}

export function measurePageGrid(grid: HTMLElement, viewportWidth: number): PageGrid {
  const variables = new Map<string, string>();

  for (const [property, value] of declaredStyle(document.documentElement, viewportWidth)) {
    if (property.startsWith('--')) variables.set(property, value);
  }

  const context: LengthContext = { viewportWidth, variables };
  const styleOf = (element: Element): Map<string, string> => declaredStyle(element, viewportWidth);

  const gridStyle = styleOf(grid);
  const length = (value: string | undefined, fallback = 0): number =>
    value === undefined ? fallback : toPixels(value, context);

  // `margin-inline: auto` on a box narrower than its containing block: the
  // remainder is split in two. The containing block is the viewport — see the
  // note at the top about what this file assumes rather than checks.
  const maxWidth = length(gridStyle.get('max-inline-size'), Number.POSITIVE_INFINITY);
  const outerWidth = Math.min(maxWidth, viewportWidth);
  const outerStart = (viewportWidth - outerWidth) / 2;
  const gutter = length(gridStyle.get('padding-inline'));
  const columnGap = length(gridStyle.get('column-gap'));

  const contentStart = outerStart + gutter;
  const contentEnd = outerStart + outerWidth - gutter;
  const contentWidth = contentEnd - contentStart;

  const template = gridStyle.get('grid-template-columns');

  if (template === undefined) throw new Error('the element given is not a grid');

  const { tracks, lines } = parseTemplate(template, context);
  const totalFlex = tracks.reduce((sum, track) => sum + track.flex, 0);
  const fixed = tracks.reduce((sum, track) => sum + track.pixels, 0);
  const free = contentWidth - fixed - columnGap * (tracks.length - 1);

  const widths = tracks.map((track) =>
    totalFlex === 0 ? track.pixels : track.pixels + (free * track.flex) / totalFlex,
  );

  /**
   * Where each column line falls.
   *
   * A grid line has two positions, not one, and the difference is exactly the
   * column gap: an item *ending* on line four ends where track three ends, and
   * an item *starting* on line four starts one gutter later. `positions[i]` is
   * the start edge; `endAt` takes the gutter back off.
   */
  const positions = widths.reduce<number[]>(
    (all, width) => [...all, (all.at(-1) ?? contentStart) + width + columnGap],
    [contentStart],
  );

  const startAt = (index: number): number => {
    const position = positions[index];

    if (position === undefined) throw new Error(`no column line ${String(index)}`);

    return position;
  };

  const endAt = (index: number): number => {
    // The outermost lines are stated rather than derived: `contentEnd` is a
    // subtraction away from the running sum, and a float that is off by
    // 2e-13 turns "the same line" into "not the same line".
    if (index === 0) return contentStart;
    if (index === tracks.length) return contentEnd;

    return startAt(index) - columnGap;
  };

  const lineIndex = (name: string): number => {
    const index = lines.get(name);

    if (index === undefined) throw new Error(`the grid has no line named ${name}`);

    return index;
  };

  const column = (name: string): Edges => ({
    left: startAt(lineIndex(`${name}-start`)),
    right: endAt(lineIndex(`${name}-end`)),
  });

  /**
   * Where each direct child of a grid or subgrid sits, by column line.
   *
   * Sparse auto-placement, which is CSS's default: an item with no explicit
   * column takes the cursor, and one that would overflow the row starts the
   * next. Only the inline axis is tracked, because that is the only axis this
   * file answers questions about.
   */
  const placeChildren = (container: Element): Map<Element, { start: number; end: number }> => {
    const placed = new Map<Element, { start: number; end: number }>();
    let cursor = 0;

    for (const child of container.children) {
      const style = styleOf(child);
      const value =
        style.get('grid-column') ??
        `${style.get('grid-column-start') ?? 'auto'} / ${style.get('grid-column-end') ?? 'auto'}`;

      const placement = parsePlacement(value, lines, tracks.length + 1);

      if ('start' in placement) {
        placed.set(child, placement);
        cursor = placement.end;
        continue;
      }

      if (cursor + placement.span > tracks.length) cursor = 0;

      placed.set(child, { start: cursor, end: cursor + placement.span });
      cursor += placement.span;
    }

    return placed;
  };

  /**
   * One side of a box shorthand, in the CSS order: one value is every side,
   * two are block then inline, four are top, right, bottom, left.
   */
  const sideOf = (value: string, edge: 'start' | 'end'): string => {
    const parts = topLevelTokens(value);

    if (parts.length === 1) return parts[0] ?? '0';
    if (parts.length === 2 || parts.length === 3) return parts[1] ?? '0';

    return (edge === 'start' ? parts[3] : parts[1]) ?? '0';
  };

  /** The inline padding and border an element holds its children in by. */
  const insetsOf = (element: Element): { start: number; end: number } => {
    const style = styleOf(element);
    const side = (edge: 'start' | 'end'): number => {
      const physical = edge === 'start' ? 'left' : 'right';
      const border = style.get(`border-inline-${edge}`) ?? style.get('border');
      // A border's width is its first token: `1px solid var(--color-line)`.
      const borderWidth =
        border === undefined || border === '0' || border.startsWith('none')
          ? 0
          : length(topLevelTokens(border)[0]);
      const padding =
        style.get(`padding-inline-${edge}`) ??
        style.get('padding-inline') ??
        style.get(`padding-${physical}`) ??
        style.get('padding');

      return borderWidth + (padding === undefined ? 0 : length(sideOf(padding, edge)));
    };

    return { start: side('start'), end: side('end') };
  };

  /** The outer margins an element pulls its own box in by. */
  const marginsOf = (element: Element): { start: number; end: number } => {
    const style = styleOf(element);
    const side = (edge: 'start' | 'end'): number => {
      const physical = edge === 'start' ? 'left' : 'right';
      const value =
        style.get(`margin-inline-${edge}`) ??
        style.get('margin-inline') ??
        style.get(`margin-${physical}`) ??
        style.get('margin');

      if (value === undefined) return 0;

      const chosen = sideOf(value, edge);

      // `auto` centres a box narrower than its column. Nothing inside the grid
      // sets a width, so here it always resolves to nothing.
      return chosen === 'auto' ? 0 : length(chosen);
    };

    return { start: side('start'), end: side('end') };
  };

  const isSubgrid = (element: Element): boolean =>
    styleOf(element).get('grid-template-columns') === 'subgrid';

  const edgesOf = (element: Element): Edges => {
    // Up to the grid, collecting the chain on the way.
    const chain: Element[] = [];
    let ancestor: Element | null = element;

    while (ancestor !== null && ancestor !== grid) {
      chain.unshift(ancestor);
      ancestor = ancestor.parentElement;
    }

    if (ancestor === null) throw new Error('that element is not inside this grid');

    // Down again. `box` is the border box of whatever we are looking at; each
    // step narrows it to the parent's content box and then to the child's.
    let container: Element = grid;
    let box: Edges = { left: contentStart, right: contentEnd };

    for (const [depth, node] of chain.entries()) {
      if (container === grid || isSubgrid(container)) {
        // A subgrid inherits its parent's lines, so a placement inside one is
        // read against the same table. That holds because the only subgrid in
        // the project spans the full content column; a partial one would need
        // its own offset, and this would report the wrong answer rather than
        // saying so — hence the check.
        if (container !== grid) {
          const own = placeChildren(grid).get(container);
          const spansEverything =
            own !== undefined &&
            own.start === lines.get('content-start') &&
            own.end === lines.get('content-end');

          if (!spansEverything) {
            throw new Error('a subgrid that does not span the content column is not modelled');
          }
        }

        const placement = placeChildren(container).get(node);

        if (placement === undefined) throw new Error('a child of a grid was not placed');

        box = {
          left: startAt(placement.start),
          right: endAt(placement.end),
        };
      } else {
        // An ordinary block: it fills its parent's content box, less margins.
        const padding = insetsOf(container);
        const margin = marginsOf(node);

        box = {
          left: box.left + padding.start + margin.start,
          right: box.right - padding.end - margin.end,
        };
      }

      const style = styleOf(node);
      const cap = style.get('max-inline-size');

      if (cap !== undefined) {
        const limit = toPixels(cap, { ...context, percentBasis: box.right - box.left });

        box = { left: box.left, right: Math.min(box.right, box.left + limit) };
      }

      container = node;

      // The chain's last element is the one asked about; its own padding is
      // inside its box and does not move its edges.
      if (depth === chain.length - 1) return box;
    }

    return box;
  };

  return { contentStart, contentEnd, columnGap, column, edgesOf };
}
