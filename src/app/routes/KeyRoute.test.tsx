import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { SPECIES } from '@/data';
import { ThemeProvider } from '@/features/theme';
import { binomialOf } from '@/lib/catalogue';
import {
  buildKey,
  encodeAnswers,
  type KeyAnswer,
  type KeyNode,
  type KeyOption,
  type KeyStep,
} from '@/lib/key';

import { KeyRoute } from './KeyRoute';

/**
 * The key page, walked the way a visitor walks it.
 *
 * Driven against the real collection, and the path to each species is worked
 * out with `buildKey` rather than written down — the tree is derived, so a
 * hard-coded route through it would be a second copy of the records and would
 * break the day one is added. The engine's own tests say the tree is right;
 * these say the page renders it, and that the URL, the history and the focus
 * all keep up.
 */
const TREE = buildKey(SPECIES);

/** The questions and answers that reach one species, read out of the tree. */
function stepsTo(
  id: string,
  node: KeyNode = TREE,
  steps: readonly KeyStep[] = [],
): KeyStep[] | undefined {
  if (node.kind === 'leaf') {
    return node.species.some((one) => one.id === id) ? [...steps] : undefined;
  }

  for (const branch of node.branches) {
    const found = stepsTo(id, branch.node, [
      ...steps,
      { trait: node.trait, option: branch.option },
    ]);

    if (found !== undefined) return found;
  }

  return undefined;
}

/** The labels a reader would tap, in order. */
function pathTo(id: string): KeyOption[] {
  return (stepsTo(id) ?? []).map((step) => step.option);
}

/** The same path as URL answers, for the restore-mid-key cases. */
function answersTo(id: string): KeyAnswer[] {
  return (stepsTo(id) ?? []).map((step) => ({ trait: step.trait.id, value: step.option.value }));
}

function renderKey(route = '/key') {
  const router = createMemoryRouter([{ path: '*', element: <KeyRoute /> }], {
    initialEntries: [route],
  });

  render(
    <ThemeProvider initialSeason="autumn">
      <RouterProvider router={router} />
    </ThemeProvider>,
  );

  return router;
}

/**
 * An option button, found by its label.
 *
 * Anchored at both ends, because one label is a prefix of another — the
 * collection holds something "Red" and something "Reddish or chestnut brown" —
 * and a loose match finds two buttons. The count is part of the accessible
 * name, so it is part of the pattern.
 */
function option(label: string): HTMLElement {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return screen.getByRole('button', { name: new RegExp(`^${escaped}\\s*\\d+\\s*species$`) });
}

/** The question, or the leaf's verdict: whatever the screen's h2 says. */
const heading = (): string | null => screen.getByRole('heading', { level: 2 }).textContent;

afterEach(() => {
  delete document.documentElement.dataset.season;
  delete document.documentElement.dataset.themeReady;
  localStorage.clear();
});

describe('KeyRoute', () => {
  describe('the intro', () => {
    it('explains itself in one paragraph and offers a way in', () => {
      renderKey();

      expect(screen.getByRole('heading', { level: 1, name: 'Identify' })).toBeInTheDocument();
      expect(
        screen.getByText(
          'Answer what you can see; the key narrows the collection until one specimen remains.',
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start the key' })).toBeInTheDocument();
      // No question until the reader asks for one.
      expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
    });

    it('has one focusable heading for the router to move focus to', () => {
      renderKey();

      expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('tabindex', '-1');
    });

    it('asks the first question when the key is started', async () => {
      const user = userEvent.setup();
      const router = renderKey();

      await user.click(screen.getByRole('button', { name: 'Start the key' }));

      expect(screen.getByText(/^Question 1 ·/)).toBeInTheDocument();
      // The parameter's presence is what says the key has begun, so an empty
      // one is a real state and not a stray `?`.
      expect(router.state.location.search).toBe('?k=');
    });
  });

  describe('a question', () => {
    it('shows the progress, the question and every answer left', async () => {
      const user = userEvent.setup();

      renderKey();
      await user.click(screen.getByRole('button', { name: 'Start the key' }));

      const first = TREE.kind === 'question' ? TREE : undefined;

      expect(first).toBeDefined();
      expect(heading()).toBe(first!.trait.question);
      expect(
        screen.getByText(`Question 1 · ${String(SPECIES.length)} species remain`),
      ).toBeVisible();

      for (const branch of first!.branches) {
        expect(option(branch.option.label), branch.option.value).toBeInTheDocument();
      }
    });

    it('says how many species are behind each answer, and never which', async () => {
      const user = userEvent.setup();

      renderKey();
      await user.click(screen.getByRole('button', { name: 'Start the key' }));

      const first = TREE.kind === 'question' ? TREE : undefined;
      const branch = first!.branches[0]!;

      expect(option(branch.option.label)).toHaveAccessibleName(
        new RegExp(`${String(branch.node.species.length)} species$`),
      );
      // Naming the animals behind an answer would key the collection out for
      // the reader on the first screen.
      for (const species of SPECIES) {
        expect(screen.queryByText(binomialOf(species))).toBeNull();
      }
    });

    it('announces the remaining count politely', async () => {
      const user = userEvent.setup();

      renderKey();
      await user.click(screen.getByRole('button', { name: 'Start the key' }));

      // Answering does not change the page, so a screen reader would otherwise
      // learn nothing about the collection narrowing.
      expect(screen.getByText(/^Question 1 ·/)).toHaveAttribute('aria-live', 'polite');
    });

    it('moves focus to the new question so it is announced', async () => {
      const user = userEvent.setup();

      renderKey();
      await user.click(screen.getByRole('button', { name: 'Start the key' }));

      const first = TREE.kind === 'question' ? TREE : undefined;
      const wide = first!.branches.find((branch) => branch.node.kind === 'question');

      expect(wide, 'the first question needs a branch that asks another').toBeDefined();

      await user.click(option(wide!.option.label));

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();
      });
    });

    it('walks the options with the arrow keys', async () => {
      const user = userEvent.setup();

      renderKey();
      await user.click(screen.getByRole('button', { name: 'Start the key' }));

      const first = TREE.kind === 'question' ? TREE : undefined;
      const buttons = first!.branches.map((branch) => option(branch.option.label));

      buttons[0]!.focus();
      await user.keyboard('{ArrowDown}');
      expect(buttons[1]!).toHaveFocus();

      await user.keyboard('{ArrowUp}');
      expect(buttons[0]!).toHaveFocus();

      // And they wrap, so End and Home are not the only way to the far end.
      await user.keyboard('{ArrowUp}');
      expect(buttons.at(-1)!).toHaveFocus();

      await user.keyboard('{Home}');
      expect(buttons[0]!).toHaveFocus();
    });
  });

  describe('walking the whole key', () => {
    it.each(SPECIES.map((species) => [species.commonName, species] as const))(
      'reaches the %s',
      async (_name, species) => {
        const user = userEvent.setup();

        renderKey('/key?k=');

        for (const step of pathTo(species.id)) {
          await user.click(option(step.label));
        }

        // The leaf: the specimen row, linking to its own sheet.
        expect(heading()).toBe('One specimen matches');
        expect(screen.getByRole('link', { name: new RegExp(binomialOf(species)) })).toHaveAttribute(
          'href',
          `/specimen/${species.id}`,
        );
        expect(screen.getByText(/^Keyed out in/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Start over' })).toBeInTheDocument();
      },
    );
  });

  describe('the URL', () => {
    it('restores a key in progress from a link', () => {
      const species = SPECIES[0]!;
      const answers = answersTo(species.id);

      expect(answers.length).toBeGreaterThan(1);

      renderKey(`/key?k=${encodeAnswers(answers.slice(0, 1))}`);

      // One question answered, so the second is the one on screen.
      expect(screen.getByText(/^Question 2 ·/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start over' })).toBeInTheDocument();
    });

    it('restores a finished key from a link', () => {
      const species = SPECIES[0]!;

      renderKey(`/key?k=${encodeAnswers(answersTo(species.id))}`);

      expect(
        screen.getByRole('link', { name: new RegExp(binomialOf(species)) }),
      ).toBeInTheDocument();
    });

    it('lands on a real question when the parameter is junk', () => {
      renderKey('/key?k=zzzz%20%21');

      // A URL is user input. Unreadable answers are dropped and the walk starts
      // where it can, rather than erroring or showing a blank screen.
      expect(screen.getByText(/^Question 1 ·/)).toBeInTheDocument();
    });

    it('keeps the season a shared link was carrying', async () => {
      const user = userEvent.setup();
      const router = renderKey('/key?season=winter');

      await user.click(screen.getByRole('button', { name: 'Start the key' }));

      expect(new URLSearchParams(router.state.location.search).get('season')).toBe('winter');
    });

    it('titles the document with the progress', async () => {
      const user = userEvent.setup();

      renderKey();

      expect(document.title).toMatch(/^Identify ·/);

      await user.click(screen.getByRole('button', { name: 'Start the key' }));

      await waitFor(() => {
        expect(document.title).toContain('question 1');
      });
    });
  });

  describe('going back', () => {
    it('returns to the previous question', async () => {
      const user = userEvent.setup();
      const species = SPECIES[0]!;

      renderKey(`/key?k=${encodeAnswers(answersTo(species.id).slice(0, 1))}`);

      expect(screen.getByText(/^Question 2 ·/)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Back' }));

      expect(screen.getByText(/^Question 1 ·/)).toBeInTheDocument();
    });

    it('leaves the key from the first question', async () => {
      const user = userEvent.setup();

      renderKey('/key?k=');
      await user.click(screen.getByRole('button', { name: 'Back' }));

      // Back from question one is the intro, not a dead end.
      expect(screen.getByRole('button', { name: 'Start the key' })).toBeInTheDocument();
    });

    it('makes every answer a history entry the browser can undo', async () => {
      const user = userEvent.setup();
      const router = renderKey('/key?k=');
      const first = TREE.kind === 'question' ? TREE : undefined;
      const branch = first!.branches.find((candidate) => candidate.node.kind === 'question');

      await user.click(option(branch!.option.label));
      expect(screen.getByText(/^Question 2 ·/)).toBeInTheDocument();

      // The browser's own button, not ours: answering pushes rather than
      // replaces, which is the only reason this works.
      await router.navigate(-1);

      await waitFor(() => {
        expect(screen.getByText(/^Question 1 ·/)).toBeInTheDocument();
      });
    });

    it('starts over from a leaf', async () => {
      const user = userEvent.setup();
      const router = renderKey(`/key?k=${encodeAnswers(answersTo(SPECIES[0]!.id))}`);

      await user.click(screen.getByRole('button', { name: 'Start over' }));

      expect(screen.getByText(/^Question 1 ·/)).toBeInTheDocument();
      expect(new URLSearchParams(router.state.location.search).get('k')).toBe('');
    });
  });
});
