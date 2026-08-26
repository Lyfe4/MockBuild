import type { Species } from '@/types';

/**
 * *Eupoecila australasiae* — the fiddler beetle.
 *
 * The record that makes `markings: 'stripes'` mean something on a beetle. Every
 * other marked wing case in the collection carries spots or a transverse band;
 * this one carries a dark figure running the length of both cases at once,
 * waisted in the middle, which read across the midline is the outline of a
 * violin. It is the identification, it is the name, and it is the one thing the
 * plate had to get the right way round — the ground is the pale colour here and
 * the pattern is dark on top of it, which is the opposite of every other beetle
 * the archive holds.
 *
 * Traced from the same sheet as [[anoplognathus-viridiaeneus]] — Donovan's
 * plate 1 of 1805, three figures away — so the two Australian specimens in the
 * collection were drawn by one hand in one year, in the way the three from
 * Calwer's *Käferbuch* were.
 */
export const EUPOECILA_AUSTRALASIAE: Species = {
  id: 'eupoecila-australasiae',
  taxonomy: {
    order: 'Coleoptera',
    family: 'Scarabaeidae',
    genus: 'Eupoecila',
    species: 'australasiae',
    // Parenthesised: Donovan described it as `Cetonia australasiae`, and
    // Burmeister moved it to a genus of its own in 1842.
    authority: '(Donovan, 1805)',
  },
  commonName: 'fiddler beetle',
  sizeMm: { min: 15, max: 20 },
  sizeBasis: 'body length',
  distribution:
    'Eastern Australia, from Queensland through New South Wales and Victoria into south-eastern South Australia, in heathland, eucalypt woodland and suburban gardens wherever there is flowering scrub and rotting timber.',
  // Adults come out of the soil in early summer and are found on flowers for a
  // few weeks. Narrower than the Christmas beetle's window by a month, which is
  // what puts the two rows a column apart on the phenology chart. Ascending, for
  // the reason given on that record.
  activeMonths: [1, 11, 12],
  monthsHemisphere: 'southern',
  morphology: {
    wingCover: 'elytra',
    antennae: 'lamellate',
    // The fiddle runs lengthwise, so `stripes` rather than `bands` — the two
    // answers a key offers next to each other, and the wrong one would put this
    // animal in with the hornet.
    markings: 'stripes',
    bodyShape: 'oval',
    sizeClass: 'medium',
    colourFamily: 'yellow',
  },
  notes:
    'A flower chafer, and the one insect in eastern Australia most people can name from its pattern: a black pronotum edged with yellow down each side, and wing cases whose dark central figure is waisted in the middle so that the pale ground around it reads as a violin. Adults emerge from the soil in early summer and feed on nectar, on paperbarks, lemon-scented myrtle and the flowering gums; the larvae spend the year in rotting logs or the damp soil beneath them and pupate there in a cocoon of chewed debris. The living animal is usually lime-green to yellow where Donovan hand-coloured his figure a deep ferruginous rust, which his own Latin — elytris ferrugineis — says he meant; both are within the range the species shows, and the plate takes no position on it.',
  sources: [
    {
      title: 'Eupoecila australasiae — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Eupoecila_australasiae',
    },
    {
      title: 'Eupoecila australasiae (Donovan, 1805) — GBIF Backbone Taxonomy',
      url: 'https://www.gbif.org/species/1084940',
    },
    {
      title: 'Fiddler Beetle — Australian Museum',
      url: 'https://australian.museum/learn/animals/insects/fiddler-beetle/',
    },
    {
      title:
        'Cetonia australasiae, in An epitome of the natural history of the insects of New Holland (Donovan, 1805)',
      url: 'https://archive.org/details/epitomeofnatura00dono',
    },
  ],
  // Ochre, for a yellow beetle — and the pigment the collection uses least.
  pigment: 6,
  // sqrt(20 / 75) against the stag beetle.
  scale: 0.52,
};
