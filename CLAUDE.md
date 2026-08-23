# CLAUDE.md

Orientation for future sessions. Conventions live in
[CONTRIBUTING.md](CONTRIBUTING.md) and the tooling rationale in
[README.md](README.md); this file is the short version plus the things that are
easy to get wrong.

## What this is

**Thornfield Entomological Archive** — a mock website for a fictional
institution. It is a portfolio piece: no real institution, nothing is collected
from a visitor.

The institution is invented; the **collection is not**. Eight real species,
across five orders — _Lucanus cervus_, _Coccinella septempunctata_, _Cetonia
aurata_, _Papilio machaon_, _Aeshna cyanea_, _Bombus terrestris_, _Vespa
crabro_, _Palomena prasina_ — each carrying a real, sourced record (taxonomy,
distribution, phenology, and the morphological characters a later
identification key will filter on) and a **hand-authored plate** traced in a
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
  Hymenoptera, Hemiptera. It lists the parts whose _absence_ is a mistake in a
  dorsal drawing, not every organ the animal has: a dragonfly is not asked for
  antennae (two bristles), a spread-wing butterfly is not asked for legs (none
  show), and a true bug is not asked for the hindwings folded under its
  scutellum. Read the comment above the map before adding an order.
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
- **`references/`** holds every traced reference, committed, with
  `references/SOURCES.md` recording author, publication and licence. A reference
  whose licence forbids redistribution is gitignored and recorded by URL
  instead. Nothing in `references/` is ever bundled.

- **The four plates share one test contract.** `src/test/plateContract.ts` asks
  the six things that go wrong on every plate — validator, reference, clipped
  strokes, view box, line ranks, agreement with the record — and each species
  file adds only what is true of that animal. `src/test/plateGeometry.ts` holds
  the geometry helpers they all need.

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

- **The lay label is the product.** The record says `lamellate`; the key asks
  "What do the antennae look like?" and offers "Ending in a stack of flat
  plates". Labels are `Record<Union, string>`, so a new character state fails
  the build here until somebody writes words a visitor could act on.
- **Information gain, with its bias named.** Gain favours wide questions, so the
  current key opens on colour with seven answers rather than on a two-way split.
  That is the price of the shortest key; gain _ratio_ would trade depth for
  narrower screens and is a change to one function.
- **Ties break by `KEY_TRAITS` order**, which is the whole determinism
  guarantee: the same records give the same tree, which is what lets a key in
  progress live in a URL.
- **A leaf may hold more than one species.** Two records that answer all six
  questions the same way are a true statement about the archive's characters,
  and the key says so rather than picking a winner.
- **The URL carries the trait as well as the value** (`?k=a0e3`). Branch indices
  would be shorter and would silently mean something else the moment the
  collection changes; carrying the question means a stale link stops where the
  tree and the link disagree, which is what `advance` does with it.
- **Depth is pinned by a test that prints it** — two questions for eight
  species, today. A record that makes the key deeper has to be looked at rather
  than absorbed.

## Known dead weight

None. `src/lib/random` — a seeded `mulberry32` and `seedFromName` — was the
last of it, kept one round in case the plate pipeline ever wanted a repeatable
jitter. It never did: nothing about a traced drawing is random, and a builder
that produced a different file on each run could not be verified. Deleted with
its test.

Keep this section. Something else will fall out of use, and the note that a
thing is deliberately unused is the only thing that stops the next reader
reinventing it or leaving it another year.
