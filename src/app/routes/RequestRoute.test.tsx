import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { catalogueNumberOf, SPECIES } from '@/data';
import { binomialOf } from '@/lib/catalogue';
import { renderWithProviders } from '@/test/renderWithProviders';

import { RequestRoute } from './RequestRoute';

/**
 * The request form.
 *
 * Queried the way a visitor meets it — by label, by role, by the text of the
 * message under a field — because that is also how a screen reader meets it. A
 * form whose errors can only be found by class name is a form whose errors are
 * decoration.
 */

function renderRequest(route = '/request') {
  return renderWithProviders(<RequestRoute />, { route });
}

const SPECIMEN = SPECIES[0]!;
const OTHER = SPECIES[3]!;

/** Fill in a valid request. `overrides` replaces a field with what is given. */
async function fill(
  user: ReturnType<typeof userEvent.setup>,
  overrides: Partial<Record<'name' | 'email' | 'purpose' | 'visitDate' | 'specimen', string>> = {},
) {
  await user.type(screen.getByLabelText('Your name'), overrides.name ?? 'A. Reader');
  await user.type(screen.getByLabelText('Email address'), overrides.email ?? 'reader@example.org');
  await user.selectOptions(screen.getByLabelText('Specimen'), overrides.specimen ?? SPECIMEN.id);
  await user.type(
    screen.getByLabelText('Purpose of the request'),
    overrides.purpose ?? 'To compare the mandibles with a specimen in our own collection.',
  );
  await user.type(
    screen.getByLabelText('Preferred visit date'),
    overrides.visitDate ?? '2099-01-04',
  );
}

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: /send request/i }));

describe('RequestRoute', () => {
  it('says it is a demonstration before anything is typed', () => {
    renderRequest();

    // Somebody typing their email address into a fictional institution's form
    // deserves to know beforehand, not in the confirmation.
    expect(screen.getByText(/this form is a demonstration/i)).toBeInTheDocument();
  });

  it('labels every control', () => {
    renderRequest();

    for (const label of [
      'Your name',
      'Email address',
      'Institution',
      'Specimen',
      'Purpose of the request',
      'Preferred visit date',
    ]) {
      expect(screen.getByLabelText(label), label).toBeInTheDocument();
    }
  });

  it('offers every specimen, by accession number and binomial', () => {
    renderRequest();

    const select = screen.getByLabelText('Specimen');
    const options = within(select).getAllByRole('option');

    // Sixteen specimens and the "choose one" placeholder.
    expect(options).toHaveLength(SPECIES.length + 1);
    expect(
      within(select).getByRole('option', {
        name: new RegExp(`${catalogueNumberOf(SPECIMEN)}.*${binomialOf(SPECIMEN)}`),
      }),
    ).toBeInTheDocument();
  });

  it('floors the date input at today', () => {
    renderRequest();

    const date = screen.getByLabelText('Preferred visit date');
    const min = date.getAttribute('min');

    expect(min).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Local date parts, not `toISOString`: in Sydney that would return
    // yesterday and the picker would refuse today.
    expect(min).toBe(
      new Date().toLocaleDateString('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    );
  });

  describe('preselection', () => {
    it('selects the specimen named in ?species=', () => {
      renderRequest(`/request?species=${OTHER.id}`);

      expect(screen.getByLabelText('Specimen')).toHaveValue(OTHER.id);
    });

    it('selects nothing for an id the collection does not hold', () => {
      renderRequest('/request?species=anoplognathus-porosus');

      // Not the first specimen: quietly asking for an animal nobody named is
      // the failure to avoid.
      expect(screen.getByLabelText('Specimen')).toHaveValue('');
    });

    it('selects nothing when the parameter is absent', () => {
      renderRequest();

      expect(screen.getByLabelText('Specimen')).toHaveValue('');
    });
  });

  describe('validation', () => {
    it('reports every empty required field on submit', async () => {
      const user = userEvent.setup();

      renderRequest();
      await submit(user);

      expect(screen.getByText(/please give a name/i)).toBeInTheDocument();
      expect(screen.getByText(/please give an email address/i)).toBeInTheDocument();
      expect(screen.getByText(/please choose the specimen/i)).toBeInTheDocument();
      expect(screen.getByText(/please say a little more/i)).toBeInTheDocument();
      expect(screen.getByText(/please choose a date/i)).toBeInTheDocument();
      // Optional, so it says nothing.
      expect(screen.queryByText(/institution under 120/i)).not.toBeInTheDocument();
    });

    it('ties each message to its control and marks the control invalid', async () => {
      const user = userEvent.setup();

      renderRequest();
      await submit(user);

      const name = screen.getByLabelText('Your name');
      const described = name.getAttribute('aria-describedby');

      expect(name).toHaveAttribute('aria-invalid', 'true');
      expect(described).not.toBeNull();
      // A dangling id is the usual way this attribute goes wrong, and nothing
      // else would catch it.
      const message = document.getElementById(described!);

      expect(message?.textContent).toMatch(/please give a name/i);
    });

    it('names the hint as well as the error, where a field has both', async () => {
      const user = userEvent.setup();

      renderRequest();
      await submit(user);

      const purpose = screen.getByLabelText('Purpose of the request');
      const ids = (purpose.getAttribute('aria-describedby') ?? '').split(' ');

      expect(ids).toHaveLength(2);

      const text = ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ');

      expect(text).toMatch(/a sentence or two/i);
      expect(text).toMatch(/please say a little more/i);
    });

    it('moves focus to the first invalid field in page order', async () => {
      const user = userEvent.setup();

      renderRequest();
      await submit(user);

      expect(screen.getByLabelText('Your name')).toHaveFocus();
    });

    it('moves focus past the fields that are already filled in', async () => {
      const user = userEvent.setup();

      renderRequest();
      await user.type(screen.getByLabelText('Your name'), 'A. Reader');
      await user.type(screen.getByLabelText('Email address'), 'reader@example.org');
      await submit(user);

      // Institution is optional, so the first problem is the specimen.
      expect(screen.getByLabelText('Specimen')).toHaveFocus();
    });

    it('clears a field’s error as it is corrected', async () => {
      const user = userEvent.setup();

      renderRequest();
      await submit(user);

      expect(screen.getByText(/please give a name/i)).toBeInTheDocument();

      await user.type(screen.getByLabelText('Your name'), 'A. Reader');

      // The page should stop arguing with somebody who is already fixing it.
      expect(screen.queryByText(/please give a name/i)).not.toBeInTheDocument();
      expect(screen.getByLabelText('Your name')).not.toHaveAttribute('aria-invalid');
    });

    it('rejects an address that is not an address, and keeps the form', async () => {
      const user = userEvent.setup();

      renderRequest();
      await fill(user, { email: 'reader' });
      await submit(user);

      expect(screen.getByText(/does not look like an email address/i)).toBeInTheDocument();
      expect(screen.queryByText(/request noted/i)).not.toBeInTheDocument();
      // Nothing typed is lost when a submit fails.
      expect(screen.getByLabelText('Your name')).toHaveValue('A. Reader');
    });

    it('rejects a visit date in the past', async () => {
      const user = userEvent.setup();

      renderRequest();
      await fill(user, { visitDate: '2020-01-02' });
      await submit(user);

      expect(screen.getByText(/cannot be visited in the past/i)).toBeInTheDocument();
    });
  });

  describe('on success', () => {
    it('shows a reference, the specimen and the date', async () => {
      const user = userEvent.setup();

      renderRequest();
      await fill(user);
      await submit(user);

      const panel = screen.getByRole('status');

      expect(within(panel).getByRole('heading', { level: 2 }).textContent).toMatch(
        /TEA-R-[0-9A-Z]{4}/,
      );
      expect(within(panel).getByText(new RegExp(catalogueNumberOf(SPECIMEN)))).toBeInTheDocument();
      expect(within(panel).getByText('2099-01-04')).toBeInTheDocument();
    });

    it('says that nothing was sent', async () => {
      const user = userEvent.setup();

      renderRequest();
      await fill(user);
      await submit(user);

      expect(screen.getByText(/nothing was sent/i)).toBeInTheDocument();
      expect(screen.getByText(/demonstration of a request form/i)).toBeInTheDocument();
    });

    it('replaces the form, and can be sent back to it', async () => {
      const user = userEvent.setup();

      renderRequest();
      await fill(user);
      await submit(user);

      expect(screen.queryByLabelText('Your name')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /make another request/i }));

      expect(screen.getByLabelText('Your name')).toBeInTheDocument();
    });
  });

  describe('the honeypot', () => {
    /** The trap, found the only way it can be: by name, out of the form. */
    const honeypot = (): HTMLInputElement =>
      document.querySelector<HTMLInputElement>('input[name="reference"]')!;

    it('is hidden from sight, from the tree and from the tab order', () => {
      renderRequest();

      const trap = honeypot();

      expect(trap).not.toBeNull();
      expect(trap.tabIndex).toBe(-1);
      expect(trap.autocomplete).toBe('off');
      // `aria-hidden` on the wrapper, so it is not in the accessibility tree —
      // which is what a role query looks at, and why this test has to reach for
      // the element by name to find it at all.
      expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
      expect(screen.queryByRole('textbox', { name: /leave blank/i })).not.toBeInTheDocument();
    });

    it('short-circuits validation entirely when it is filled', async () => {
      const user = userEvent.setup();

      renderRequest();

      // Baited, with an otherwise empty form: a bot fills every input.
      await user.type(honeypot(), 'http://example.com');
      await submit(user);

      // The confirmation a real submission gets, and not one word about why.
      // Telling a bot its submission failed teaches it what to change.
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByText(/please give a name/i)).not.toBeInTheDocument();
    });
  });
});
