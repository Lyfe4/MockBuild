# Fonts

Two OFL-1.1 variable families, self-hosted. Nothing is fetched from a font CDN
at build or at runtime — the CSP in `index.html` allows `font-src 'self'` only.

| File                              | Family                           | Axes                 |  Size |
| --------------------------------- | -------------------------------- | -------------------- | ----: |
| `fraunces-latin.woff2`            | Fraunces, roman, Latin basic     | `opsz` `wght` `WONK` | 68 kB |
| `fraunces-latin-ext.woff2`        | Fraunces, roman, Latin extended  | as above             | 62 kB |
| `fraunces-italic-latin.woff2`     | Fraunces, italic, Latin basic    | `opsz` `wght`        | 82 kB |
| `fraunces-italic-latin-ext.woff2` | Fraunces, italic, Latin extended | as above             | 75 kB |
| `jetbrains-mono.woff2`            | JetBrains Mono, variable         | `wght`               | 46 kB |

Three of these are preloaded from `index.html` — the two Latin-basic Fraunces
faces and the mono — which is 196 kB on the critical path. It was 383 kB; see
_Trimming_ below.

## Provenance

- **Fraunces** 1.000 — [undercasetype/Fraunces](https://github.com/undercasetype/Fraunces)
  release `1.000`, the `Fonts - Web/variable-subsets/` files. Already subset by
  the foundry along Google Fonts' Latin ranges; used as shipped.
- **JetBrains Mono** 2.304 — [JetBrains/JetBrainsMono](https://github.com/JetBrains/JetBrainsMono)
  release `v2.304`. That release ships the variable font as TTF only, so
  `fonts/variable/JetBrainsMono[wght].ttf` was converted to WOFF2 with
  [`wawoff2`](https://www.npmjs.com/package/wawoff2) (303 kB → 111 kB). The
  converter was run once, outside this repository, and is **not** a project
  dependency.

## Trimming

The files as published were **half again as large as this site can use**, and
Lighthouse found it: on the build before this, the fonts were 383 kB of a 313 kB
critical path, the largest contentful paint was 4.5 s, and 90% of that was
render delay. Three removals, each of something the site never renders:

| Change                                                    | Effect                            |
| --------------------------------------------------------- | --------------------------------- |
| Subset JetBrains Mono to its own declared `unicode-range` | 1,743 glyphs to 527, 111 to 46 kB |
| Pin `SOFT` on all four Fraunces faces                     | about 44% off each                |
| Pin `WONK` on the two italic faces as well                | included above                    |

The mono shipped the full 1,743-glyph face behind a `@font-face` whose
`unicode-range` is Latin-only, so roughly 1,200 of those glyphs could never be
reached. `SOFT` is an axis this stylesheet only ever sets to its own default of
0 (`--font-soft`), and `WONK` is used at 1 on the wordmark and nowhere else —
and the wordmark is roman, so the italics never need it.

Done with [`fonttools`](https://github.com/fonttools/fonttools):

```bash
python -m fontTools.subset jetbrains-mono.woff2 --flavor=woff2 --layout-features=* --output-file=out.woff2 --unicodes=U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD
```

```bash
python -m fontTools.varLib.instancer fraunces-latin.woff2 SOFT=0 --no-overlap-flag
python -m fontTools.varLib.instancer fraunces-italic-latin.woff2 SOFT=0 WONK=0 --no-overlap-flag
```

Run once, outside this repository, like the WOFF2 conversion above — fonttools
is **not** a project dependency. Vendored binaries are not generated artefacts
with a `:verify` step, and pretending otherwise would mean shipping a Python
toolchain to check a file nobody edits.

**The metric overrides survive this, and it was checked rather than assumed.**
`unitsPerEm`, the `hhea` ascent and descent, the OS/2 typographic ascender and
the summed advance width of a sample string are identical before and after in
all five files — pinning an axis at its own default and dropping unreachable
glyphs cannot move the glyphs that remain. Every character the site renders is
still present in the face whose range covers it.

Neither family's `Copyright` line names a Reserved Font Name, so OFL-1.1 permits
modification without renaming. It is how Google Fonts ships its own subsets of
these same files.

## Licences

`Fraunces-OFL.txt` and `JetBrainsMono-OFL.txt` sit alongside the files they
cover. The OFL requires the licence to travel with the font — keep them here,
and keep them in any copy of `dist/`.

Neither family is covered by this repository's MIT licence.

## Changing a font

`src/styles/fonts.css` carries `size-adjust` and metric overrides on the
fallback faces, and those numbers were **measured against these exact files** in
a browser. Replacing a file without re-measuring reintroduces the layout shift
they exist to prevent.

Trimming a file as described above does not count as replacing it, provided the
five metrics listed there still match. Changing the version, the upstream
release, or the pinned axis _values_ does.
