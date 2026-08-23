/**
 * Where every traced reference came from, and on what terms.
 *
 * **This module is the single source of truth.** `references/SOURCES.md` is
 * generated from it by `npm run sources:build`, and `npm run sources:verify`
 * fails the check if the committed markdown has drifted — so the provenance the
 * repository shows a reader and the credits the About page shows a visitor
 * cannot disagree. They used to be two hand-written lists: the markdown file
 * and the short `reference` block inside each plate. Two lists of the same
 * sixteen facts is one list that is wrong.
 *
 * The short block inside each plate stays, because a plate has to be able to
 * caption itself without loading this module. `sources.test.ts` asserts the two
 * agree on artist, year, licence and source URL, which is the drift this
 * arrangement can still have and the only kind it can have quietly.
 *
 * No imports, deliberately. A Node script reads this file directly under type
 * stripping (`scripts/sources-builder`), which resolves specifiers as written —
 * so an import of `@/types` here would have to become a relative path with an
 * extension, and a data module that needs no types is simpler than either.
 *
 * Prose belongs here when it is about **one** reference: why this figure was
 * chosen, what its provenance will not support. Prose about the folder as a
 * whole belongs to the document and lives in the emitter. Same split the plate
 * builder makes between a landmark file's `doc` and its banner.
 */

/** One reference image, with everything both consumers need to credit it. */
export interface ReferenceSource {
  /** Slug of the species whose plate was traced from this. Also the file name. */
  readonly species: string;
  /** The heading the entry is given, and the caption in the credits list. */
  readonly heading: string;
  /** The animal the figure shows, in markdown — the binomial is italicised. */
  readonly subject: string;
  /** Which view, and which figure of the sheet where it holds several. */
  readonly view: string;
  /** Pixel dimensions of the committed file, as `w × h`. */
  readonly pixels: string;
  /** File size on disk, in the units a reader thinks in. */
  readonly weight: string;
  /** The Wikimedia Commons (or equivalent) file page. */
  readonly sourcePage: string;
  /** The direct file URL, where the source page gives a stable one. */
  readonly fileUrl?: string;
  /**
   * The artist, plain, exactly as the plate's own `reference.artist` gives it.
   * `sources.test.ts` compares the two.
   */
  readonly artist: string;
  /** The artist with dates and role, for the markdown row. */
  readonly artistLine: string;
  /** The author of the book, where that is somebody other than the artist. */
  readonly bookAuthor?: string;
  /** The publication's title, unitalicised and untranslated. */
  readonly work: string;
  /** An English rendering of a title that is not in English. */
  readonly workTranslation?: string;
  /** Place, publisher and date, as a catalogue would give them. */
  readonly imprint: string;
  /** Which plate and figure of the publication. */
  readonly figure?: string;
  /** Anything the publication line needs said after it, as a sentence. */
  readonly publishedNote?: string;
  /**
   * The year the credit shows, matching the plate's own `reference.year`.
   *
   * Where that year is an inference, or the imprint spans several, `dateNote`
   * says so rather than the number pretending to a precision it has not got.
   */
  readonly year: number;
  /** Why the year is not simply the year, where it is not. */
  readonly dateNote?: string;
  /** The terms in a few words, matching the plate's own `reference.licence`. */
  readonly licence: string;
  /** The terms in full, in markdown, with the tag the source page carries. */
  readonly licenceDetail: string;
  /** ISO date the file was fetched. */
  readonly downloaded: string;
  /** Why this figure, and what its provenance will not support. Paragraphs. */
  readonly notes: readonly string[];
}

/**
 * The publication line, composed rather than stored.
 *
 * Stored whole, it was a sentence repeating the work, the figure and the year
 * that are already fields of their own, and a credits list wanting the title
 * alone had to parse it back out.
 */
export function publicationLine(source: ReferenceSource): string {
  const title =
    source.workTranslation === undefined
      ? `_${source.work}_`
      : `_${source.work}_ (${source.workTranslation})`;

  const credited = source.bookAuthor === undefined ? [title] : [source.bookAuthor, title];
  const line = [...credited, source.imprint].join(', ');

  return (
    line +
    (source.figure === undefined ? '' : ` — ${source.figure}`) +
    (source.publishedNote === undefined ? '' : `. ${source.publishedNote}`)
  );
}

/** The file the plate was traced from, relative to `references/`. */
export function referenceFileName(source: ReferenceSource): string {
  return `${source.species}.jpg`;
}

/**
 * Every reference, in the order the specimens were accessioned.
 *
 * Same order as `SPECIES`, and for the same reason: it is the order the archive
 * did the work in. `sources.test.ts` pins the two together, so a species added
 * without its reference fails a test rather than quietly showing up in the
 * credits list as a gap.
 */
export const REFERENCE_SOURCES: readonly ReferenceSource[] = [
  {
    species: 'lucanus-cervus',
    heading: 'Lucanus cervus (male)',
    subject: '_Lucanus cervus_ (Linnaeus, 1758) — European stag beetle, male',
    view: 'Dorsal, whole animal, legs spread',
    pixels: '792 × 1256',
    weight: '273 KB',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Lucanus.cervus.male.-.calwer.22.20.jpg',
    fileUrl:
      'https://upload.wikimedia.org/wikipedia/commons/c/cd/Lucanus.cervus.male.-.calwer.22.20.jpg',
    artist: 'Emil Hochdanz',
    artistLine: 'Emil Hochdanz (1816–1885), lithographer',
    bookAuthor: 'Carl Gustav Calwer & Gustav Jäger',
    work: 'Käferbuch. Naturgeschichte der Käfer Europas',
    imprint: 'Stuttgart: Julius Hoffmann, 1876',
    figure: 'Table 22, figure 20',
    year: 1876,
    licence: 'Public domain (PD-old-100-1923)',
    licenceDetail:
      '**Public domain.** Wikimedia Commons tags the file `{{PD-old-100-1923}}`: the author died more than 100 years ago and the work was published before 1923, so copyright has expired in both the country of origin and the United States.',
    downloaded: '2026-08-23',
    notes: [
      'A hand-coloured lithograph rather than a photograph, which is why it was chosen: the engraver has already done the abstraction the plate schema wants — a clean silhouette, the antler mandibles read as shape rather than as highlight, and every limb laid out flat and unobscured. A dorsal photograph would have given truer colour and no usable line.',
    ],
  },
  {
    species: 'coccinella-septempunctata',
    heading: 'Coccinella septempunctata',
    subject: '_Coccinella septempunctata_ Linnaeus, 1758 — seven-spot ladybird',
    view: 'Dorsal, whole animal, legs spread',
    pixels: '198 × 202',
    weight: '22 KB',
    sourcePage:
      'https://commons.wikimedia.org/wiki/File:Coccinella.septempunctata.-.calwer.46.17.jpg',
    fileUrl:
      'https://upload.wikimedia.org/wikipedia/commons/e/ee/Coccinella.septempunctata.-.calwer.46.17.jpg',
    artist: 'Emil Hochdanz',
    artistLine: 'Emil Hochdanz (1816–1885), lithographer',
    bookAuthor: 'Carl Gustav Calwer & Gustav Jäger',
    work: 'Käferbuch. Naturgeschichte der Käfer Europas',
    imprint: 'Stuttgart: Julius Hoffmann, 1876',
    figure: 'Table 46, figure 17',
    year: 1876,
    licence: 'Public domain (PD-old-100-1923)',
    licenceDetail: '**Public domain.** Wikimedia Commons tags the file `{{PD-old-100-1923}}`.',
    downloaded: '2026-08-23',
    notes: [
      'The same book and the same hand as the stag beetle, which is the reason it was chosen over the many better photographs: two plates traced from one engraver sit together without looking like two projects. It is a small file — 198 pixels square — and that turned out not to matter, because what a ladybird needs from its reference is the outline, the spot positions and the pale pronotal patches, and all three survive at that size.',
    ],
  },
  {
    species: 'papilio-machaon',
    heading: 'Papilio machaon',
    subject: '_Papilio machaon_ Linnaeus, 1758 — Old World swallowtail',
    view: 'Upperside, wings spread (left figure). The right figure is the underside and is not traced.',
    pixels: '2000 × 751',
    weight: '390 KB',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Papilio_machaon_Schwalbenschwanz.jpg',
    fileUrl:
      'https://upload.wikimedia.org/wikipedia/commons/9/92/Papilio_machaon_Schwalbenschwanz.jpg',
    artist: 'Jacob Hübner',
    artistLine: 'Jacob Hübner (1761–1826)',
    work: 'Das kleine Schmetterlingsbuch: Die Tagfalter',
    imprint: 'Insel-Bücherei Nr. 213',
    publishedNote:
      'Reproduced there; the plate itself is Hübner’s and considerably older than that edition.',
    year: 1826,
    dateNote:
      '**Undated on the source page.** 1826 is recorded in the plate as the year, and it is Hübner’s death year rather than a publication date — the latest the drawing can be, and what the public-domain claim rests on. The Papilionidae plates of his _Sammlung europäischer Schmetterlinge_ were issued a good deal earlier.',
    licence: 'Public domain (PD-Art, PD-old-auto-1923)',
    licenceDetail:
      '**Public domain.** Wikimedia Commons tags the file `{{PD-Art|PD-old-auto-1923|deathyear=1826}}`: a faithful photographic reproduction of a two-dimensional work whose author died in 1826.',
    downloaded: '2026-08-23',
    notes: [
      'Chosen for the pose. A spread-wing upperside with both wings fully open and nothing foreshortened is what a plate needs and what most photographs of a live swallowtail cannot give. The stipple that carries the yellow ground in the lithograph is left behind entirely; what is taken is the wing shape, the tail, the black bands, the row of blue lunules and the orange ocellus.',
    ],
  },
  {
    species: 'aeshna-cyanea',
    heading: 'Aeshna cyanea',
    subject:
      '_Aeshna cyanea_ (O. F. Müller, 1764) — southern hawker. Captioned _Æschna cyanea_ on the plate, which is the older spelling.',
    view: 'Dorsal, natural size, two figures. Only the left figure is traced.',
    pixels: '3330 × 2025',
    weight: '323 KB',
    sourcePage:
      'https://commons.wikimedia.org/wiki/File:British_dragonflies_(Plate_XVII)_(6002339478).jpg',
    fileUrl:
      'https://upload.wikimedia.org/wikipedia/commons/5/5d/British_dragonflies_%28Plate_XVII%29_%286002339478%29.jpg',
    artist: 'William John Lucas',
    artistLine: 'William John Lucas (1858–1932)',
    work: 'British Dragonflies (Odonata)',
    imprint: 'London: L. Upcott Gill, 1900',
    figure: 'Plate XVII',
    year: 1900,
    licence: 'Public domain (PD-old-100-expired)',
    licenceDetail:
      '**Public domain.** Wikimedia Commons tags the file public domain; published 1900, author died 1932. Scanned by the Biodiversity Heritage Library.',
    downloaded: '2026-08-23',
    notes: [
      'Lucas draws each of the two figures with its wings spread to one side and its legs splayed to the other, so that the two do not overlap on the page. The animal has both on both sides, so the plate takes the wings off the left-hand figure’s left and its legs off its right, and folds each across the midline — see the comment at the top of `aeshna-cyanea.plate.ts`. The venation is the part deliberately not reproduced: Lucas draws several hundred cells a wing, and nine strokes are traced.',
    ],
  },
  {
    species: 'palomena-prasina',
    heading: 'Palomena prasina',
    subject: '_Palomena prasina_ (Linnaeus, 1761) — green shield bug',
    view: 'Dorsal, whole animal — figure 1 of the plate',
    pixels: '874 × 1388',
    weight: '89 KB',
    sourcePage:
      'https://commons.wikimedia.org/wiki/File:SaundersHemipteraHeteropteraBritishIslandsPlate3.jpg',
    artist: 'Robert Morgan',
    artistLine:
      'Robert Morgan (_del. et lith._), lithographer; printed by Vincent Brooks, Day & Son',
    bookAuthor: 'Edward Saunders',
    work: 'The Hemiptera Heteroptera of the British Islands',
    imprint: 'London: L. Reeve & Co., 1892',
    figure: 'Plate 3, figure 1',
    year: 1892,
    licence: 'Public domain (PD-old-70-1923)',
    licenceDetail: '**Public domain.** Wikimedia Commons tags the file `{{PD-old-70-1923}}`.',
    downloaded: '2026-08-23',
    notes: [
      'Captioned under the old name _Pentatoma prasina_, which the Commons file page resolves to the current combination. The smallest reference in the collection at 874 pixels wide, and the figure occupies about a seventh of it — enough for the outline, the scutellum and the membrane, which is what the plate needed, and not enough for the punctation, which is drawn as hatching instead.',
    ],
  },
  {
    species: 'bombus-terrestris',
    heading: 'Bombus terrestris (female)',
    subject: '_Bombus terrestris_ (Linnaeus, 1758) — buff-tailed bumblebee, female',
    view: 'Dorsal, wings spread — figure 3 of the plate',
    pixels: '1882 × 2860',
    weight: '201 KB',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:SaundersHymenopteraAculeataPlate52.jpg',
    artist: 'Robert Morgan',
    artistLine:
      'Robert Morgan (_del. et lith._), lithographer; printed by Vincent Brooks, Day & Son',
    bookAuthor: 'Edward Saunders',
    work: 'The Hymenoptera Aculeata of the British Islands',
    imprint: 'London: L. Reeve & Co., 1896',
    figure: 'Plate 52, figure 3',
    year: 1896,
    licence: 'Public domain (PD-US-expired, PD-old-70)',
    licenceDetail:
      '**Public domain.** Wikimedia Commons tags the file `{{PD-US-expired}}` and `{{PD-old-70}}`: published in 1896, and Saunders died in 1910.',
    downloaded: '2026-08-23',
    notes: [
      'The plate’s own text sheet names every figure, which is why this one could be used: figure 3 is captioned _Bombus terrestris, Linn., female_, and the buff tail, the collar and the abdominal band are all legible on it. A specimen photograph would have been sharper and would have given a specimen rather than a species — a dead bumblebee’s fur mats, and matted fur is the one thing that cannot be un-drawn.',
    ],
  },
  {
    species: 'vespa-crabro',
    heading: 'Vespa crabro (male)',
    subject: '_Vespa crabro_ Linnaeus, 1758 — European hornet, male',
    view: 'Dorsal, wings spread — figure 1 of the plate',
    pixels: '1882 × 2860',
    weight: '196 KB',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:SaundersHymenopteraAculeataPlate20.jpg',
    artist: 'Robert Morgan',
    artistLine:
      'Robert Morgan (_del. et lith._), lithographer; printed by Vincent Brooks, Day & Son',
    bookAuthor: 'Edward Saunders',
    work: 'The Hymenoptera Aculeata of the British Islands',
    imprint: 'London: L. Reeve & Co., 1896',
    figure: 'Plate 20, figure 1',
    year: 1896,
    licence: 'Public domain (PD-US-expired, PD-old-70)',
    licenceDetail:
      '**Public domain.** Wikimedia Commons tags the file `{{PD-US-expired}}` and `{{PD-old-70}}`.',
    downloaded: '2026-08-23',
    notes: [
      'The same artist and the same book as the bumblebee, one plate of yellowjackets earlier, which is a small piece of luck: the hornet is drawn beside the five British social wasps it is most often confused with, at the scale bars the plate gives for each. Captioned _Vespa crabro Linn. male_, and that caption is why this drawing commits to a sex — a male’s antennae are longer than a worker’s, and both are in the figure.',
    ],
  },
  {
    species: 'cetonia-aurata',
    heading: 'Cetonia aurata',
    subject: '_Cetonia aurata_ Linnaeus, 1758 — rose chafer',
    view: 'Dorsal, whole animal — figure 15 of the plate',
    pixels: '1920 × 3017',
    weight: '1.3 MB',
    sourcePage:
      'https://commons.wikimedia.org/wiki/File:Georgiy_Jacobson_-_Beetles_Russia_and_Western_Europe_-_plate_31.jpg',
    artist: 'Georgiy Georgiyevich Jacobson',
    artistLine: 'Georgiy Georgiyevich Jacobson (1871–1926)',
    bookAuthor: 'G. G. Jacobson',
    work: 'Zhuki Rossii i Zapadnoi Evropy',
    workTranslation: 'Beetles of Russia and Western Europe',
    imprint: 'St Petersburg: A. F. Devrien, 1905–1916',
    figure: 'Plate 31, figure 15',
    year: 1913,
    dateNote:
      'The book was issued in parts between 1905 and 1916. Plate 31 belongs to the middle of that run, and 1913 is the year credited here and in the plate file — a midpoint, not a colophon.',
    licence: 'Public domain (PD-old-100-expired)',
    licenceDetail:
      '**Public domain.** Wikimedia Commons tags the file `{{PD-old-100-expired}}`: Jacobson died in 1926, and the work was published before 1923.',
    downloaded: '2026-08-23',
    notes: [
      'The only reference here whose caption is printed on the sheet itself rather than on a facing page, which made the identification checkable without leaving the image: the numbered list under the figures gives _15. Cetonia aurata_. The plate holds twenty-five scarabs and chafers, so it is also the one place in this folder where a reader can see what the drawing was chosen _against_ — the several other big green beetles a rose chafer is mistaken for are on the same sheet.',
    ],
  },
  {
    species: 'carabus-violaceus',
    heading: 'Carabus violaceus',
    subject: '_Carabus violaceus_ Linnaeus, 1758 — violet ground beetle',
    view: 'Dorsal, whole animal, legs and antennae spread',
    pixels: '444 × 685',
    weight: '72 KB',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Carabus.violaceus.-.calwer.03.09.jpg',
    fileUrl:
      'https://upload.wikimedia.org/wikipedia/commons/5/52/Carabus.violaceus.-.calwer.03.09.jpg',
    artist: 'Emil Hochdanz',
    artistLine: 'Emil Hochdanz (1816–1885), lithographer',
    bookAuthor: 'Carl Gustav Calwer & Gustav Jäger',
    work: 'Käferbuch. Naturgeschichte der Käfer Europas',
    imprint: 'Stuttgart: Julius Hoffmann, 1876',
    figure: 'Table 3, figure 9',
    year: 1876,
    licence: 'Public domain (PD-old-100-1923)',
    licenceDetail: '**Public domain.** Wikimedia Commons tags the file `{{PD-old-100-1923}}`.',
    downloaded: '2026-08-23',
    notes: [
      'The third plate traced from Calwer’s _Käferbuch_, after the stag beetle and the seven-spot, and chosen for that reason: three beetles from one engraver’s hand sit together on the contact sheet without looking like three projects. The figure gives what a ground beetle needs — a body 405 pixels long and 157 across, all six legs clear of it, the reflexed violet margin readable as a band, and the antennae segment by segment.',
    ],
  },
  {
    species: 'chrysolina-coerulans',
    heading: 'Chrysolina coerulans',
    subject: '_Chrysolina coerulans_ (Scriba, 1791) — blue mint beetle',
    view: 'Dorsal, whole animal, legs tucked close',
    pixels: '229 × 250',
    weight: '31 KB',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Chrysolina.coerulans.-.calwer.44.06.jpg',
    fileUrl:
      'https://upload.wikimedia.org/wikipedia/commons/b/b2/Chrysolina.coerulans.-.calwer.44.06.jpg',
    artist: 'Emil Hochdanz',
    artistLine: 'Emil Hochdanz (1816–1885), lithographer',
    bookAuthor: 'Carl Gustav Calwer & Gustav Jäger',
    work: 'Käferbuch. Naturgeschichte der Käfer Europas',
    imprint: 'Stuttgart: Julius Hoffmann, 1876',
    figure: 'Table 44, figure 6',
    year: 1876,
    licence: 'Public domain (PD-old-100-1923)',
    licenceDetail: '**Public domain.** Wikimedia Commons tags the file `{{PD-old-100-1923}}`.',
    downloaded: '2026-08-23',
    notes: [
      '**A substitution, and worth recording as one.** This slot was meant for an Australian Christmas beetle — an _Anoplognathus_, for the local relevance an archive that calls itself southern ought to have. There is no public-domain figure of one. Everything on Wikimedia Commons under that genus is either a modern photograph under a Creative Commons licence or a museum type-specimen photograph taken well after 1923, and the plate contract requires a reference whose copyright has expired. Rather than trace an animal from a photograph nobody may redistribute, the slot went to a documented European species with a usable lithograph.',
      'The smallest reference in the folder at 229 pixels square — smaller even than the seven-spot’s — and it did not matter, for the same reason it did not matter there: what a leaf beetle needs from a reference is the outline, the puncture rows and where the short legs sit, and all three survive at that size. It is also the broadest animal in the collection, which is the character the plate is drawn to carry.',
    ],
  },
  {
    species: 'aglais-io',
    heading: 'Aglais io',
    subject:
      '_Aglais io_ (Linnaeus, 1758) — peacock butterfly. Captioned _Vanessa io_ on the plate.',
    view: 'Upperside, wings spread — figure 3. The sheet holds six butterflies and four larvae; only figure 3 is traced.',
    pixels: '2160 × 3228',
    weight: '737 KB',
    sourcePage:
      'https://commons.wikimedia.org/wiki/File:British_and_European_butterflies_and_moths_(Macrolepidoptera)_(Plate_VIII)_(6466291101).jpg',
    artist: 'H. Deuchert and Shirley Slocombe',
    artistLine: 'H. Deuchert and Shirley Slocombe, illustrators; W. E. Kirby, author',
    bookAuthor: 'W. E. Kirby',
    work: 'British and European Butterflies and Moths (Macrolepidoptera)',
    imprint: 'London: Cassell, 1895',
    figure: 'Plate VIII, figure 3',
    year: 1895,
    licence: 'Public domain (PD-old-70-expired)',
    licenceDetail:
      '**Public domain.** Wikimedia Commons tags the file `{{PD-old-70-expired}}`; scanned by the Biodiversity Heritage Library.',
    downloaded: '2026-08-23',
    notes: [
      'Kirby’s plates fit six butterflies to a page, so the figures are laid at angles across the sheet rather than square to it. Nothing in the landmark file is a coordinate lifted off the scan: what was taken is the wing shape, the eyespot positions and the proportions, and the plate is drawn square. A plate that inherited the page’s layout would be a drawing of a book.',
      'Figure 2 on the same sheet is _Vanessa xanthomelas_ and figure 1 _V. polychloros_, which is the small mercy of a crowded plate — the animals a peacock is confused with are on it, so the apex shape that separates them could be checked without leaving the image.',
    ],
  },
  {
    species: 'acherontia-atropos',
    heading: 'Acherontia atropos',
    subject: '_Acherontia atropos_ (Linnaeus, 1758) — death’s-head hawkmoth',
    view: 'Upperside, wings spread, square to the page — figure 1, with its larva as 1a',
    pixels: '2200 × 3259',
    weight: '824 KB',
    sourcePage:
      'https://commons.wikimedia.org/wiki/File:British_and_European_butterflies_and_moths_(Macrolepidoptera)_(Plate_XIII)_(6466294171).jpg',
    artist: 'H. Deuchert and Shirley Slocombe',
    artistLine: 'H. Deuchert and Shirley Slocombe, illustrators; W. E. Kirby, author',
    bookAuthor: 'W. E. Kirby',
    work: 'British and European Butterflies and Moths (Macrolepidoptera)',
    imprint: 'London: Cassell, 1895',
    figure: 'Plate XIII, figure 1',
    year: 1895,
    licence: 'Public domain (PD-old-70-expired)',
    licenceDetail: '**Public domain.** Wikimedia Commons tags the file `{{PD-old-70-expired}}`.',
    downloaded: '2026-08-23',
    notes: [
      'The same book and the same hands as the peacock, and the better figure of the two: this one is drawn square to the page and symmetric, so the proportions came off it directly — 425 pixels from the front of the head to the tip of the abdomen, 122 units across the thorax, a half-span of 1.15 body lengths. The skull on the thorax is drawn clearly enough to trace as three shapes, which is the whole reason this animal is in the collection.',
    ],
  },
  {
    species: 'ischnura-elegans',
    heading: 'Ischnura elegans',
    subject: '_Ischnura elegans_ (Vander Linden, 1820) — blue-tailed damselfly, male',
    view: 'Dorsal, × 2, two figures — the lower pair on the plate. The right-hand figure is traced.',
    pixels: '2025 × 3330',
    weight: '297 KB',
    sourcePage:
      'https://commons.wikimedia.org/wiki/File:British_dragonflies_(Plate_XXIV)_(6001792845).jpg',
    artist: 'William John Lucas',
    artistLine: 'William John Lucas (1858–1932)',
    work: 'British Dragonflies (Odonata)',
    imprint: 'London: L. Upcott Gill, 1900',
    figure: 'Plate XXIV',
    year: 1900,
    licence: 'Public domain (published 1900; author died 1932)',
    licenceDetail:
      '**Public domain.** Published 1900, author died 1932; scanned by the Biodiversity Heritage Library.',
    downloaded: '2026-08-23',
    notes: [
      'The second plate from Lucas, after the southern hawker, and chosen for the contrast: the two animals are the same order and nothing else. Lucas has the same habit here as on plate XVII — each figure’s wings spread to one side and its legs to the other, so the two do not overlap on the page — so the wings were measured off one side, the legs off the other, and each authored on the right half for the renderer to reflect.',
      'The upper pair on the sheet is _Ischnura pumilio_, the species this one is most often mistaken for. Having both on one plate is what let the blue eighth abdominal segment be checked as the character rather than assumed.',
    ],
  },
  {
    species: 'formica-rufa',
    heading: 'Formica rufa',
    subject: '_Formica rufa_ Linnaeus, 1761 — red wood ant, worker',
    view: 'Dorsal, whole animal, all six legs and both antennae clear of the body — figure 5',
    pixels: '1711 × 2651',
    weight: '336 KB',
    sourcePage:
      'https://commons.wikimedia.org/wiki/File:Ants,_bees,_and_wasps_(Plate_2)_(8476376962).jpg',
    artist: 'John Lubbock',
    artistLine: 'John Lubbock (1834–1913)',
    bookAuthor: 'John Lubbock',
    work: 'Ants, Bees, and Wasps: a record of observations on the habits of the social Hymenoptera',
    imprint: 'London: Kegan Paul, 1897 printing',
    figure: 'Plate 2, figure 5',
    year: 1897,
    licence: 'Public domain (PD-old-70-expired)',
    licenceDetail: '**Public domain.** Wikimedia Commons tags the file `{{PD-old-70-expired}}`.',
    downloaded: '2026-08-23',
    notes: [
      'Chosen because the plate’s own caption names the figure — _5. Formica rufa._ — and because it is the one figure on the sheet drawn square and unobstructed; the other four are _Atta_ and _Pheidole_ majors and minors at various angles. It is the first reference in this folder for an animal with no wings, and the reason `REQUIRED_PARTS.hymenoptera` stopped asking for any.',
      'Saunders’s _Hymenoptera Aculeata of the British Islands_ — already the source for the bumblebee and the hornet — gives its first five plates to the Formicidae, and plate 1 is very likely the better figure. It is not on Commons. This one is.',
    ],
  },
  {
    species: 'graphosoma-italicum',
    heading: 'Graphosoma italicum',
    subject:
      '_Graphosoma italicum_ (O. F. Müller, 1766) — Italian striped shield bug. Captioned _Graphosoma lineatum_ on the plate.',
    view: 'Dorsal, whole animal — figure 3',
    pixels: '1879 × 2536',
    weight: '461 KB',
    sourcePage:
      'https://commons.wikimedia.org/wiki/File:Betrachtungen_uber_die_Farbenpracht_der_Insekten_(Plate_I)_(9237127969).jpg',
    artist: 'Karl Brunner von Wattenwyl',
    artistLine: 'Karl Brunner von Wattenwyl (1823–1914)',
    bookAuthor: 'Karl Brunner von Wattenwyl',
    work: 'Betrachtungen über die Farbenpracht der Insekten',
    imprint: 'Leipzig: Wilhelm Engelmann, 1897',
    figure: 'Plate I, figure 3',
    year: 1897,
    licence: 'Public domain (PD-old-70-expired)',
    licenceDetail: '**Public domain.** Wikimedia Commons tags the file `{{PD-old-70-expired}}`.',
    downloaded: '2026-08-23',
    notes: [
      'Captioned under the older name _Graphosoma lineatum_. The two have since been separated, and the animal figured — the whole pronotum striped rather than spotted at the front — is _italicum_.',
      'Brunner’s sheet is about colour in insects generally, so it carries a locust, four scarabs, three butterflies and a swallowtail as well, and this bug gets about fifty pixels of it. That is not enough for proportions, so the outline was drawn to the published measurements — 8 to 12 mm long and 7 to 9 across — and the reference supplied the arrangement: where the scutellum ends, how the stripes run, that they carry on across the head.',
    ],
  },
  {
    species: 'gryllus-campestris',
    heading: 'Gryllus campestris',
    subject: '_Gryllus campestris_ Linnaeus, 1758 — field cricket, male',
    view: '**Dorsal-oblique, in a habitat scene.** Named in the plate’s left margin.',
    pixels: '2163 × 2923',
    weight: '982 KB',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Les_insectes_(Pl._I)_(6008126611).jpg',
    artist: 'Jules Rothschild',
    artistLine: 'Published by Jules Rothschild; the engraver is uncredited on the sheet',
    work: 'Musée entomologique illustré: Les insectes',
    imprint: 'Paris: J. Rothschild, 1878',
    figure: 'Orthoptères, plate I',
    year: 1878,
    licence: 'Public domain (PD-old-70-expired)',
    licenceDetail: '**Public domain.** Wikimedia Commons tags the file `{{PD-old-70-expired}}`.',
    downloaded: '2026-08-23',
    notes: [
      '**The weakest provenance in the folder, and it is recorded rather than smoothed over.** This is the only reference here that is a habitat scene rather than a specimen figure: the animals are drawn among bindweed and grass, lit and posed, and the cricket is seen from above and a little behind. Close to dorsal, and not square to it.',
      'So the reference supplied the arrangement — where the pronotum ends and the tegmina begin, how far the hind femur reaches, that the tegminal venation is coarse enough to count — and the proportions came from the published measurements instead: 19 to 27 mm long, about a third as wide as long. A foreshortened figure cannot give proportions, and guessing from one would have made the animal too short.',
      'It was chosen anyway, because the alternatives were worse. The Orthoptera are badly served by public-domain specimen plates, and this was the only figure of the species with a usable licence and a legible outline; the several sharper images on Commons are modern photographs under Creative Commons terms, which the plate contract does not accept.',
    ],
  },
];

/**
 * The reference a species' plate was traced from, or `undefined`.
 *
 * Declared after the array rather than beside the other helpers, because it
 * closes over it: a lookup written above its own data reads as though the order
 * were arbitrary, and it is not.
 */
export function findReferenceSource(species: string): ReferenceSource | undefined {
  return REFERENCE_SOURCES.find((source) => source.species === species);
}
