import { useEffect, useId, useMemo, useRef, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router';

import { SPECIES } from '@/data';
import { SpecimenRow } from '@/features/catalogue';
import { useRouteMeta } from '@/features/meta';
import { binomialOf } from '@/lib/catalogue';
import {
  advance,
  buildKey,
  decodeAnswers,
  encodeAnswers,
  KEY_PARAM,
  type KeyAnswer,
} from '@/lib/key';
import { routeMeta } from '@/lib/meta';

import styles from './KeyRoute.module.css';

/**
 * The identification key: one question a screen, until one specimen is left.
 *
 * ## The state is the URL
 *
 * Same reasoning as the catalogue's filters, and one more: a key in progress is
 * the interesting thing to send somebody. `?k=4lpc1ipc` is two answers — hard
 * wing cases, almost circular — and every answer is a **push**, so the
 * browser's back button walks back up the key without this page doing anything
 * to arrange it.
 *
 * The parameter's *absence* is the intro screen and its presence — even empty —
 * is the key itself, which is why starting navigates to `?k=`. That is one more
 * state than a bare list of answers can hold, and it has to be held somewhere:
 * the alternative is an intro that a reader cannot get past without it also
 * being question one.
 *
 * A stale or hand-edited parameter needs no repair. `decodeAnswers` drops what
 * it cannot read and `advance` stops at the first answer that does not fit the
 * question being asked, and the next answer is written from `position.answers`
 * rather than from the URL — so the link heals itself on the first tap instead
 * of being rewritten under the reader.
 *
 * ## The tree is built once
 *
 * At module scope, because it is a pure function of `SPECIES` and the records
 * are a module constant. It is the same tree for every visitor, which is what
 * makes a shared link mean the same thing to both of them.
 */
const TREE = buildKey(SPECIES);

/** The keys that move focus between the options, and where each one goes. */
const ARROWS: Record<string, 'next' | 'previous' | 'first' | 'last' | undefined> = {
  ArrowDown: 'next',
  ArrowRight: 'next',
  ArrowUp: 'previous',
  ArrowLeft: 'previous',
  Home: 'first',
  End: 'last',
};

export function KeyRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const questionId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const raw = searchParams.get(KEY_PARAM);
  const started = raw !== null;

  const position = useMemo(() => advance(TREE, decodeAnswers(raw)), [raw]);
  const { node, steps } = position;
  const remaining = node.species.length;
  const only = remaining === 1 ? node.species[0] : undefined;

  // The canonical is always `/key`, never `/key?k=…`. Every state of the key
  // lives at the same path with different answers in the query string, and each
  // is a step through one document rather than a page of its own — so a crawler
  // is told there is one page here, which there is. The *title* still tracks the
  // state, because that is what a screen reader announces and what a browser tab
  // has to distinguish.
  useRouteMeta(
    routeMeta({
      title: !started
        ? 'Identify'
        : node.kind === 'question'
          ? `Identify · question ${String(steps.length + 1)}`
          : only === undefined
            ? `Identify · ${String(remaining)} specimens`
            : `Identify · ${binomialOf(only)}`,
      description:
        'A branching identification key built from the collection itself. Six characters, ' +
        'three or four questions, and every specimen keys out on its own.',
      path: '/key',
    }),
  );

  /**
   * Focus the new screen's heading once the answers change.
   *
   * Answering writes the query string, and `RootLayout` deliberately only moves
   * focus when the *path* changes — so without this, a reader who answered with
   * the keyboard would be left focused on a button that no longer exists, and a
   * screen reader would announce nothing but the count in the live region.
   *
   * The ref starts at the current value, which skips the first render for free:
   * arriving on a shared link should not steal focus from the top of the page.
   */
  const focusedFor = useRef(raw);

  useEffect(() => {
    if (focusedFor.current === raw) return;

    focusedFor.current = raw;
    headingRef.current?.focus();
  }, [raw]);

  /** Writes a set of answers to the URL, keeping anything else that is there. */
  const goTo = (answers: readonly KeyAnswer[] | null): void => {
    const params = new URLSearchParams(searchParams);

    // The season shares this URL and is not ours to drop; copying the existing
    // parameters and overwriting one keeps a shared link's palette intact.
    if (answers === null) params.delete(KEY_PARAM);
    else params.set(KEY_PARAM, encodeAnswers(answers));

    // A push, not a replace: each answer is a step a reader can come back from
    // with the browser's own button.
    setSearchParams(params);
  };

  const answer = (value: string): void => {
    if (node.kind !== 'question') return;

    goTo([...position.answers, { trait: node.trait.id, value }]);
  };

  /** One question back, or out to the intro from the first one. */
  const back = (): void => {
    goTo(steps.length === 0 ? null : position.answers.slice(0, -1));
  };

  /**
   * Arrow keys move focus along the options.
   *
   * On each button rather than on the group around them: the handler belongs to
   * the thing that has focus, and a keyboard listener on a non-interactive
   * wrapper is the shape of an accessibility bug even when it works.
   *
   * Every option is also a plain tab stop, because that is what a list of
   * buttons is; the arrows are the shortcut a reader expects from a group of
   * choices. The order is read off the DOM rather than from an array of refs —
   * the browser already knows it, and a ref per option would be a second copy
   * of it to keep in step.
   */
  const onOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const move = ARROWS[event.key];

    if (move === undefined) return;

    const group = event.currentTarget.parentElement;
    const options = [...(group?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    const at = options.indexOf(event.currentTarget);

    if (at < 0) return;

    event.preventDefault();

    const to =
      move === 'first'
        ? 0
        : move === 'last'
          ? options.length - 1
          : move === 'next'
            ? (at + 1) % options.length
            : (at - 1 + options.length) % options.length;

    options[to]?.focus();
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h1 className={styles.title} tabIndex={-1}>
          Identify
        </h1>
      </div>

      {!started ? (
        <div className={styles.screen}>
          <p className={styles.lede}>
            Answer what you can see; the key narrows the collection until one specimen remains.
          </p>
          <button
            type="button"
            className={styles.start}
            onClick={() => {
              goTo([]);
            }}
          >
            Start the key
          </button>
        </div>
      ) : (
        /*
         * Keyed on the answers so each screen is a fresh element: the fade is a
         * mount animation, and it would otherwise play once and never again.
         * Every duration in the project comes from a token and the tokens go to
         * zero under `prefers-reduced-motion`, so this needs nothing of its own
         * to respect it.
         */
        <div className={styles.screen} key={raw}>
          {/*
            The one live region. It carries the count rather than the question,
            because the question is announced by the heading taking focus and
            hearing it twice is worse than hearing it once.
          */}
          <p className={styles.progress} aria-live="polite">
            {node.kind === 'question'
              ? `Question ${String(steps.length + 1)} · ${String(remaining)} species remain`
              : `Keyed out in ${String(steps.length)} ${steps.length === 1 ? 'question' : 'questions'} · ${
                  remaining === 1 ? 'one specimen' : `${String(remaining)} specimens`
                }`}
          </p>

          {node.kind === 'question' ? (
            <>
              <h2 className={styles.question} id={questionId} ref={headingRef} tabIndex={-1}>
                {node.trait.question}
              </h2>

              {/*
                Real buttons in a group, not radios: choosing an answer moves
                the reader on, and a radio that navigates is a radio lying about
                what it does.
              */}
              <div className={styles.options} role="group" aria-labelledby={questionId}>
                {node.branches.map((branch) => (
                  <button
                    key={branch.option.value}
                    type="button"
                    className={styles.option}
                    onKeyDown={onOptionKeyDown}
                    onClick={() => {
                      answer(branch.option.value);
                    }}
                  >
                    <span className={styles.optionLabel}>{branch.option.label}</span>
                    {/*
                      The count only. Naming the species behind an answer would
                      key the collection out for the reader on the first screen.
                    */}
                    <span className={styles.optionCount}>{branch.node.species.length} species</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {/*
                No empty case. A branch is only built where a species answers
                it, so a leaf always holds at least one — the key cannot walk a
                reader into nothing.
              */}
              <h2 className={styles.question} ref={headingRef} tabIndex={-1}>
                {remaining === 1 ? 'One specimen matches' : `${String(remaining)} specimens match`}
              </h2>

              {remaining > 1 && (
                <p className={styles.note}>
                  These answer every question in the key the same way. The characters the key asks
                  about cannot separate them; the specimen sheets can.
                </p>
              )}

              <ul className={styles.results} role="list">
                {node.species.map((species) => (
                  <SpecimenRow key={species.id} species={species} />
                ))}
              </ul>
            </>
          )}

          <div className={styles.controls}>
            <button type="button" className={styles.control} onClick={back}>
              Back
            </button>
            {steps.length > 0 && (
              <button
                type="button"
                className={styles.control}
                onClick={() => {
                  goTo([]);
                }}
              >
                Start over
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
