# CLAUDE.md

Orientation for future sessions. Conventions live in
[CONTRIBUTING.md](CONTRIBUTING.md) and the tooling rationale in
[README.md](README.md); this file is the short version plus the things that are
easy to get wrong.

## What this is

**Thornfield Entomological Archive** — a mock website for a fictional
institution. It is a portfolio piece: no real institution, nothing is collected
from a visitor.

The institution is invented; the **collection is not**. Sixteen real species
across six orders — Coleoptera (_Lucanus cervus_, _Coccinella septempunctata_,
_Cetonia aurata_, _Carabus violaceus_, _Chrysolina coerulans_), Lepidoptera
(_Papilio machaon_, _Aglais io_, _Acherontia atropos_), Odonata (_Aeshna
cyanea_, _Ischnura elegans_), Hymenoptera (_Bombus terrestris_, _Vespa crabro_,
_Formica rufa_), Hemiptera (_Palomena prasina_, _Graphosoma italicum_) and
Orthoptera (_Gryllus campestris_) — each carrying a real, sourced record
(taxonomy, distribution, phenology, and the morphological characters the
identification key filters on) and a **hand-authored plate** traced in a
simplified engraving style from a public-domain reference.

Two generations of code have been removed. Read the history if you need them —
`git log -- src/lib/plant src/lib/insect` — and the README's _How this evolved_
section for why each went. In short: a procedural plant generator drew invented
species faithful to nothing, and a procedural insect generator could draw a
plausible beetle but not a _particular_ one.

New work goes into `src/lib/plate`, `src/data/species` and
`components/SpeciesIllustration`.

## Stack

Vite · React 19 · react-router 8 (data router) · TypeScript 6 strict · vanilla
CSS Modules · Vitest + Testing Library. No Tailwind, no CSS-in-JS, no component
library, no state manager. See README for why each dependency earns its place.

## Hard rules

These are not preferences. Breaking one breaks the build, the CSP, or a season.

- **Strict CSP.** `script-src 'self'`, `style-src 'self'` — **no inline styles,
  no inline scripts, ever**. SVG carries per-element values as _presentation
  attributes_ (`stroke-width`, `cx`, `d`), never a `style` attribute. Anything
  that varies by category goes through a `data-*` attribute mapped in a CSS
  Module. The policy is duplicated in `index.html` and `public/_headers`; change
  both together.
- **Tokens only for colour.** Components consume semantic tokens
  (`var(--color-ink)`), never primitives, never raw values. A new colour means a
  primitive, a semantic token, and a value in **all four** seasons.
- **`exactOptionalPropertyTypes`.** Component props are written
  `foo?: T | undefined`; internal config objects **omit** the key instead of
  passing `undefined`. Build optional keys with a spread:
  `...(x === undefined ? {} : { x })`.
- **`noUncheckedIndexedAccess`.** Indexing yields `T | undefined`. Handle it;
  never assert it away. No `any`.
- **Mobile-first.** Every `@media` is `min-width`. Type and spacing are fluid
  `clamp()`s whose minimum is the mobile size.
- **Every feature gets tests.** Colocated `*.test.ts(x)`. Pure logic gets a
  plain unit test in `src/lib`; components are queried by role and text, never
  by test id or class.
- **`npm run check` before every commit** (lint → typecheck → test → build).
- **Conventional commits**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`,
  `chore:`.

## The page grid

`src/styles/pageGrid.module.css` is one grid taken by three elements — the
masthead's inner block, `RootLayout`'s main column and the colophon's inner
block. They share a max width, a gutter, a column gap and a track list, so their
twelve column lines land on the same pixels and alignment is a **consequence**
rather than an agreement three components keep separately.

Six line names are the contract: `content-start`/`content-end`,
`margin-start`/`margin-end`, `body-start`/`body-end`.

- **Twelve columns, because two structures have to share them.** The ledger
  wants a narrow margin against a wide body — three and nine — and the colophon
  wants three equal columns — four, four and four. Twelve is the smallest count
  that gives both on whole lines. The ledger's margin is therefore a quarter of
  the measure and grows with the page, where the old fixed `15rem` left every
  extra pixel to the body.
- **Below 48rem there is one column and all six names sit on its two edges**, so
  a component placed on `margin-start / margin-end` is full-bleed inside the
  gutters without knowing it. That is what keeps the collapse mobile-first: the
  narrow arrangement is the default and the twelve columns are the enhancement.
- **`Ledger` is a `subgrid`, not a grid of its own.** Its margin and body are
  literally columns of the page grid, which is why the filter panel starts on
  the same pixel as the wordmark and the entry column ends on the same pixel as
  the navigation. The consequence is a requirement — a `Ledger` must be a child
  of an element carrying `page` — and every route renders one root element
  straight into the main column, so it holds. **A subgrid keeps its own
  gutters**, not the parent's, so `.withMargin` restates
  `--layout-column-gap`; without it every line between the outer two is five
  pixels adrift of the colophon's.
- **Nothing is placed in `pageGrid.module.css`.** A `.page > *` default would tie
  on specificity with the consuming module's own rule and be settled by CSS
  Module import order, which is not a thing to build alignment on. Each consumer
  places its own children; `RootLayout.module.css` states the one shared default,
  `.container > *`, for route content.
- **The masthead stacks until 64rem.** Side by side at 768 the wordmark had
  195px to set 35px display type in and broke over three lines; full width it
  sets on one. Above 64rem the identity takes five columns and the controls the
  other seven, hung on `content-end`.

### What fills the entry column

The brief for a wide ledger is not to leave a dead zone to the right of the
entry column, and the answer is per page:

- **Catalogue: a third column.** A specimen row is a register line, so a wider
  line holds more of the register — plate, name, then the record (accession,
  order, family, size) hung on the right-hand edge. Not two columns of rows: an
  earlier attempt at that could not have worked, because the rule was
  `@container (min-width: 44rem)` inside `.results`' _own_ container and an
  element cannot query itself. It matched nothing at any width.
- **Calendar and key: a stated measure.** The chart caps at `72rem` because the
  cells stop being legible past it, and the key caps at `--measure` because a
  question is read, not scanned. Both are deliberate, and both are narrower than
  the content column on purpose.
- **Specimen, about, request, journal entry: the ledger's own two columns**,
  which is what the margin is for.

`src/app/layout.test.tsx` is what stops this drifting, and `src/test/layoutGeometry.ts`
is how. jsdom has no layout engine and `getComputedStyle` ignores `@media`, so the
geometry is **computed from the shipped stylesheets** — the CSSOM keeps rules,
media conditions, custom properties and the track list with its line names
verbatim, and `Element.matches` answers which rules apply. The harness models
one narrow subset of CSS and **throws on anything else**, which is the important
half: a layout it cannot model is one it would otherwise measure confidently and
wrongly. Its numbers were checked against Chrome at 1425px and agree to the
pixel.

## The seasonal dial

`src/features/theme/SeasonDial` is the control that dresses the archive for a
season, and it replaced a segmented strip of four text labels that sat directly
under the navigation. The problem was not that the strip was ugly — it was that
six mono uppercase words above four mono uppercase words read as **two rows of
navigation**, and a reader had to click one to find out it was not. A quartered
circle cannot be mistaken for a list of pages.

- **Still a `fieldset` of four real radios.** One tab stop, arrow keys, and
  `aria-checked` all come from the elements themselves; the inputs are visually
  hidden but never `display: none`, and each label carries its season's name for
  a screen reader. Nothing here is a div pretending to be a control, and there
  is no second copy of the checked state for React to keep in step — which is
  why the test queries `getByRole('radio', { checked: true })` rather than an
  `aria-checked` attribute a native radio does not have.
- **The hit area is twice the drawing.** The dial is 48px across, so a quadrant
  of it is 24px — half of what a finger needs. So the control is a **2 × 2 grid
  of 44px transparent squares**, 88px in all, with the drawing centred on the
  point where the four meet: each wedge is absolutely positioned into the inner
  corner of its own square and overflows it with `pointer-events: none`. The
  squares **tile rather than overlap**, so no point on the control belongs to two
  seasons — which is what a symmetric `inset: -11px` on each quadrant would have
  given, and why that is not what this does. The 20px of air it adds on each side
  is taken back with a negative margin.
- **One wedge, turned four times.** The path is written once and rotated a
  quarter turn per season, so the year runs clockwise from the top left and the
  four are the same shape by construction. Placement is explicit rather than
  row-major, which would run the year backwards along its second half.
- **`--color-season-*` are the one set of colour tokens not restated per
  season.** Every other semantic colour answers "what does ink look like _now_";
  these answer "what colour is autumn", and the dial paints all four at once.
  Restating them per palette would give four quadrants of one hue.
- **The focus ring is on the shape, not the square.** A second copy of the path
  is stroked at 9 and drawn underneath, transparent until `:focus-visible` — so
  the halo hugs the quadrant rather than boxing the 44px target it lives in. It
  is `--color-ink` rather than `--color-focus-ring`, because the focus token is
  the _active_ palette's accent and is therefore close to one of the four
  colours it would have to be legible against.
- **The needle is a 5px tick that rotates about the dial's centre**, not a
  full-size box with a tick drawn at its top. The second is simpler and was
  wrong: **a rotated box overflows by its diagonal**, so an 88px square turned 45
  degrees is 124px wide and put four pixels of horizontal scroll onto a 768px
  window. It transitions on `--duration-palette`, which ties it to the seasonal
  cross-fade and is 0ms until `ThemeProvider` marks the document ready — so the
  needle is simply there on the first paint rather than spinning into place on
  every load. Reduced motion zeroes it with everything else.
- **`max-inline-size: none` on the wedge SVG** is load-bearing: the reset's
  `svg { max-width: 100% }` clamped a 48px drawing to its 44px label, and every
  wedge then met the others two pixels past the centre instead of on it.

## Plate architecture

`src/lib/plate` is **pure data out** — no React, no DOM. A plate is path data
plus roles; the renderer turns it into SVG and the CSS turns roles into ink.

```
Species record  ──┐
                  ├─ SpeciesIllustration ─→ SVG
SpeciesPlate    ──┘        │
                           └─ describePlate(species, {sex, hallmark}) → alt text
```

- **Plate space.** Midline at `x = 0`, `y` from 0 at the head end to 1000 at the
  abdomen tip, so two species are directly comparable. Appendages may leave that
  band — a stag beetle's tarsi reach past 1200 — and `plateViewBox` measures the
  drawing rather than assuming a frame.
- **The frame is the drawing's own bounds.** `plateBounds` measures every point
  of every part with the mirrored halves included and grows the box by half the
  heaviest stroke; `plateViewBox` pads that by one margin taken from the longer
  side and centres it on the midline. The svg also caps its own height at 100%
  of its parent, so a portrait plate in a square frame letterboxes rather than
  spilling out.
- **Authors draw the right half only.** The renderer reflects it, which is the
  entire bilateral-symmetry mechanism. Parts that straddle the axis and are
  symmetric in themselves declare `mirror: false` and are drawn once; reflecting
  them would produce a doubled line.
- **Mirroring is a `transform` on the path, not a `<use>`.** A `clip-path` on a
  transformed element resolves in that element's own user space, so one clip
  definition confines the hatching on both wing cases. Do not "simplify" this
  into a `<use>` without re-reading `SpeciesIllustration`'s comment.
- **The array is the stacking, for both halves.** Each mirrored part is emitted
  followed immediately by its reflection, and nothing is grouped or sorted. An
  earlier renderer drew every mirrored part and then every midline part, which
  made it impossible for anything mirrored to sit on top of anything on the
  axis — the stag beetle's pronotal hatching went under its own pronotum and
  vanished, and the plate looked merely plain rather than broken.
- **`validatePlate` runs in a test for every plate.** Eight error classes, all
  of them mistakes that otherwise fail _quietly_: a stray minus sign puts a leg
  on the wrong side and the mirror puts a second one on top of it, so the plate
  renders, looks nearly right, and has five legs.
- **`REQUIRED_PARTS` is per order** — Coleoptera, Lepidoptera, Odonata,
  Hymenoptera, Hemiptera, Orthoptera. It lists the parts whose _absence_ is a
  mistake in a dorsal drawing, not every organ the animal has: a dragonfly is
  not asked for antennae (two bristles), a spread-wing butterfly is not asked
  for legs (none show), a true bug is not asked for the hindwings folded under
  its scutellum, and a cricket is not asked for the vestigial ones under its
  tegmina. Read the comment above the map before adding an order.
- **Hymenoptera is not asked for wings**, which is the one entry that has been
  taken away rather than added. Winglessness is normal in that order rather
  than exceptional — every ant worker has none — so requiring them made the
  wood ant's plate unbuildable, and the fix was not to draw wings the animal
  does not have. The bumblebee's and the hornet's own tests assert their four,
  which is where a fact about one species belongs.
- **`opacity: 'membrane'`** makes a wing a window: a real `fill-opacity`, and
  the one place in the project where a fill is composited rather than
  `color-mix`ed into the surface token. Four dragonfly wings overlap each other
  and the abdomen, and what is behind them is the point. Only `forewing` and
  `hindwing` may declare it; the validator rejects it anywhere else. It travels
  as a class, never an inline style.
- **Containment is proved in the data, not by the clip.** The plate test samples
  every clipped stroke against its surface's outline.
- **`sizing` is `fit` by default, and `scale` is opt-in.** `Species.scale` is
  _true relative size_ — it only says anything when another specimen is on
  screen to be compared against. Every view the archive has today shows one
  specimen at a time, so they all take the default and the plate fills its frame
  from its own bounds. `sizing="relative"` is reserved for a compare or drawer
  view. Applying `scale` to a lone drawing does not communicate size; it draws a
  small animal small with nothing to be small against.
- **Three ranks.** `--plate-stroke-*` are large numbers because plate space is
  large; a stroke of 1 in a box 1300 units tall is a hairline. Outline must stay
  the heaviest — that ranking is what makes one drawing work at 80 pixels and at 600.
- **Limb proportions come off the reference.** Femora and tibiae are capsules,
  measured across at roughly six and four per cent of the width across the wing
  cases. The first pass drew them half again as heavy and the animal looked
  moulded rather than engraved.
- **`references/`** holds every traced reference, committed. A reference whose
  licence forbids redistribution is gitignored and recorded by URL instead.
  Nothing in `references/` is ever bundled. **`references/SOURCES.md` is
  generated** — see _The source records_ below.

- **The sixteen plates share one test contract.** `src/test/plateContract.ts`
  asks the six things that go wrong on every plate — validator, reference,
  clipped strokes, view box, line ranks, agreement with the record — and each
  species file adds only what is true of that animal.
  `src/test/plateGeometry.ts` holds the geometry helpers they all need, and a
  species test that wants to say "narrower than that one" imports the other
  plate and measures both: every plate runs the body from y = 0 to y = 1000, so
  the numbers are comparable.

## The plate builder

**`src/data/species/*.plate.ts` is generated.** The source is
`src/data/species/landmarks/<slug>.json` — the points measured off the reference
— and `scripts/plate-builder` turns those into path data.

```bash
npm run plate:build     # landmarks -> *.plate.ts
npm run plate:verify    # fail if any committed plate has drifted from its landmarks
```

`plate:verify` runs inside `npm run check`, before the tests, and compares
**bytes**. The build is deterministic on purpose — fixed rounding, no clock, no
randomness, Prettier with the project's own config — so byte equality is a fair
thing to demand, and it is what stops somebody fixing a wing in the generated
file and losing it on the next build.

- **Five shapes.** `curve` (a traced margin), `capsule` (a limb: spine plus
  thickness), `ellipse` (an eye, a spot), `strip` (a band following an edge),
  `fan` (hatching, striae, veins — one measurement, many strokes). The full
  authoring workflow, reference to lab sheet, is in CONTRIBUTING.
- **The smoothing is _centripetal_ Catmull-Rom, not uniform.** Uniform throws
  control points far outside the curve where landmarks are unevenly spaced, and
  `plateBounds` measures control points deliberately — so the first build of the
  ladybird came out 0.64 as wide as it was long against the 0.85 measured off
  the lithograph, with the curve itself not having moved at all.
- **A landmark on the midline gets a vertical tangent** on any part that is
  mirrored. That is what the anatomy says, and without it a control point lands
  a hair left of `x = 0` and `validatePlate` reports `negative-x` — correctly,
  because that is ink on the half the author did not draw.
- **A curve that does not follow the reference wants another landmark**, not a
  lower `tension`. The curve passes through every point it is given.
- **Prose lives in the landmark file** (`doc`, and a part's `note`) because JSON
  cannot hold a comment and the emitter has to own every byte it writes.

Adding a species is a record in `src/data/species`, a landmark file in
`src/data/species/landmarks`, a test that calls `describePlateContract`, a
reference in `references/` with its entry in `SOURCES.md`, and two lines in
`src/data/species/index.ts`. It touches no component.

## The source records

`src/data/references/sources.ts` is **the single source of truth for
provenance**, and two things render it: `references/SOURCES.md`, built by
`npm run sources:build`, and the About page's credits list.

```bash
npm run sources:build     # src/data/references -> references/SOURCES.md
npm run sources:verify    # fail if the committed markdown has drifted
```

`sources:verify` runs inside `npm run check` and in CI, and compares **bytes**,
exactly like `plate:verify` — same reasoning, same emitter shape, Prettier with
the project's own config so a generated markdown file passes `format:check`.
The CI job runs both in one _Verify generated files_ step; it ran neither until
the credits list started reading the same records as the markdown.

- **Prose about one reference lives in the data module** (`notes`); prose about
  the folder as a whole lives in the emitter. Same split the plate builder makes
  between a landmark file's `doc` and its banner.
- **The emitter hard-wraps prose at 78 columns before Prettier sees it**, because
  the project's Prettier config sets `proseWrap: preserve` for markdown. Prettier
  keeps whatever wrapping it is given, so a paragraph stored as one long string
  would be committed as one 400-character line.
- **`publicationLine` is composed, not stored.** Stored whole it repeated the
  work, the figure and the year that are already fields, and a credits list
  wanting the title alone had to parse it back out.
- **Each plate keeps its own short `reference` block** — a drawing has to be able
  to caption itself without loading this module, and the specimen sheet reads it.
  `sources.test.ts` asserts the two agree on artist, year, licence and source
  URL. That is the one drift this arrangement can still have, and the only kind
  it can have quietly.
- **`Used by` is derived from the slug**, not stored. The hand-written file said
  `*.plate.ts` for the four entries written before the builder existed and the
  landmark file for the twelve after it. Both were true when written; neither was
  checkable.
- **`src/data/institution.ts`** holds the invented archive's own facts — founding
  year, town, reading room hours — because the masthead, the colophon and the
  About page all state them. Three copies of a fictional year is how a fictional
  institution gets founded twice. Nothing _derived_ from the collection goes
  there: the About page counts specimens and orders out of `SPECIES`.

## The lab route

`/lab/plates` is the contact sheet the plates are judged on. **Dev only** — it
lives behind `import.meta.env.DEV` in `src/app/router.tsx` inside a dynamic
`import()`, so the branch is dead code at build time and the module is never
emitted. That matters here: the page displays the traced references, and those
must not ship.

```bash
npm run dev
```

Every plate at 80, 240 and 600 pixels, in the current season, with the alt text
it will be given and the reference it was traced from. Frames are absolute
pixels rather than fluid, because the comparison is about size itself. The
validator's verdict is printed on the page.

The route and its stylesheet are temporary; they go when the plates have nothing
left to prove.

## The catalogue

`SPECIES` in `src/data/species/index.ts` is in **accession order**, not
alphabetical, because that is the order the `TEA-0001` numbers are assigned in
and an accession number must never change under a specimen that already has
one. Add a species by appending.

Filters and sort live in the URL, parsed by `src/lib/catalogue/query.ts`, which
treats a URL as untrusted input: unknown values are dropped, facet order is
normalised so two equivalent links parse identically, and the search term is
trimmed and capped. `filter.ts` is pure functions over an array — every facet is
an AND against the others and an OR within itself.

**The filter panel has two presentations, one at a time.** Above the ledger's
breakpoint it is the margin column, always open. Below it, it is a disclosure
between the heading and the list, with the count of what is applied on the
button — a phone opened the catalogue on nine hundred pixels of form otherwise,
with the collection below the fold. The _markup_ differs, not just the CSS, so
`CatalogueRoute` reads the breakpoint through `useMediaQuery`; rendering both
and hiding one would put two search boxes with the same label into the page.

**The catalogue's margin is deliberately not sticky.** `Ledger` takes `sticky`
as a prop because only the caller knows how tall its margin is: a sticky element
taller than the viewport pins its top and leaves its foot below the fold, where
no scroll position reaches it, and the filter panel is half again the height of
an 800px window. Capping it with `overflow-y: auto` only traded an unreachable
foot for a scroll container with nothing on screen to say it scrolled. The
specimen sheet, whose margin is one plate and a caption, is what passes
`sticky`.

**The season filter needs saying out loud wherever it appears.** `seasonOfMonth`
maps a month to Thornfield's _southern_ season, and every record's months were
observed in the northern hemisphere. A European stag beetle flying in May to
August comes out as autumn and winter. That is not a bug and it is not a claim
about the animal; the panel and the specimen sheet both say so in words.

## The identification key

`src/lib/key` is **pure data out** — no React, no DOM — and the key is
_derived_, never written. Each `Morphology` field is a question, each state of
its union an answer, and `buildKey` chooses at every node the question with the
most information gain over the species still in play. A species is therefore
keyable the moment its record exists, and no branch mentions an animal.

- **A character state may be added when nothing true fits.** `hemelytra` was
  added for the shield bug and `tegmina` for the cricket, both because the
  nearest existing answer would have made the record lie — a cricket's
  forewings are leathery and overlap, which is precisely what `elytra` says
  they do not. Adding one in the _middle_ of the union used to break every
  shared key link; now that the codes hash the value's name it does not, and
  `tegmina` sits between `hemelytra` and `membranous` where it belongs.
- **The lay label is the product.** The record says `lamellate`; the key asks
  "What do the antennae look like?" and offers "Ending in a stack of flat
  plates". Labels are `Record<Union, string>`, so a new character state fails
  the build here until somebody writes words a visitor could act on.
- **Information gain, weighted, and colour held back.** Raw gain favours
  breadth, colour has the most states, and the first key therefore opened by
  asking a reader to pick a colour out of seven and keyed out seven of the
  eight species it then held on that one screen. Two questions, and it read as a menu rather than
  a key. So `TRAIT_PRIORITY` weights gain — structure ahead of surface, wing
  cover first, colour at a fifth — and `LAST_RESORT` is a separate hard rule
  that will not ask a colour question above `LAST_RESORT_DEPTH` unless nothing
  else separates anything. Two mechanisms because a weight is a ratio and
  cannot promise "not before question three"; the rule can. Gain _ratio_ was
  the alternative and fixes only the breadth half.
- **Ties break by `KEY_TRAITS` order**, which is the whole determinism
  guarantee: the same records give the same tree, which is what lets a key in
  progress live in a URL.
- **A leaf may hold more than one species.** Two records that answer all six
  questions the same way are a true statement about the archive's characters,
  and the key says so rather than picking a winner.
- **The URL carries the trait as well as the value**, and carries both as a
  **hash of their names** — four base-36 characters per answer, `answerCode`.
  Branch indices would be shorter and would silently mean something else the
  moment the collection changed; carrying the question means a stale link stops
  where the tree and the link disagree, which is what `advance` does with it.
  Positions in the union were the first encoding and were wrong the same way one
  level down: unions grow in the middle, so inserting a colour renumbered the
  two after it and every shared link naming one came back naming the other.
  A name hashes to itself wherever it sits. Four characters is collision
  headroom over a forty-pair vocabulary, and the test asserts every code is
  distinct.
- **Depth is pinned by a test that prints it**, under a ceiling of five — three
  questions for sixteen species, and sixteen leaves, so every record keys out
  on its own. A record that makes the key deeper has to be looked at rather
  than absorbed, and the same test prints the opening question, which must not
  be colour.

`/key` is the page, and it is one route for the intro, every question and every
leaf, because the answers live in the query string rather than the path.

- **The parameter's absence is the intro**; its presence, even empty, is the key
  — which is why the start button navigates to `?k=`. That is one state more
  than a list of answers can hold and it has to be held somewhere.
- **Every answer is a push**, so the browser's own back button walks back up the
  key and the page does nothing to arrange it. The Back control goes to the
  previous question, and out to the intro from the first.
- **A stale link is never rewritten under the reader.** The next answer is
  written from `position.answers`, so the URL heals on the first tap.
- **The h2 takes focus on each answer.** `RootLayout` only moves focus when the
  _path_ changes, and answering changes the query — so without it a keyboard
  reader is left on a button that no longer exists. The remaining count is the
  page's one live region; the question is announced by the heading.
- **Options are buttons, not radios.** Choosing an answer moves the reader on,
  and a radio that navigates is a radio lying about what it does. Arrow keys
  move focus along them, handled on each button rather than on the group.
- **An option shows a count, never a name.** Naming the species behind an
  answer would key the collection out on the first screen.

## The phenology calendar

`/calendar` is a month × species matrix built from `activeMonths` and from
nothing else — the field the `Species` doc comment always said a calendar would
plot. `src/lib/calendar` is pure functions; the route renders them.

- **The year is a ring, and the chart cuts it in July.** July is where the
  Australian year is cut and it keeps spring, summer and autumn as unbroken runs
  of three columns. The cost is real and the page says so out loud: every
  record's months were observed in the **northern** hemisphere, where the flight
  season is centred on June and July, so many bars appear at _both ends_ of
  their row. A stag beetle flying May to August is one period of four months,
  two columns at each edge.
- **So `activeRuns` joins across the cut** and `firstActiveIndex` reports where
  the joined run _starts_. Taking the first active column instead — the first
  version — scored thirteen of the sixteen records zero, because thirteen of
  them are on the wing in July, and the row order fell through to the tie-break
  on the name. Fixed, the rows step down the page from August through February,
  March, April and May, which is what the animals do.
- **The season tint is the tie to the theme engine.** `useSeason` gives the
  season the site is dressed in and the three header cells belonging to it are
  tinted; switching season re-tints them. It is the one place in the archive
  where the palette switcher changes what the _data_ looks like rather than only
  what colour it is drawn in.
- **A real table**, with a `<caption>`, `scope="col"` on the months and
  `scope="row"` on the species. Each cell carries its state as visually hidden
  text — a filled square is not a fact a screen reader can read. The
  alternative, one summary sentence per row, was rejected: a row header is
  announced again for every cell beside it, so a twelve-word summary there is
  read twelve times. The sentence is on the **link** instead, where it is read
  once.
- **The caption is set twice, once each way.** A `<caption>` is as wide as its
  table, so on a phone its text wraps at 40rem and a reader sees the first 375
  pixels of each line. The caption stays, visually hidden and still what a
  screen reader gets; the same sentence is set again above the scroller, where
  it wraps to the viewport, and that copy is `aria-hidden`.
- **Row order lives in the URL** (`?by=taxonomy`), like the catalogue's filters
  and the key's answers, so a link to the chart is a link to the chart somebody
  was looking at. Taxonomic order is alphabetical within order and family, not
  phylogenetic — a sequence would be a claim about relationships the archive is
  not making.
- **`RootLayout`'s `main` now zeroes its minimum inline size**, and the calendar
  is why. A grid item's automatic minimum size is its content's minimum, so the
  table's `min-inline-size: 40rem` reached all the way up and stretched the
  whole document to 674 pixels on a 375-pixel screen — the header ran off the
  right edge and the chart never needed to scroll at all. That is a shell fix
  rather than a route fix, because it is true of any wide content.

## The field journal

`/journal` is an index and `/journal/:slug` is an entry. The content is markdown
files in `src/content/journal`, read at **build time** by `import.meta.glob`
with `?raw` — no fetch, no loader, no runtime markdown dependency, and the CSP
untouched. `src/lib/journal` is pure functions; `src/data/journal` does the glob
and the parse; `features/journal/JournalProse` renders.

- **Markdown never becomes an HTML string.** The parser returns blocks and
  spans and `JournalProse` builds real elements, so there is no
  `dangerouslySetInnerHTML` anywhere in the path. That is the mechanism.
- **The sanitiser runs anyway, on first-party content**, and
  `src/lib/journal/sanitise.ts` argues the case in full: the no-HTML-string
  property has to be _maintained_, a lede goes into string sinks React does not
  escape, and a block list carrying markup in a text span would be lying about
  its own type. A sanitiser that only runs on untrusted input is one nobody
  remembers to run on the day the input changes.
- **A tag must start with a letter.** The first `TAGGISH` pattern was
  `/<[^>]*>?/`, which ate the rest of the sentence after `2 < 4`.
- **Unknown frontmatter keys are an error.** `speciesid` for `speciesId` would
  otherwise parse cleanly and lose the entry's thumbnail without a word — which
  is the whole class of failure this arrangement exists to make loud.
- **The declared `season` is checked against the date** through
  `seasonOfMonth`. It is southern, so a June entry is a winter entry; the index
  says so, because unsaid it reads as a bug. A tag that disagrees with its own
  date is invisible on the page, since the tag is what the page shows.
- **A bad file fails a test, not the build.** `parseJournalEntry` never throws:
  `JOURNAL_PARSES` keeps every file with its problems and `JOURNAL_ENTRIES`
  keeps what parsed, so the route renders what is good and
  `src/data/journal/journal.test.ts` fails by name with what is wrong. A route
  filtering silently is what would make a typo invisible.
- **Dates are strings, start to finish.** `formatEntryDate` reads
  `YYYY-MM-DD` with a regex and takes the month name from `lib/calendar`. Going
  through `new Date` would hand a day a time zone it has not got, and date an
  entry the 31st of December for a reader in Perth.
- **The index is a `ul`, not an `ol`.** The entries are in date order but the
  position is not content — nobody refers to the third entry — and an ordered
  list has a screen reader count them out.

## The request form

`/request` is a mock form built as though it filed something. `src/lib/request`
is the schema and the pure helpers; `RequestRoute` is the page. **Zod** is here
for it — the one runtime dependency added since react-router, and the README
says why.

- **Nothing is sent.** No endpoint, no fetch, no third party. Submitting
  validates, mints a reference and shows a panel. The notice saying so is
  **above the form**, not only in the confirmation: somebody typing their email
  address into a fictional institution's form deserves to know beforehand.
- **`requestReference` is a hash of what was typed**, FNV-1a with `Math.imul`,
  so it is pure, testable, and the same for the same request. There is no
  counter to keep — no server, no storage, nothing that remembers the last one.
- **Validation is on submit, not on keystroke**, and a field's error clears as
  that field is edited. The page should not argue with somebody mid-word, or
  with somebody already fixing it.
- **Focus goes to the first invalid field in `REQUEST_FIELDS` order**, which is
  page order. The first field the _validator_ reported is a different field and
  would send a reader backwards.
- **`aria-describedby` names the hint and the error**, in that order and only
  the ones that exist; `aria-invalid` marks the control; the invalid rule is
  heavier as well as accented, because colour alone says nothing to a reader who
  cannot see it. A dangling id fails silently, so a test resolves the attribute.
- **The honeypot short-circuits and says nothing.** A baited submission gets the
  same confirmation a real one does — telling a bot it failed teaches it what to
  change. It is off-canvas rather than `display: none` (which some bots skip),
  `aria-hidden` on the wrapper and `tabIndex={-1}` on the input, and it is not
  in `REQUEST_FIELDS` because it is not a field of a request.
- **`today` comes from local date parts, not `toISOString`.** At 9am in Sydney
  that returns yesterday and the date input refuses today. It is read once in a
  `useState` initialiser so it cannot change under a reader at midnight.
- **`?species=` preselects, and an unknown id selects nothing.** Falling back to
  the first specimen would have a visitor ask for an animal they never named.
  The specimen sheet links here with the parameter set.

## Known dead weight

None. `src/lib/random` — a seeded `mulberry32` and `seedFromName` — was the
last of it, kept one round in case the plate pipeline ever wanted a repeatable
jitter. It never did: nothing about a traced drawing is random, and a builder
that produced a different file on each run could not be verified. Deleted with
its test.

Keep this section. Something else will fall out of use, and the note that a
thing is deliberately unused is the only thing that stops the next reader
reinventing it or leaving it another year.
