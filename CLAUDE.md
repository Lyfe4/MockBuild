# CLAUDE.md

Orientation for future sessions. Conventions live in
[CONTRIBUTING.md](CONTRIBUTING.md) and the tooling rationale in
[README.md](README.md); this file is the short version plus the things that are
easy to get wrong.

## What this is

**Thornfield archive** — a mock website for a fictional institution. It is a
portfolio piece: no real institution, nothing is collected from a visitor.

The institution is invented; the **collection is not**. It is an entomological
collection of real species — starting with _Lucanus cervus_ — each carrying a
real, sourced record (taxonomy, distribution, phenology, and the morphological
characters a later identification key will filter on) and a **hand-authored
plate** traced in a simplified engraving style from a public-domain reference.

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
- **Mirroring is two `<g>` groups, not a `<use>`.** A `clip-path` inside
  `<g transform="scale(-1,1)">` resolves in that group's own user space, so one
  clip definition confines the hatching on both wing cases. Do not "simplify"
  this into a `<use>` without re-reading `SpeciesIllustration`'s comment.
- **`validatePlate` runs in a test for every plate.** Seven error classes, all
  of them mistakes that otherwise fail _quietly_: a stray minus sign puts a leg
  on the wrong side and the mirror puts a second one on top of it, so the plate
  renders, looks nearly right, and has five legs.
- **Containment is proved in the data, not by the clip.** The plate test samples
  every clipped stroke against its surface's outline.
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

Adding a species is a record in `src/data/species`, a `*.plate.ts` beside it and
a test. It touches no component.

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

## Known dead weight

`src/lib/random` (a seeded `mulberry32` and `seedFromName`) has no callers now
that the generators are gone. It is kept deliberately — nothing in the plate
pipeline is random, so if it is still unused next time this file is read, delete
it and its test.
