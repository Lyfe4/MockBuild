import { useEffect, useRef, useState } from 'react';

export interface InViewOnce<T extends Element> {
  /** Attach to the element being watched. */
  readonly ref: React.RefObject<T | null>;
  /** True once the element has been seen. Never returns to false. */
  readonly seen: boolean;
}

/**
 * Reports when an element first enters the viewport, and then stops watching.
 *
 * Used to start the illustrations' grow-in as they are scrolled to, rather than
 * animating two dozen plates at once on load where all but the first are
 * invisible.
 *
 * Once, deliberately: an animation that re-runs every time a row scrolls back
 * into view turns a catalogue into a flicker-book.
 *
 * @param disabled Skip observing entirely and report `seen` immediately. Pass
 *   the reader's reduced-motion preference here: with no animation to trigger,
 *   there is nothing to wait for and the content should simply be present.
 */
export function useInViewOnce<T extends Element>(disabled = false): InViewOnce<T> {
  const ref = useRef<T | null>(null);

  /**
   * Starts true where there is no IntersectionObserver — jsdom, and a few older
   * browsers. Rather than shipping a polyfill for a progressive enhancement,
   * its absence means "everything is visible": the content renders, it just
   * does not animate in.
   *
   * Decided in the initialiser rather than in an effect, so the very first
   * render is already correct and no cascading update is needed to fix it up.
   */
  const [intersected, setIntersected] = useState(() => typeof IntersectionObserver === 'undefined');

  /**
   * Derived rather than pushed into state. Writing `true` from an effect when
   * `disabled` flips would mean an extra render, and a frame in which the hook
   * still claimed the element was unseen.
   */
  const seen = disabled || intersected;

  useEffect(() => {
    if (disabled || typeof IntersectionObserver === 'undefined') return;

    const element = ref.current;

    if (element === null) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIntersected(true);
          observer.disconnect();
        }
      },
      // A little early, so the drawing has begun by the time it is looked at.
      { rootMargin: '80px' },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [disabled]);

  return { ref, seen };
}
