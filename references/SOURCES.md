# Reference images

Every plate is traced from a reference held here. The measurements taken from
it live in `src/data/species/landmarks/*.json`; `src/data/species/*.plate.ts`
is built from those. This file records where each one came from and on what terms, so the
provenance travels with the drawing rather than living in someone's memory.

**These files are committed.** Every entry below is public domain — the author
has been dead for more than a century and the work was published long before
1923 — so redistributing them inside this repository is permitted. If a future
reference arrives under terms that do **not** allow redistribution, add it to
`.gitignore`, record the download URL here instead of the file, and say so in
its entry.

Tracing is our own work. A plate is a simplified engraving drawn _from_ the
reference, not a copy of it: outlines, proportions and the arrangement of the
limbs come from the reference, and the linework, hatching and colour are ours.
The reference is not shipped to the browser — it appears only on the dev-only
`/lab/plates` contact sheet, where it is credited on screen.

---

## Lucanus cervus (male)

|                  |                                                                                                                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Species**      | _Lucanus cervus_ (Linnaeus, 1758) — European stag beetle, male                                                                                                                                                                          |
| **View**         | Dorsal, whole animal, legs spread                                                                                                                                                                                                       |
| **File**         | [`lucanus-cervus.jpg`](lucanus-cervus.jpg) — 792 × 1256, 273 KB                                                                                                                                                                         |
| **Source page**  | <https://commons.wikimedia.org/wiki/File:Lucanus.cervus.male.-.calwer.22.20.jpg>                                                                                                                                                        |
| **File URL**     | <https://upload.wikimedia.org/wikipedia/commons/c/cd/Lucanus.cervus.male.-.calwer.22.20.jpg>                                                                                                                                            |
| **Author**       | Emil Hochdanz (1816–1885), lithographer                                                                                                                                                                                                 |
| **Published in** | Carl Gustav Calwer & Gustav Jäger, _Käferbuch. Naturgeschichte der Käfer Europas_, Stuttgart: Julius Hoffmann, 1876 — Table 22, figure 20                                                                                               |
| **Licence**      | **Public domain.** Wikimedia Commons tags the file `{{PD-old-100-1923}}`: the author died more than 100 years ago and the work was published before 1923, so copyright has expired in both the country of origin and the United States. |
| **Downloaded**   | 2026-08-23                                                                                                                                                                                                                              |
| **Used by**      | `src/data/species/lucanus-cervus.plate.ts`                                                                                                                                                                                              |

A hand-coloured lithograph rather than a photograph, which is why it was
chosen: the engraver has already done the abstraction the plate schema wants —
a clean silhouette, the antler mandibles read as shape rather than as
highlight, and every limb is laid out flat and unobscured. A dorsal photograph
would have given truer colour and no usable line.

---

## Coccinella septempunctata

|                  |                                                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Species**      | _Coccinella septempunctata_ Linnaeus, 1758 — seven-spot ladybird                                                                          |
| **View**         | Dorsal, whole animal, legs spread                                                                                                         |
| **File**         | [`coccinella-septempunctata.jpg`](coccinella-septempunctata.jpg) — 198 × 202, 22 KB                                                       |
| **Source page**  | <https://commons.wikimedia.org/wiki/File:Coccinella.septempunctata.-.calwer.46.17.jpg>                                                    |
| **File URL**     | <https://upload.wikimedia.org/wikipedia/commons/e/ee/Coccinella.septempunctata.-.calwer.46.17.jpg>                                        |
| **Author**       | Emil Hochdanz (1816–1885), lithographer                                                                                                   |
| **Published in** | Carl Gustav Calwer & Gustav Jäger, _Käferbuch. Naturgeschichte der Käfer Europas_, Stuttgart: Julius Hoffmann, 1876 — Table 46, figure 17 |
| **Licence**      | **Public domain.** Wikimedia Commons tags the file `{{PD-old-100-1923}}`.                                                                 |
| **Downloaded**   | 2026-08-23                                                                                                                                |
| **Used by**      | `src/data/species/coccinella-septempunctata.plate.ts`                                                                                     |

The same book and the same hand as the stag beetle, which is the reason it was
chosen over the many better photographs: two plates traced from one engraver
sit together without looking like two projects. It is a small file — 198 pixels
square — and that turned out not to matter, because what a ladybird needs from
its reference is the outline, the spot positions and the pale pronotal patches,
and all three survive at that size.

---

## Papilio machaon

|                  |                                                                                                                                                                                                                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Species**      | _Papilio machaon_ Linnaeus, 1758 — Old World swallowtail                                                                                                                                                                                                                                                                   |
| **View**         | Upperside, wings spread (left figure). The right figure is the underside and is not traced.                                                                                                                                                                                                                                |
| **File**         | [`papilio-machaon.jpg`](papilio-machaon.jpg) — 2000 × 751, 390 KB                                                                                                                                                                                                                                                          |
| **Source page**  | <https://commons.wikimedia.org/wiki/File:Papilio_machaon_Schwalbenschwanz.jpg>                                                                                                                                                                                                                                             |
| **File URL**     | <https://upload.wikimedia.org/wikipedia/commons/9/92/Papilio_machaon_Schwalbenschwanz.jpg>                                                                                                                                                                                                                                 |
| **Author**       | Jacob Hübner (1761–1826)                                                                                                                                                                                                                                                                                                   |
| **Published in** | Reproduced in _Das kleine Schmetterlingsbuch: Die Tagfalter_, Insel-Bücherei Nr. 213. The plate itself is Hübner’s and considerably older than that edition.                                                                                                                                                               |
| **Date**         | **Undated on the source page.** 1826 is recorded in the plate as the year, and it is Hübner’s death year rather than a publication date — the latest the drawing can be, and what the public-domain claim rests on. The Papilionidae plates of his _Sammlung europäischer Schmetterlinge_ were issued a good deal earlier. |
| **Licence**      | **Public domain.** Wikimedia Commons tags the file `{{PD-Art                                                                                                                                                                                                                                                               | PD-old-auto-1923 | deathyear=1826}}`: a faithful photographic reproduction of a two-dimensional work whose author died in 1826. |
| **Downloaded**   | 2026-08-23                                                                                                                                                                                                                                                                                                                 |
| **Used by**      | `src/data/species/papilio-machaon.plate.ts`                                                                                                                                                                                                                                                                                |

Chosen for the pose. A spread-wing upperside with both wings fully open and
nothing foreshortened is what a plate needs and what most photographs of a live
swallowtail cannot give. The stipple that carries the yellow ground in the
lithograph is left behind entirely; what is taken is the wing shape, the tail,
the black bands, the row of blue lunules and the orange ocellus.

---

## Aeshna cyanea

|                  |                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Species**      | _Aeshna cyanea_ (O. F. Müller, 1764) — southern hawker. Captioned _Æschna cyanea_ on the plate, which is the older spelling.                      |
| **View**         | Dorsal, natural size, two figures. Only the left figure is traced.                                                                                |
| **File**         | [`aeshna-cyanea.jpg`](aeshna-cyanea.jpg) — 3330 × 2025, 323 KB                                                                                    |
| **Source page**  | <https://commons.wikimedia.org/wiki/File:British_dragonflies_(Plate_XVII)_(6002339478).jpg>                                                       |
| **File URL**     | <https://upload.wikimedia.org/wikipedia/commons/5/5d/British_dragonflies_%28Plate_XVII%29_%286002339478%29.jpg>                                   |
| **Author**       | William John Lucas (1858–1932)                                                                                                                    |
| **Published in** | _British Dragonflies (Odonata)_, London: L. Upcott Gill, 1900 — Plate XVII                                                                        |
| **Licence**      | **Public domain.** Wikimedia Commons tags the file public domain; published 1900, author died 1932. Scanned by the Biodiversity Heritage Library. |
| **Downloaded**   | 2026-08-23                                                                                                                                        |
| **Used by**      | `src/data/species/aeshna-cyanea.plate.ts`                                                                                                         |

Lucas draws each of the two figures with its wings spread to one side and its
legs splayed to the other, so that the two do not overlap on the page. The
animal has both on both sides, so the plate takes the wings off the left-hand
figure's left and its legs off its right, and folds each across the midline —
see the comment at the top of `aeshna-cyanea.plate.ts`. The venation is the
part deliberately not reproduced: Lucas draws several hundred cells a wing, and
nine strokes are traced.

---

## Bombus terrestris (female)

|                  |                                                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Species**      | _Bombus terrestris_ (Linnaeus, 1758) — buff-tailed bumblebee, female                                                                      |
| **View**         | Dorsal, wings spread — figure 3 of the plate                                                                                              |
| **File**         | [`bombus-terrestris.jpg`](bombus-terrestris.jpg) — 1882 × 2860, 201 KB                                                                    |
| **Source page**  | <https://commons.wikimedia.org/wiki/File:SaundersHymenopteraAculeataPlate52.jpg>                                                          |
| **Author**       | Robert Morgan (_del. et lith._), lithographer; printed by Vincent Brooks, Day & Son                                                       |
| **Published in** | Edward Saunders, _The Hymenoptera Aculeata of the British Islands_, London: L. Reeve & Co., 1896 — Plate 52, figure 3                     |
| **Licence**      | **Public domain.** Wikimedia Commons tags the file `{{PD-US-expired}}` and `{{PD-old-70}}`: published in 1896, and Saunders died in 1910. |
| **Downloaded**   | 2026-08-23                                                                                                                                |
| **Used by**      | `src/data/species/landmarks/bombus-terrestris.json`                                                                                       |

The plate's own text sheet names every figure, which is why this one could be
used: figure 3 is captioned _Bombus terrestris, Linn., female_, and the buff
tail, the collar and the abdominal band are all legible on it. A specimen
photograph would have been sharper and would have given a specimen rather than
a species — a dead bumblebee's fur mats, and matted fur is the one thing that
cannot be un-drawn.

---

## Vespa crabro (male)

|                  |                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Species**      | _Vespa crabro_ Linnaeus, 1758 — European hornet, male                                                                 |
| **View**         | Dorsal, wings spread — figure 1 of the plate                                                                          |
| **File**         | [`vespa-crabro.jpg`](vespa-crabro.jpg) — 1882 × 2860, 196 KB                                                          |
| **Source page**  | <https://commons.wikimedia.org/wiki/File:SaundersHymenopteraAculeataPlate20.jpg>                                      |
| **Author**       | Robert Morgan (_del. et lith._), lithographer; printed by Vincent Brooks, Day & Son                                   |
| **Published in** | Edward Saunders, _The Hymenoptera Aculeata of the British Islands_, London: L. Reeve & Co., 1896 — Plate 20, figure 1 |
| **Licence**      | **Public domain.** Wikimedia Commons tags the file `{{PD-US-expired}}` and `{{PD-old-70}}`.                           |
| **Downloaded**   | 2026-08-23                                                                                                            |
| **Used by**      | `src/data/species/landmarks/vespa-crabro.json`                                                                        |

The same artist and the same book as the bumblebee, one plate of yellowjackets
earlier, which is a small piece of luck: the hornet is drawn beside the five
British social wasps it is most often confused with, at the scale bars the
plate gives for each. Captioned _Vespa crabro Linn. male_, and that caption is
why this drawing commits to a sex — a male's antennae are longer than a
worker's, and both are in the figure.

---

## Palomena prasina

|                  |                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Species**      | _Palomena prasina_ (Linnaeus, 1761) — green shield bug                                                                |
| **View**         | Dorsal, whole animal — figure 1 of the plate                                                                          |
| **File**         | [`palomena-prasina.jpg`](palomena-prasina.jpg) — 874 × 1388, 89 KB                                                    |
| **Source page**  | <https://commons.wikimedia.org/wiki/File:SaundersHemipteraHeteropteraBritishIslandsPlate3.jpg>                        |
| **Author**       | Robert Morgan (_del. et lith._), lithographer; printed by Vincent Brooks, Day & Son                                   |
| **Published in** | Edward Saunders, _The Hemiptera Heteroptera of the British Islands_, London: L. Reeve & Co., 1892 — Plate 3, figure 1 |
| **Licence**      | **Public domain.** Wikimedia Commons tags the file `{{PD-old-70-1923}}`.                                              |
| **Downloaded**   | 2026-08-23                                                                                                            |
| **Used by**      | `src/data/species/landmarks/palomena-prasina.json`                                                                    |

Captioned under the old name _Pentatoma prasina_, which the Commons file page
resolves to the current combination. The smallest reference in the collection
at 874 pixels wide, and the figure occupies about a seventh of it — enough for
the outline, the scutellum and the membrane, which is what the plate needed,
and not enough for the punctation, which is drawn as hatching instead.

---

## Cetonia aurata

|                  |                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Species**      | _Cetonia aurata_ Linnaeus, 1758 — rose chafer                                                                                                          |
| **View**         | Dorsal, whole animal — figure 15 of the plate                                                                                                          |
| **File**         | [`cetonia-aurata.jpg`](cetonia-aurata.jpg) — 1920 × 3017, 1.3 MB                                                                                       |
| **Source page**  | <https://commons.wikimedia.org/wiki/File:Georgiy_Jacobson_-_Beetles_Russia_and_Western_Europe_-_plate_31.jpg>                                          |
| **Author**       | Georgiy Georgiyevich Jacobson (1871–1926)                                                                                                              |
| **Published in** | G. G. Jacobson, _Zhuki Rossii i Zapadnoi Evropy_ (Beetles of Russia and Western Europe), St Petersburg: A. F. Devrien, 1905–1916 — Plate 31, figure 15 |
| **Licence**      | **Public domain.** Wikimedia Commons tags the file `{{PD-old-100-expired}}`: Jacobson died in 1926, and the work was published before 1923.            |
| **Downloaded**   | 2026-08-23                                                                                                                                             |
| **Used by**      | `src/data/species/landmarks/cetonia-aurata.json`                                                                                                       |

The only reference here whose caption is printed on the sheet itself rather
than on a facing page, which made the identification checkable without leaving
the image: the numbered list under the figures gives _15. Cetonia aurata_. The
plate holds twenty-five scarabs and chafers, so it is also the one place in
this folder where a reader can see what the drawing was chosen _against_ — the
several other big green beetles a rose chafer is mistaken for are on the same
sheet.
