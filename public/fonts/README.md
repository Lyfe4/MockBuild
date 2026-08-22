# Fonts

Drop the variable font files here, named exactly as `src/styles/fonts.css`
expects:

| File                                | Family              | Licence |
| ----------------------------------- | ------------------- | ------- |
| `eb-garamond-variable.woff2`        | EB Garamond, roman  | OFL-1.1 |
| `eb-garamond-variable-italic.woff2` | EB Garamond, italic | OFL-1.1 |
| `inter-variable.woff2`              | Inter               | OFL-1.1 |

Everything in `public/` is copied to the build root untouched and served from
`/fonts/…`, which is why `fonts.css` uses root-relative URLs. Nothing is fetched
from a font CDN at build or at runtime — the Content-Security-Policy in
`index.html` permits `font-src 'self'` only.

Until the files are added, `npm run build` prints three "didn't resolve at build
time" notices for them. That is expected and harmless: the `@font-face` rules
simply fail to load and the metric-matched fallbacks in `fonts.css` render
instead.

Keep each family's `OFL.txt` alongside its `.woff2`. The OFL requires the
licence to travel with the font.
