import { useMediaQuery } from './useMediaQuery';

/**
 * Whether the reader has asked the system to reduce motion.
 *
 * Motion in this project is disabled in CSS through the duration tokens, which
 * is the mechanism that matters. This exists for the cases CSS cannot reach:
 * not *scaling back* an animation but not *arranging* one at all — here,
 * skipping the IntersectionObserver that would otherwise be set up on two dozen
 * illustrations to trigger an animation that will never play.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
