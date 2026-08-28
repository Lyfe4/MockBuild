import { useSyncExternalStore } from 'react';

/** See `useHydrated`: the subscription is a formality, the snapshots are the point. */
const neverChanges = () => () => undefined;

/**
 * The clock, to the **day**, and the same object all day.
 *
 * A `useSyncExternalStore` snapshot has to be referentially stable, and a fresh
 * `Date` on every read is a new object — which is an infinite re-render. So the
 * date is held, and replaced only when the day it names is no longer today.
 *
 * Held rather than read once at module load, because a module-level constant
 * would freeze at whatever the first import saw and answer every test in a file
 * with it. Replaced at a day boundary rather than never, because the two things
 * that read this are a calendar ruling the current month and a date input
 * refusing yesterday, and both of those are about the day: what they must not
 * do is change on *every render*, not that they must never change.
 */
let today: Date | null = null;

function readClock(): Date {
  const now = new Date();

  if (today?.toDateString() !== now.toDateString()) today = now;

  return today;
}

const noDate = () => null;

/**
 * Today's date, once the document is being **read** rather than built.
 *
 * `null` on the first render and a `Date` on every render after it. That is not
 * a convenience — it is the only honest answer a prerendered page can give.
 * Every route is rendered to static HTML at build time, so a component that
 * called `new Date()` during render would bake the *build machine's* clock into
 * the file: the calendar would rule the month the site was deployed in, and the
 * request form's date input would floor at the day it was compiled. Both would
 * also be hydration mismatches, since the browser's answer to the same call is
 * a different one.
 *
 * The season is the same problem with a different answer — see `ThemeProvider`,
 * which resolves before the first paint because a palette that arrives late is
 * visible, where a ruled column is not.
 */
export function useToday(): Date | null {
  return useSyncExternalStore(neverChanges, readClock, noDate);
}
