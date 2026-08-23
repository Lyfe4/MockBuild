# CLAUDE.md

Orientation for future sessions. Conventions live in
[CONTRIBUTING.md](CONTRIBUTING.md) and the tooling rationale in
[README.md](README.md); this file is the short version plus the things that are
easy to get wrong.

## What this is

**Thornfield Entomological Archive** — a mock website for a fictional
institution. It is a portfolio piece: no real institution, nothing is collected
from a visitor.

The institution is invented; the **collection is not**. Four real species —
_Lucanus cervus_, _Coccinella septempunctata_, _Papilio machaon_, _Aeshna
cyanea_ — each carrying a real, sourced record (taxonomy, distribution,
phenology, and the morphological characters a later identification key will
filter on) and a **hand-authored plate** traced in a simplified engraving style
from a public-domain reference.

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

Adding a species is a record in `src/data/species`, a `*.plate.ts` beside it, a
test that calls `describePlateContract`, a reference in `references/` with its
entry in `SOURCES.md`, and two lines in `src/data/species/index.ts`. It touches
no component.

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

**The season filter needs saying out loud wherever it appears.** `seasonOfMonth`
maps a month to Thornfield's _southern_ season, and every record's months were
observed in the northern hemisphere. A European stag beetle flying in May to
August comes out as autumn and winter. That is not a bug and it is not a claim
about the animal; the panel and the specimen sheet both say so in words.

## Known dead weight

`src/lib/random` (a seeded `mulberry32` and `seedFromName`) has no callers now
that the generators are gone. It is kept deliberately — nothing in the plate
pipeline is random, so if it is still unused next time this file is read, delete
it and its test.
