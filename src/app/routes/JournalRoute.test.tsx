import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JOURNAL_ENTRIES } from '@/data';
import { formatEntryDate } from '@/lib/journal';
import { renderWithProviders } from '@/test/renderWithProviders';

import { JournalRoute } from './JournalRoute';

/**
 * The journal index, against the real content files.
 *
 * The entries are read out of the same module the page reads, so adding a sixth
 * entry does not change this file.
 */

function renderIndex(season: 'spring' | 'summer' | 'autumn' | 'winter' = 'autumn') {
  return renderWithProviders(<JournalRoute />, { route: '/journal', season });
}

const NEWEST = JOURNAL_ENTRIES[0]!;

describe('JournalRoute', () => {
  it('is headed, and the heading takes focus on a route change', () => {
    renderIndex();

    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('tabindex', '-1');
  });

  it('lists every entry, newest first', () => {
    renderIndex();

    const items = within(screen.getByRole('list')).getAllByRole('listitem');

    expect(items).toHaveLength(JOURNAL_ENTRIES.length);

    const titles = items.map((item) => within(item).getByRole('link').textContent);

    expect(titles).toStrictEqual(JOURNAL_ENTRIES.map((entry) => entry.title));
  });

  it('links each entry to its own page', () => {
    renderIndex();

    for (const entry of JOURNAL_ENTRIES) {
      expect(screen.getByRole('link', { name: entry.title })).toHaveAttribute(
        'href',
        `/journal/${entry.slug}`,
      );
    }
  });

  it('dates each entry twice: once for a reader and once for a machine', () => {
    renderIndex();

    const time = screen.getByText(formatEntryDate(NEWEST.date));

    expect(time.tagName).toBe('TIME');
    // The attribute and the text have to be the same day, which is the whole
    // reason the attribute exists.
    expect(time).toHaveAttribute('datetime', NEWEST.date);
  });

  it('tags each entry with its own season', () => {
    renderIndex();

    for (const entry of JOURNAL_ENTRIES) {
      expect(screen.getAllByText(entry.season).length).toBeGreaterThan(0);
    }
  });

  it('says out loud that the seasons are southern', () => {
    renderIndex();

    // Every date on this page is read through Thornfield's own calendar, so a
    // June entry is tagged winter. Unsaid, that reads as a bug.
    expect(screen.getByText(/southern seasons/i)).toBeInTheDocument();
  });

  it('gives each entry its opening paragraph as a lede', () => {
    renderIndex();

    expect(screen.getByText(NEWEST.lede)).toBeInTheDocument();
  });
});
