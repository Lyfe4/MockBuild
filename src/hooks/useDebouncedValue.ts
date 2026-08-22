import { useEffect, useState } from 'react';

/**
 * Follows `value`, but only after it has stopped changing for `delay` ms.
 *
 * The search box writes to the URL, and writing on every keystroke would push a
 * history entry per character — the back button would then walk letter by
 * letter out of a search term. The input itself stays fully controlled and
 * responsive; only the committed value waits.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSettled(value);
    }, delay);

    // Each new value cancels the pending commit, which is what makes this a
    // debounce rather than a throttle.
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return settled;
}
