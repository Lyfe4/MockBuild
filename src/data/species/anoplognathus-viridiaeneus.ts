import type { Species } from '@/types';

/**
 * *Anoplognathus viridiaeneus* — the king Christmas beetle.
 *
 * The first record in the collection whose months belong to the hemisphere
 * Thornfield keeps its calendar in, and the reason `monthsHemisphere` exists.
 * Sixteen European animals had made "the months are northern and the seasons
 * are southern" a true statement about the whole archive, said out loud on the
 * calendar, in the filter panel and on every specimen sheet. This beetle flies
 * in November and December, which in Thornfield is spring and summer, and there
 * is nothing to warn a reader about — so the caveat had to become a property of
 * the record rather than of the site.
 *
 * It is also the second of the two specimens traced from Edward Donovan's plate
 * of 1805, alongside [[eupoecila-australasiae]]. Donovan described both, and
 * the parenthesised authority is why: he put this one in *Melolontha*.
 */
export const ANOPLOGNATHUS_VIRIDIAENEUS: Species = {
  id: 'anoplognathus-viridiaeneus',
  taxonomy: {
    order: 'Coleoptera',
    family: 'Scarabaeidae',
    genus: 'Anoplognathus',
    species: 'viridiaeneus',
    // Parenthesised: Donovan described it as `Melolontha viridi-aenea`, and the
    // genus it sits in now was not erected until 1817.
    authority: '(Donovan, 1805)',
  },
  commonName: 'king Christmas beetle',
  sizeMm: { min: 28, max: 34 },
  sizeBasis: 'body length',
  distribution:
    'Eastern Australia, in New South Wales and southern Queensland, in open eucalypt woodland and pasture with scattered trees; once abundant around Sydney and much scarcer there now.',
  // Adults emerge from the soil with the first warm rain of late spring and are
  // gone within a few weeks, which is the whole reason for the name. November
  // to January is the reliable window and a warm February can extend it.
  //
  // Stored ascending, like every other record — the array is a normalised set
  // of months and not a sequence. `activeRuns` walks the year as a ring and
  // reports this as the one period it is, November to February.
  activeMonths: [1, 2, 11, 12],
  // Southern, and observed in the hemisphere Thornfield keeps its own calendar
  // in — so this row of the phenology chart needs no caveat at all.
  monthsHemisphere: 'southern',
  morphology: {
    wingCover: 'elytra',
    antennae: 'lamellate',
    // Unmarked, and the plate had to be corrected twice to keep it that way: a
    // panel of bare paper drawn as the gloss on each wing case read as the rose
    // chafer's flecks.
    markings: 'none',
    bodyShape: 'oval',
    sizeClass: 'large',
    // Red-brown under a gold-green sheen that shifts with the angle. Naming a
    // hue would be naming one angle of view, which is the call the rose chafer
    // made for the same reason.
    colourFamily: 'metallic',
  },
  notes:
    'One of the largest of the thirty-odd Anoplognathus species, and among the most strongly built: broad, heavily convex, and with the pronotum at its widest exactly where the wing cases begin, so the whole animal reads as a single unbroken oval. Red-brown beneath a gold and green lustre, with the pygidium and the underside a clear bright green and the tarsi black. Adults emerge from the soil in late spring, feed on eucalypt foliage — the turpentine Syncarpia glomulifera among the trees it has been recorded on — and live a few weeks; the larvae spend the year underground on grass roots and rotting matter. Christmas beetles were once so numerous around Sydney that branches bent under them, and the genus has declined sharply enough across eastern Australia for its abundance to be a subject of public monitoring.',
  sources: [
    {
      title: 'Anoplognathus viridiaeneus — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Anoplognathus_viridiaeneus',
    },
    {
      title: 'Anoplognathus viridiaeneus (Donovan, 1805) — GBIF Backbone Taxonomy',
      url: 'https://www.gbif.org/species/4759135',
    },
    {
      title: 'Christmas Beetles — Australian Museum',
      url: 'https://australian.museum/learn/animals/insects/christmas-beetles/',
    },
    {
      title:
        'Melolontha viridi-aenea, in An epitome of the natural history of the insects of New Holland (Donovan, 1805)',
      url: 'https://archive.org/details/epitomeofnatura00dono',
    },
  ],
  // Olive: the nearest earth the palette has to a green beetle, and the same
  // choice the rose chafer made. The metallic part is in the record, not the ink.
  pigment: 3,
  // sqrt(34 / 75) against the stag beetle.
  scale: 0.67,
};
