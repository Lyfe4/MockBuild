import { useId, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
import { Link, useSearchParams } from 'react-router';

import { Ledger } from '@/components/Ledger';
import { catalogueNumberOf, INSTITUTION, SPECIES } from '@/data';
import { useRouteMeta } from '@/features/meta';
import { useToday } from '@/hooks';
import { binomialOf } from '@/lib/catalogue';
import { cx } from '@/lib/classNames';
import { routeMeta } from '@/lib/meta';
import {
  EMPTY_REQUEST,
  firstInvalidField,
  HONEYPOT_FIELD,
  isBaited,
  requestReference,
  validateRequest,
  type RequestErrors,
  type RequestField,
  type RequestValues,
} from '@/lib/request';

import styles from './RequestRoute.module.css';

/**
 * Request material — a form that files nothing, built as though it did.
 *
 * **No network call.** There is no endpoint and no third party; submitting
 * validates, mints a reference out of what was typed, and shows a panel that
 * says in as many words that this is a demonstration. A mock form that looks
 * like it filed something is worse than no form at all, so the confirmation
 * says what did and did not happen.
 *
 * Validation runs on submit rather than on every keystroke. Telling somebody
 * their email address is invalid while they are still typing the `@` is a form
 * arguing with a reader mid-word; a reader who has finished has said so by
 * pressing the button.
 *
 * Three things make the errors usable rather than decorative: each message is
 * tied to its control with `aria-describedby` so a screen reader reads it as
 * part of the field, `aria-invalid` marks the control itself, and focus moves
 * to the first invalid field in **page order** — not the first the validator
 * reported, which is a different thing and would send a reader backwards.
 *
 * `?species=` preselects the specimen, so a link from a specimen sheet arrives
 * with the right one chosen. An unknown id selects nothing rather than the first
 * entry: quietly asking for the wrong specimen is the failure to avoid.
 */

/** Every field's label, hint and control, in one place. */
const LABELS: Record<RequestField, string> = {
  name: 'Your name',
  email: 'Email address',
  institution: 'Institution',
  specimen: 'Specimen',
  purpose: 'Purpose of the request',
  visitDate: 'Preferred visit date',
};

const HINTS: Partial<Record<RequestField, string>> = {
  institution: 'Optional.',
  purpose: 'A sentence or two. What the material is for, and what you hope to see.',
  visitDate: `The reading room is open ${INSTITUTION.readingRoom.days}, ${INSTITUTION.readingRoom.hours}.`,
};

const SPECIES_IDS = SPECIES.map((species) => species.id);

/**
 * Today, as `YYYY-MM-DD`, in the visitor's own time zone.
 *
 * Built from the local date parts rather than `toISOString`, which converts to
 * UTC first: at 9am in Sydney that returns yesterday, and the date input would
 * refuse today.
 */
function todayLocal(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${String(year)}-${month}-${day}`;
}

interface FieldProps {
  field: RequestField;
  ids: Record<RequestField, string>;
  errors: RequestErrors;
  children: (props: {
    id: string;
    'aria-invalid': boolean | undefined;
    'aria-describedby': string | undefined;
  }) => ReactNode;
}

/**
 * Label, control, hint and error, wired together.
 *
 * The control is a render prop because the four fields are four different
 * elements — input, select, textarea — and the wiring is identical. What the
 * wrapper owns is the ids: `aria-describedby` has to name the hint *and* the
 * error, in that order, and only the ones that exist. A dangling id is the
 * usual way this attribute goes wrong and it fails silently.
 */
function Field({ field, ids, errors, children }: FieldProps) {
  const error = errors[field];
  const hint = HINTS[field];
  const hintId = `${ids[field]}-hint`;
  const errorId = `${ids[field]}-error`;
  const described = [hint === undefined ? '' : hintId, error === undefined ? '' : errorId]
    .filter((id) => id !== '')
    .join(' ');

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={ids[field]}>
        {LABELS[field]}
      </label>
      {hint !== undefined && (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      )}
      {children({
        id: ids[field],
        'aria-invalid': error === undefined ? undefined : true,
        'aria-describedby': described === '' ? undefined : described,
      })}
      {error !== undefined && (
        <p className={styles.error} id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}

export function RequestRoute() {
  useRouteMeta(
    routeMeta({
      title: 'Request material',
      description:
        'A mock request form for the reading room. Nothing is sent anywhere: the archive is ' +
        'fictional, there is no endpoint, and no field leaves the page.',
      path: '/request',
    }),
  );

  const [params] = useSearchParams();
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  /**
   * Today, and `null` until the page is being read rather than built.
   *
   * Not a `useState` initialiser calling `new Date()`, as it was: this route is
   * prerendered at build time, so an initialiser would put the *build* date
   * into the shipped `min` attribute and a reader would meet a form floored at
   * whenever the site was last deployed. `useToday` has the rest of it.
   *
   * `min` is simply absent for the render that is hydrating, which is the right
   * way round: the attribute is a hint to a date picker, and the schema is what
   * actually decides.
   */
  const today = useToday();
  const todayIso = today === null ? null : todayLocal(today);

  const preselected = params.get('species') ?? '';
  const [values, setValues] = useState<RequestValues>({
    ...EMPTY_REQUEST,
    // An id the collection does not hold selects nothing. Falling back to the
    // first specimen would have a visitor ask for an animal they never named.
    specimen: SPECIES_IDS.includes(preselected) ? preselected : '',
  });
  const [errors, setErrors] = useState<RequestErrors>({});
  const [reference, setReference] = useState<string | undefined>(undefined);

  const ids = Object.fromEntries(
    Object.keys(EMPTY_REQUEST).map((field) => [field, `${formId}-${field}`]),
  ) as Record<RequestField, string>;

  const update = (field: RequestField, value: string): void => {
    setValues((current) => ({ ...current, [field]: value }));
    // Clear the field's own error as it is edited. Leaving it would have the
    // page arguing with somebody who is already fixing it.
    setErrors((current) => {
      if (current[field] === undefined) return current;

      // Destructured out rather than deleted: the key is computed, and a
      // `delete` on a computed key is both slower and something the linter
      // rightly asks about.
      const { [field]: _cleared, ...rest } = current;

      return rest;
    });
  };

  const onSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    // No endpoint: a native submit would reload the page and lose the form.
    event.preventDefault();

    const honeypot = new FormData(event.currentTarget).get(HONEYPOT_FIELD);

    // Short-circuit, before validation and without a word about why. A baited
    // submission gets the confirmation a real one gets; see `isBaited`.
    if (typeof honeypot === 'string' && isBaited(honeypot)) {
      setErrors({});
      setReference(requestReference(values));

      return;
    }

    // `todayIso` cannot be null here — a submit needs a mount, and the effect
    // has run by then — but the floor is stated rather than asserted away.
    const found = validateRequest(values, {
      today: todayIso ?? todayLocal(new Date()),
      species: SPECIES_IDS,
    });

    setErrors(found);

    const first = firstInvalidField(found);

    if (first !== undefined) {
      formRef.current?.querySelector<HTMLElement>(`#${CSS.escape(ids[first])}`)?.focus();

      return;
    }

    setReference(requestReference(values));
  };

  const chosen = SPECIES.find((species) => species.id === values.specimen);

  return (
    <Ledger
      sticky
      margin={
        <aside className={styles.aside} aria-label="Reading room">
          <p className={styles.asideHeading}>Reading room</p>
          <p className={styles.asideBody}>
            {INSTITUTION.readingRoom.days}
            <br />
            {INSTITUTION.readingRoom.hours}
            <br />
            <span className={styles.asideNote}>{INSTITUTION.readingRoom.note}</span>
          </p>
          <p className={styles.asideBody}>
            Material is consulted in the reading room and is not lent. Plates may be photographed
            without flash.
          </p>
          <p className={styles.asideBody}>
            <Link to="/catalogue">Browse the catalogue</Link> to find an accession number, or{' '}
            <Link to="/about">read about the collection</Link>.
          </p>
        </aside>
      }
    >
      <article className={styles.sheet}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Enquiries</p>
          <h1 className={styles.title} tabIndex={-1}>
            Request material
          </h1>
          <p className={styles.standfirst}>
            Ask to see a specimen in the reading room. Requests are usually answered within three
            working days.
          </p>
        </header>

        {/*
          The demonstration notice sits above the form rather than only in the
          confirmation. Somebody typing their email address into a fictional
          institution's form deserves to know before they type it, not after.
        */}
        <p className={styles.demonstration}>
          <strong>This form is a demonstration.</strong> Thornfield is a fictional archive: nothing
          is sent, nothing is stored, and no address here reaches anybody. Please do not enter
          anything you would mind losing.
        </p>

        {reference === undefined ? (
          <form className={styles.form} ref={formRef} noValidate onSubmit={onSubmit}>
            <Field field="name" ids={ids} errors={errors}>
              {(props) => (
                <input
                  {...props}
                  className={cx(styles.control, errors.name !== undefined && styles.controlInvalid)}
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={values.name}
                  onChange={(event) => {
                    update('name', event.target.value);
                  }}
                />
              )}
            </Field>

            <Field field="email" ids={ids} errors={errors}>
              {(props) => (
                <input
                  {...props}
                  className={cx(
                    styles.control,
                    errors.email !== undefined && styles.controlInvalid,
                  )}
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={values.email}
                  onChange={(event) => {
                    update('email', event.target.value);
                  }}
                />
              )}
            </Field>

            <Field field="institution" ids={ids} errors={errors}>
              {(props) => (
                <input
                  {...props}
                  className={cx(
                    styles.control,
                    errors.institution !== undefined && styles.controlInvalid,
                  )}
                  type="text"
                  name="institution"
                  autoComplete="organization"
                  value={values.institution}
                  onChange={(event) => {
                    update('institution', event.target.value);
                  }}
                />
              )}
            </Field>

            <Field field="specimen" ids={ids} errors={errors}>
              {(props) => (
                <select
                  {...props}
                  className={cx(
                    styles.control,
                    errors.specimen !== undefined && styles.controlInvalid,
                  )}
                  name="specimen"
                  value={values.specimen}
                  onChange={(event) => {
                    update('specimen', event.target.value);
                  }}
                >
                  <option value="">Choose a specimen</option>
                  {SPECIES.map((species) => (
                    <option key={species.id} value={species.id}>
                      {catalogueNumberOf(species)} — {binomialOf(species)} ({species.commonName})
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field field="purpose" ids={ids} errors={errors}>
              {(props) => (
                <textarea
                  {...props}
                  className={cx(
                    styles.control,
                    styles.textarea,
                    errors.purpose !== undefined && styles.controlInvalid,
                  )}
                  name="purpose"
                  rows={5}
                  value={values.purpose}
                  onChange={(event) => {
                    update('purpose', event.target.value);
                  }}
                />
              )}
            </Field>

            <Field field="visitDate" ids={ids} errors={errors}>
              {(props) => (
                <input
                  {...props}
                  className={cx(
                    styles.control,
                    errors.visitDate !== undefined && styles.controlInvalid,
                  )}
                  type="date"
                  name="visitDate"
                  // The browser's own floor as well as the schema's. The
                  // attribute stops a date picker offering last week; the schema
                  // is what actually decides, because an attribute is a
                  // suggestion to anything that is not a date picker.
                  min={todayIso ?? undefined}
                  value={values.visitDate}
                  onChange={(event) => {
                    update('visitDate', event.target.value);
                  }}
                />
              )}
            </Field>

            {/*
              The honeypot. Hidden from sight and from the accessibility tree,
              out of the tab order, and with autocomplete off so a browser does
              not helpfully fill it. A person never meets it; a bot filling
              every input fills it. `aria-hidden` with `tabIndex={-1}` is the
              pair that matters — hidden and still focusable would drop a
              keyboard reader into a field that is not there.
            */}
            <div className={styles.honeypot} aria-hidden="true">
              <label htmlFor={`${formId}-${HONEYPOT_FIELD}`}>Reference (leave blank)</label>
              <input
                id={`${formId}-${HONEYPOT_FIELD}`}
                type="text"
                name={HONEYPOT_FIELD}
                autoComplete="off"
                tabIndex={-1}
                defaultValue=""
              />
            </div>

            <div className={styles.actions}>
              <button className={styles.submit} type="submit">
                Send request
              </button>
              <p className={styles.actionsNote}>Nothing leaves this page.</p>
            </div>
          </form>
        ) : (
          /*
            The confirmation. `role="status"` rather than `alert`: this is the
            successful end of something the reader asked for, and an assertive
            live region interrupts to say so. The heading is what a screen
            reader lands on, so it carries the reference.
          */
          <section className={styles.confirmation} role="status" aria-labelledby="confirmed">
            <h2 className={styles.confirmationHeading} id="confirmed">
              Request noted &mdash; {reference}
            </h2>
            <dl className={styles.receipt}>
              <div className={styles.receiptRow}>
                <dt>Reference</dt>
                <dd>{reference}</dd>
              </div>
              <div className={styles.receiptRow}>
                <dt>Specimen</dt>
                <dd>
                  {chosen === undefined ? (
                    'Not recorded'
                  ) : (
                    <>
                      {catalogueNumberOf(chosen)} &mdash; <i>{binomialOf(chosen)}</i>
                    </>
                  )}
                </dd>
              </div>
              <div className={styles.receiptRow}>
                <dt>Visit</dt>
                <dd>{values.visitDate === '' ? 'Not recorded' : values.visitDate}</dd>
              </div>
            </dl>
            <p className={styles.confirmationNote}>
              <strong>Nothing was sent.</strong> This is a demonstration of a request form: the
              reference above was worked out in your browser, no message was transmitted, and no
              record has been kept. Thornfield holds no specimens and has no reading room.
            </p>
            <div className={styles.actions}>
              <button
                className={styles.submit}
                type="button"
                onClick={() => {
                  setReference(undefined);
                }}
              >
                Make another request
              </button>
              {chosen !== undefined && (
                <p className={styles.actionsNote}>
                  <Link to={`/specimen/${chosen.id}`}>See the specimen sheet</Link>
                </p>
              )}
            </div>
          </section>
        )}
      </article>
    </Ledger>
  );
}
