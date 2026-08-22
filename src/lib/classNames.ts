/** Anything a conditional class expression can legitimately evaluate to. */
export type ClassValue = string | false | null | undefined;

/**
 * Joins class names, dropping anything falsy.
 *
 * Exists so components can compose their CSS Module class with an optional
 * `className` prop without either pulling in a `clsx`-sized dependency or
 * interpolating a `possibly undefined` value into a template literal.
 *
 * @example
 * cx(styles.root, isOpen && styles.open, className)
 */
export function cx(...values: readonly ClassValue[]): string {
  return values
    .filter((value): value is string => typeof value === 'string' && value !== '')
    .join(' ');
}
