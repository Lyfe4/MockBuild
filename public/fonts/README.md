# Fonts

Two OFL-1.1 variable families, self-hosted. Nothing is fetched from a font CDN
at build or at runtime — the CSP in `index.html` allows `font-src 'self'` only.

| File                              | Family                           | Axes                        |
| --------------------------------- | -------------------------------- | --------------------------- |
| `fraunces-latin.woff2`            | Fraunces, roman, Latin basic     | `opsz` `wght` `SOFT` `WONK` |
| `fraunces-latin-ext.woff2`        | Fraunces, roman, Latin extended  | as above                    |
| `fraunces-italic-latin.woff2`     | Fraunces, italic, Latin basic    | as above                    |
| `fraunces-italic-latin-ext.woff2` | Fraunces, italic, Latin extended | as above                    |
| `jetbrains-mono.woff2`            | JetBrains Mono, variable         | `wght`                      |

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
