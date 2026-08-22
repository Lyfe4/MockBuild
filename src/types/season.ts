/**
 * The four seasons the archive themes itself by.
 *
 * Declared as a `const` tuple so the union type is derived from the runtime
 * value rather than duplicated alongside it — the list and the type cannot
 * drift apart. The order is the Southern Hemisphere calendar order, starting
 * at the September equinox.
 */
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;

export type Season = (typeof SEASONS)[number];
