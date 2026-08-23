import { describe, expect, it } from 'vitest';

import { SPECIES } from '@/data';
import { seasonOfMonth } from '@/lib/season';
import { MONTHS, SEASONS, type Month, type Species } from '@/types';

import {
  activeRuns,
  CALENDAR_MONTHS,
  describeActiveMonths,
  firstActiveIndex,
  isActiveIn,
  monthAbbreviation,
  monthName,
  monthOfDate,
  monthsOfSeason,
} from './months';

/**
 * The month arithmetic, checked where it is easy to get wrong.
 *
 * Which is almost entirely at the seam: the calendar's year starts in July, and
 * every function that says "first" or "run" or "next" has to mean it in that
 * order rather than in ascending month number. A summer-flying animal is the
 * case that catches the difference, so it turns up in most of these.
 */

function species(overrides: Partial<Species> & Pick<Species, 'id'>): Species {
  return {
    taxonomy: {
      order: 'Coleoptera',
      family: 'Lucanidae',
      genus: 'Made',
      species: 'up',
      authority: '(Author, 1900)',
    },
    commonName: 'test beetle',
    sizeMm: { min: 25, max: 75 },
    sizeBasis: 'body length',
    distribution: 'Nowhere',
    activeMonths: [5, 6],
    morphology: {
      wingCover: 'elytra',
      antennae: 'lamellate',
      markings: 'none',
      bodyShape: 'elongate',
      sizeClass: 'large',
      colourFamily: 'dark brown',
    },
    notes: '',
    sources: [],
    pigment: 2,
    scale: 1,
    ...overrides,
  };
}

describe('CALENDAR_MONTHS', () => {
  it('holds every month once, July first', () => {
    expect(CALENDAR_MONTHS).toHaveLength(12);
    expect(new Set(CALENDAR_MONTHS).size).toBe(12);
    expect([...CALENDAR_MONTHS].sort((a, b) => a - b)).toStrictEqual([...MONTHS]);
    expect(CALENDAR_MONTHS[0]).toBe(7);
    expect(CALENDAR_MONTHS.at(-1)).toBe(6);
  });

  it('keeps spring, summer and autumn as unbroken runs of three', () => {
    // The whole reason for cutting the year in July. Only winter is split, and
    // winter is the run nobody is reading — a January-first calendar would
    // split summer instead, and an animal out from December to February would
    // read as two flight periods at opposite ends of its row.
    for (const season of ['spring', 'summer', 'autumn'] as const) {
      const positions = monthsOfSeason(season).map((month) => CALENDAR_MONTHS.indexOf(month));

      expect(positions, season).toHaveLength(3);
      expect(positions[2]! - positions[0]!, season).toBe(2);
    }

    // And winter is the one that pays for it: two columns at the start, one at
    // the end.
    const winter = monthsOfSeason('winter').map((month) => CALENDAR_MONTHS.indexOf(month));

    expect(winter).toStrictEqual([0, 1, 11]);
  });
});

describe('monthsOfSeason', () => {
  it('gives every season three months and every month one season', () => {
    const all = SEASONS.flatMap((season) => monthsOfSeason(season));

    expect(all).toHaveLength(12);
    expect(new Set(all).size).toBe(12);

    for (const season of SEASONS) {
      expect(monthsOfSeason(season), season).toHaveLength(3);

      for (const month of monthsOfSeason(season)) {
        expect(seasonOfMonth(month), `${season} ${String(month)}`).toBe(season);
      }
    }
  });

  it('returns them in calendar order rather than in month order', () => {
    // Summer is December, January, February — which ascending month number
    // would give as January, February, December.
    expect(monthsOfSeason('summer')).toStrictEqual([12, 1, 2]);
  });
});

describe('monthName and monthAbbreviation', () => {
  it('names every month and abbreviates each to three letters', () => {
    for (const month of MONTHS) {
      expect(monthName(month).length).toBeGreaterThan(2);
      expect(monthAbbreviation(month)).toHaveLength(3);
      expect(monthName(month).startsWith(monthAbbreviation(month))).toBe(true);
    }

    // Distinct, because two columns headed `Ju` would be a table nobody can
    // read. June and July are the pair that forces three characters.
    expect(new Set(MONTHS.map(monthAbbreviation)).size).toBe(12);
  });
});

describe('monthOfDate', () => {
  it('reads a month one-based, matching the Month type', () => {
    expect(monthOfDate(new Date(2026, 0, 15))).toBe(1);
    expect(monthOfDate(new Date(2026, 11, 31))).toBe(12);
  });

  it('throws on an invalid date rather than guessing', () => {
    expect(() => monthOfDate(new Date('nonsense'))).toThrow(RangeError);
  });
});

describe('isActiveIn', () => {
  it('reads the record and nothing else', () => {
    const one = species({ id: 'a', activeMonths: [3, 4] });

    expect(isActiveIn(one, 3)).toBe(true);
    expect(isActiveIn(one, 5)).toBe(false);
  });
});

describe('firstActiveIndex', () => {
  it('measures from July, not from January', () => {
    // A summer flier and an autumn flier. By month number the autumn one comes
    // first; in a July-first calendar it does not, and a sort that used the
    // number would put rows out of step with their own bars.
    const summer = species({ id: 'summer', activeMonths: [12, 1, 2] });
    const autumn = species({ id: 'autumn', activeMonths: [3, 4] });

    expect(firstActiveIndex(summer)).toBeLessThan(firstActiveIndex(autumn));
    expect(firstActiveIndex(summer)).toBe(CALENDAR_MONTHS.indexOf(12));
  });

  it('reports where a run starts, not where its left-hand fragment does', () => {
    // May to August. The first active *column* is July, at position zero,
    // because the animal was already flying when the year was cut; the run
    // starts in May, at position ten. Taking the column was the first version
    // and it scored thirteen of the sixteen records zero.
    const stagBeetle = SPECIES.find((one) => one.id === 'lucanus-cervus')!;

    expect(firstActiveIndex(stagBeetle)).toBe(CALENDAR_MONTHS.indexOf(5));
  });

  it('spreads the collection out rather than piling it at zero', () => {
    // The reason the ring matters at all. Thirteen of the sixteen records are on
    // the wing in July; if that decided the order, thirteen rows would tie and
    // the sort would fall through to the name — which is what the chart looked
    // like before this was fixed.
    const inJuly = SPECIES.filter((one) => isActiveIn(one, 7));
    const starts = new Set(SPECIES.map(firstActiveIndex));

    expect(inJuly.length).toBeGreaterThan(SPECIES.length / 2);
    expect(starts.size).toBeGreaterThanOrEqual(4);
  });

  it('sorts a record with no months last rather than first', () => {
    expect(firstActiveIndex(species({ id: 'never', activeMonths: [] }))).toBe(
      CALENDAR_MONTHS.length,
    );
  });
});

describe('activeRuns', () => {
  it('joins a run that crosses the turn of the calendar year', () => {
    // December to February is one flight period. Read in month order it would
    // be two: January–February and December.
    expect(activeRuns(species({ id: 'summer', activeMonths: [12, 1, 2] }))).toStrictEqual([
      { from: 12, to: 2 },
    ]);
  });

  it('keeps two genuinely separate periods separate', () => {
    const twice = species({ id: 'twice', activeMonths: [7, 8, 11, 12] });

    expect(activeRuns(twice)).toStrictEqual([
      { from: 7, to: 8 },
      { from: 11, to: 12 },
    ]);
  });

  it('reports a single month as a run of one', () => {
    expect(activeRuns(species({ id: 'one', activeMonths: [9] }))).toStrictEqual([
      { from: 9, to: 9 },
    ]);
  });

  it('joins a northern flight season across the July cut', () => {
    // The case the ring exists for, and the archive's own: a stag beetle flies
    // May to August. Read straight through the array that is "July to August"
    // and "May to June" — two flight periods, neither of which exists.
    const stagBeetle = SPECIES.find((one) => one.id === 'lucanus-cervus')!;

    expect(activeRuns(stagBeetle)).toStrictEqual([{ from: 5, to: 8 }]);
    expect(describeActiveMonths(stagBeetle)).toBe('On the wing May to August.');
  });

  it('gives an animal that never stops one run of the whole year', () => {
    const always = species({ id: 'always', activeMonths: [...MONTHS] });

    expect(activeRuns(always)).toStrictEqual([{ from: 7, to: 6 }]);
  });

  it('accounts for every active month and no others', () => {
    for (const one of SPECIES) {
      const covered: Month[] = [];

      for (const { from, to } of activeRuns(one)) {
        // Walked on the ring, because a run may wrap the cut: from July back
        // round to June is a legal run and `to` may sit before `from`.
        const start = CALENDAR_MONTHS.indexOf(from);
        const end = CALENDAR_MONTHS.indexOf(to);
        const span = (end - start + CALENDAR_MONTHS.length) % CALENDAR_MONTHS.length;

        for (let step = 0; step <= span; step += 1) {
          covered.push(CALENDAR_MONTHS[(start + step) % CALENDAR_MONTHS.length]!);
        }
      }

      expect(
        [...covered].sort((a, b) => a - b),
        one.id,
      ).toStrictEqual([...one.activeMonths].sort((a, b) => a - b));
    }
  });
});

describe('describeActiveMonths', () => {
  it('reads a run as a range rather than as a list', () => {
    expect(describeActiveMonths(species({ id: 'a', activeMonths: [7, 8, 9, 10, 11] }))).toBe(
      'On the wing July to November.',
    );
  });

  it('joins two periods with "and again"', () => {
    expect(describeActiveMonths(species({ id: 'b', activeMonths: [7, 11, 12] }))).toBe(
      'On the wing July, and again November to December.',
    );
  });

  it('says so in a sentence when there is nothing to say', () => {
    expect(describeActiveMonths(species({ id: 'c', activeMonths: [] }))).toMatch(/^No months/);
  });

  it('gives every species in the collection a sentence', () => {
    for (const one of SPECIES) {
      expect(describeActiveMonths(one), one.id).toMatch(/^On the wing .+\.$/);
    }
  });
});
