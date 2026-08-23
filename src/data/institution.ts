/**
 * The invented institution, in one place.
 *
 * Small, and worth having: the masthead says when the archive was founded, the
 * colophon says when its reading room is open, and the About page says both
 * again beside a count of what is in the cabinets. Three copies of a fictional
 * year is how a fictional institution ends up founded twice.
 *
 * Nothing derived from the collection belongs here — the About page counts the
 * specimens and the orders out of `SPECIES`, because those are facts about the
 * data and this file would only be a second opinion about them.
 */
export const INSTITUTION = {
  founded: 1887,
  town: 'Armidale',
  readingRoom: {
    days: 'Tuesday to Friday',
    hours: '10.00 – 16.00',
    note: 'Closed on public holidays.',
  },
} as const;
