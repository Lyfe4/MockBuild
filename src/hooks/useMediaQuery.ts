import { useCallback, useSyncExternalStore } from 'react';

/**
 * Tracks a media query from JavaScript.
 *
 * Layout belongs in CSS, and almost everything responsive here is done there.
 * This is for the cases where the *markup* has to differ, not just its
 * presentation — a disclosure panel that must be genuinely open above the
 * breakpoint rather than hidden and overridden, because `hidden` governs the
 * accessibility tree and CSS cannot honestly undo it.
 *
 * Built on `useSyncExternalStore` rather than `useState` plus an effect. A
 * media query list is exactly the external store that API exists for, and it
 * gets two things right that the effect version does not: the first render
 * already has the correct value, so there is no flash of the wrong markup, and
 * a changed `query` re-subscribes without an intermediate render holding the
 * previous query's answer.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof matchMedia !== 'function') return () => undefined;

      const media = matchMedia(query);

      media.addEventListener('change', onStoreChange);

      return () => {
        media.removeEventListener('change', onStoreChange);
      };
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => (typeof matchMedia === 'function' ? matchMedia(query).matches : false),
    [query],
  );

  // The third argument is the server snapshot. This app is client-only, but
  // supplying it keeps the hook safe if that ever changes.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
