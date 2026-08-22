import { describe, expect, it } from 'vitest';

import { cx } from '@/lib/classNames';

describe('cx', () => {
  it('joins the class names it is given', () => {
    expect(cx('card', 'card--wide')).toBe('card card--wide');
  });

  it('drops undefined, null, false and empty strings', () => {
    expect(cx('card', undefined, null, false, '', 'is-open')).toBe('card is-open');
  });

  it('returns an empty string when nothing survives', () => {
    expect(cx(undefined, false)).toBe('');
  });

  // The flag arrives as a parameter rather than a local const so the compiler
  // cannot narrow it to a literal and rule the `&&` branch unreachable.
  it.each<[boolean, string]>([
    [true, 'panel panel--open'],
    [false, 'panel'],
  ])('applies a conditional class only when the condition holds (open: %s)', (isOpen, expected) => {
    expect(cx('panel', isOpen && 'panel--open')).toBe(expected);
  });
});
