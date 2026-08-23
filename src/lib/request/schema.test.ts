import { describe, expect, it } from 'vitest';

import {
  EMPTY_REQUEST,
  firstInvalidField,
  isBaited,
  REQUEST_FIELDS,
  requestReference,
  validateRequest,
  type RequestContext,
  type RequestValues,
} from './schema';

/**
 * The request schema.
 *
 * `today` is passed in, so none of this depends on the day the suite runs — the
 * whole reason the schema is a factory over a context rather than a constant.
 */

const CONTEXT: RequestContext = {
  today: '2026-08-24',
  species: ['lucanus-cervus', 'aeshna-cyanea'],
};

const VALID: RequestValues = {
  name: 'A. Reader',
  email: 'reader@example.org',
  institution: '',
  specimen: 'lucanus-cervus',
  purpose: 'To compare the mandibles against a specimen in our own collection.',
  visitDate: '2026-09-01',
};

const check = (values: Partial<RequestValues>) => validateRequest({ ...VALID, ...values }, CONTEXT);

describe('validateRequest', () => {
  it('accepts a complete request', () => {
    expect(check({})).toStrictEqual({});
  });

  it('accepts a request with no institution', () => {
    // Optional, and empty is the normal answer: a visitor with no institution is
    // a visitor, not an error.
    expect(check({ institution: '' })).toStrictEqual({});
  });

  it('rejects an empty form, field by field', () => {
    const errors = validateRequest(EMPTY_REQUEST, CONTEXT);

    // Every required field reports, so a reader sees all of it at once rather
    // than one problem per submit.
    expect(Object.keys(errors).sort()).toStrictEqual([
      'email',
      'name',
      'purpose',
      'specimen',
      'visitDate',
    ]);
    expect(errors.institution).toBeUndefined();
  });

  it('rejects a name of one character and one of eighty-one', () => {
    expect(check({ name: 'A' }).name).toBeDefined();
    expect(check({ name: 'A'.repeat(81) }).name).toBeDefined();
    expect(check({ name: 'Jo' }).name).toBeUndefined();
  });

  it('trims before measuring, so whitespace is not a name', () => {
    expect(check({ name: '   ' }).name).toBeDefined();
  });

  it('rejects an address that is not one', () => {
    expect(check({ email: 'reader' }).email).toBeDefined();
    expect(check({ email: 'reader@' }).email).toBeDefined();
    expect(check({ email: 'reader@example' }).email).toBeDefined();
    expect(check({ email: 'a.reader+plates@sub.example.org' }).email).toBeUndefined();
  });

  it('rejects a specimen that is not in the collection', () => {
    // The select only offers real ones; this is the check for a hand-edited
    // form and for a `?species=` that named something else.
    expect(check({ specimen: 'anoplognathus-porosus' }).specimen).toBeDefined();
    expect(check({ specimen: '' }).specimen).toBeDefined();
  });

  it('asks for more than a word of purpose', () => {
    expect(check({ purpose: 'research' }).purpose).toBeDefined();
    expect(check({ purpose: 'x'.repeat(1001) }).purpose).toBeDefined();
  });

  it('rejects a visit date in the past, and accepts today', () => {
    expect(check({ visitDate: '2026-08-23' }).visitDate).toBeDefined();
    expect(check({ visitDate: CONTEXT.today }).visitDate).toBeUndefined();
  });

  it('rejects a date that is not a date', () => {
    expect(check({ visitDate: 'next Tuesday' }).visitDate).toBeDefined();
  });

  it('gives one message a field, not a list', () => {
    const errors = check({ name: '' });

    expect(typeof errors.name).toBe('string');
  });
});

describe('firstInvalidField', () => {
  it('reports the first problem in page order', () => {
    // Page order, not the order the validator happened to report: focus has to
    // land on the first problem a reader would meet, or it sends them backwards.
    expect(firstInvalidField({ visitDate: 'no', email: 'no' })).toBe('email');
    expect(firstInvalidField({ purpose: 'no', name: 'no' })).toBe('name');
  });

  it('reports nothing for a valid form', () => {
    expect(firstInvalidField({})).toBeUndefined();
  });

  it('walks the same order the form is laid out in', () => {
    expect([...REQUEST_FIELDS]).toStrictEqual([
      'name',
      'email',
      'institution',
      'specimen',
      'purpose',
      'visitDate',
    ]);
  });
});

describe('isBaited', () => {
  it('is false for an untouched honeypot', () => {
    expect(isBaited('')).toBe(false);
    expect(isBaited('   ')).toBe(false);
  });

  it('is true for anything a bot typed into it', () => {
    expect(isBaited('http://example.com')).toBe(true);
  });
});

describe('requestReference', () => {
  it('reads as a reference number', () => {
    expect(requestReference(VALID)).toMatch(/^TEA-R-[0-9A-Z]{4}$/);
  });

  it('is the same for the same request', () => {
    // Pure, so a test can assert on it — and so a reader who submits twice by
    // accident does not get two different reference numbers for one request.
    expect(requestReference(VALID)).toBe(requestReference({ ...VALID }));
  });

  it('ignores case and surrounding space', () => {
    expect(requestReference({ ...VALID, name: '  a. READER  ' })).toBe(requestReference(VALID));
  });

  it('differs when the request differs', () => {
    expect(requestReference({ ...VALID, specimen: 'aeshna-cyanea' })).not.toBe(
      requestReference(VALID),
    );
  });

  it('is four characters even for an empty request', () => {
    // The hash of an empty string is short in base 36; padding is what keeps
    // every reference the same width.
    expect(requestReference(EMPTY_REQUEST)).toMatch(/^TEA-R-[0-9A-Z]{4}$/);
  });
});
