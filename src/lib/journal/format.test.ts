import { describe, expect, it } from 'vitest';

import { formatEntryDate } from './format';

describe('formatEntryDate', () => {
  it('writes the archive’s date format', () => {
    expect(formatEntryDate('2026-03-07')).toBe('7 March 2026');
  });

  it('drops a leading zero from the day but not from the month name', () => {
    expect(formatEntryDate('2025-09-19')).toBe('19 September 2025');
    expect(formatEntryDate('2025-12-06')).toBe('6 December 2025');
  });

  it('does not go through a Date, so it cannot shift a day', () => {
    // The failure this avoids: `new Date('2026-01-01')` is midnight UTC, and a
    // reader east of Greenwich is shown the 31st of December.
    expect(formatEntryDate('2026-01-01')).toBe('1 January 2026');
  });

  it('hands back anything it cannot read, unchanged', () => {
    // A malformed date is caught at parse time and named as a problem; showing
    // the raw value here beats showing NaN.
    expect(formatEntryDate('March 2026')).toBe('March 2026');
    expect(formatEntryDate('2026-13-01')).toBe('2026-13-01');
  });
});
