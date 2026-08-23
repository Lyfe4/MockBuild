# Static captures

Two pages of the archive, frozen and made self-contained: the production
stylesheet is inlined, the traced references are data URIs, and there is no
JavaScript. Open either file straight off disk.

| File                                 | Route         | What it shows                                                              |
| ------------------------------------ | ------------- | -------------------------------------------------------------------------- |
| [`catalogue.html`](catalogue.html)   | `/catalogue`  | The four species, their plates, and the whole filter panel                 |
| [`lab-plates.html`](lab-plates.html) | `/lab/plates` | Every plate at 80, 240 and 600 pixels, with its alt text and its reference |

Taken in **autumn**, because the palette has to be one of the four and autumn is
the one the plates were judged in.

They are captures, not a build. Two things are worth knowing:

- **`/lab/plates` is dev-only** and never ships. The capture exists so the
  contact sheet can be looked at without running the dev server, and it is the
  only place in the repository where the traced references appear inside an HTML
  file. That is why it is 1.8 MB.
- **The filter panel is inert.** No JavaScript, so the checkboxes do not filter
  and the search box does not search. What the file preserves is the layout, the
  type, the palette and the drawings.

Regenerate them by rendering the two routes and inlining the built stylesheet;
the build has to be current (`npm run build`) or the class names in the markup
will not match the CSS.
