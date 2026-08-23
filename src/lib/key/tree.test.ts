import { describe, expect, it } from 'vitest';

import { SPECIES } from '@/data';
import type { Species } from '@/types';

import { KEY_TRAITS, type KeyTraitId } from './traits';
import { advance, buildKey, keyDepth, type KeyNode } from './tree';

/**
 * The key, checked against the real collection and against fixtures.
 *
 * The real collection for the properties that must hold whatever it contains —
 * every species reachable, every question worth asking, the same tree twice.
 * Fixtures for the cases the archive does not happen to contain today: two
 * species that cannot be told apart, and a ninth species arriving.
 *
 * Nothing here asserts which question comes first. That is a consequence of the
 * records and it will change when they do; pinning it would make adding a
 * species a test failure rather than a new leaf.
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

/** Every leaf of a tree, with the questions it took to reach each one. */
function leaves(
  node: KeyNode,
  path: readonly KeyTraitId[] = [],
): { node: KeyNode; path: KeyTraitId[] }[] {
  if (node.kind === 'leaf') return [{ node, path: [...path] }];

  return node.branches.flatMap((branch) => leaves(branch.node, [...path, node.trait.id]));
}

/** A tree as text, for comparing two builds without asserting on the shape. */
function shapeOf(node: KeyNode): string {
  if (node.kind === 'leaf') return `[${node.species.map((one) => one.id).join('+')}]`;

  return `${node.trait.id}(${node.branches
    .map((branch) => `${branch.option.value}:${shapeOf(branch.node)}`)
    .join(',')})`;
}

const TREE = buildKey(SPECIES);

describe('buildKey', () => {
  it('reaches every species in the collection', () => {
    const reached = leaves(TREE).flatMap(({ node }) => node.species.map((one) => one.id));

    expect([...reached].sort()).toStrictEqual([...SPECIES].map((one) => one.id).sort());
  });

  it('is finite: no path asks the same question twice', () => {
    for (const { path } of leaves(TREE)) {
      expect(new Set(path).size, path.join(' → ')).toBe(path.length);
      expect(path.length).toBeLessThanOrEqual(KEY_TRAITS.length);
    }
  });

  it('keys out the whole collection in two questions at most', () => {
    const depth = keyDepth(TREE);

    // Printed as well as asserted: the number is the whole usability question,
    // and a species that makes the key deeper should say so out loud rather
    // than only failing a comparison.
    console.log(
      `key depth: ${String(depth)} questions for ${String(SPECIES.length)} species, ` +
        `${String(leaves(TREE).length)} leaves`,
    );

    // Two, today: colour separates seven of the eight on its own, and the stag
    // beetle and the southern hawker — both dark brown — are told apart on the
    // second. Asserted exactly rather than as a ceiling, so a record that makes
    // the key deeper has to be looked at rather than absorbed.
    expect(depth).toBe(2);
  });

  it('never asks a question with only one answer left', () => {
    const questions = (node: KeyNode): KeyNode[] =>
      node.kind === 'leaf'
        ? []
        : [node, ...node.branches.flatMap((branch) => questions(branch.node))];

    for (const node of questions(TREE)) {
      if (node.kind === 'leaf') continue;

      // A single-branch question is a screen a reader taps through to learn
      // nothing, and it is what an information gain of zero means.
      expect(node.branches.length, node.trait.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('omits the answers no remaining species gives', () => {
    const walk = (node: KeyNode): void => {
      if (node.kind === 'leaf') return;

      for (const branch of node.branches) {
        expect(
          branch.node.species.length,
          `${node.trait.id}=${branch.option.value}`,
        ).toBeGreaterThan(0);
        walk(branch.node);
      }

      // The branches account for everything at this node, and nothing else.
      const inBranches = node.branches.reduce((sum, branch) => sum + branch.node.species.length, 0);

      expect(inBranches).toBe(node.species.length);
      expect(node.branches.length).toBeLessThanOrEqual(node.trait.options.length);
    };

    walk(TREE);
  });

  it('builds the same tree every time', () => {
    // Determinism is what lets a key in progress live in a URL: the same
    // records must produce the same questions in the same order.
    expect(shapeOf(buildKey(SPECIES))).toBe(shapeOf(buildKey(SPECIES)));
  });

  it('breaks a tie by trait order, not by chance', () => {
    // Two species differing in exactly two characters: both questions have the
    // same information gain, and the earlier trait in KEY_TRAITS wins.
    const a = species({ id: 'a' });
    const b = species({
      id: 'b',
      morphology: { ...a.morphology, markings: 'spots', sizeClass: 'small' },
    });
    const tree = buildKey([a, b]);

    expect(tree.kind).toBe('question');
    expect(tree.kind === 'question' && tree.trait.id).toBe('markings');
  });

  it('lists both species in one leaf when they answer everything the same', () => {
    const twin = species({ id: 'twin-a' });
    const other = species({ id: 'twin-b', commonName: 'other test beetle' });
    const tree = buildKey([twin, other]);

    // Allowed, and the key has to say so rather than pick a winner: the two
    // records genuinely agree on every character the key asks about.
    expect(tree.kind).toBe('leaf');
    expect(tree.species.map((one) => one.id)).toStrictEqual(['twin-a', 'twin-b']);
  });

  it('takes a ninth species without a line of code changing', () => {
    const oddity = species({
      id: 'hypothetical-oddity',
      morphology: {
        // A state nothing in the collection has, on every character.
        wingCover: 'absent',
        antennae: 'bipectinate',
        markings: 'eyespots',
        bodyShape: 'slender',
        sizeClass: 'tiny',
        colourFamily: 'grey',
      },
    });
    const grown = buildKey([...SPECIES, oddity]);
    const reached = leaves(grown).flatMap(({ node }) => node.species.map((one) => one.id));

    expect(shapeOf(grown)).not.toBe(shapeOf(TREE));
    expect(reached).toContain('hypothetical-oddity');
    // And it is keyed out on the same six questions everything else uses.
    expect(keyDepth(grown)).toBeLessThanOrEqual(KEY_TRAITS.length);
  });

  it('is a leaf when there is nothing to key out', () => {
    expect(buildKey([]).kind).toBe('leaf');
    expect(buildKey([]).species).toStrictEqual([]);
  });

  it('stops early when it is only allowed the wrong questions', () => {
    // One question, eight species: the key gets as far as that question can
    // take it and leaves the rest in shared leaves rather than looping.
    const narrow = buildKey(
      SPECIES,
      KEY_TRAITS.filter((trait) => trait.id === 'sizeClass'),
    );

    expect(keyDepth(narrow)).toBe(1);
    expect(leaves(narrow).some(({ node }) => node.species.length > 1)).toBe(true);
  });
});

describe('advance', () => {
  it('walks the answers it is given', () => {
    expect(TREE.kind).toBe('question');

    const first = TREE.kind === 'question' ? TREE : undefined;
    const branch = first?.branches[0];

    expect(branch).toBeDefined();

    const position = advance(TREE, [{ trait: first!.trait.id, value: branch!.option.value }]);

    expect(position.node).toBe(branch!.node);
    expect(position.steps).toHaveLength(1);
    expect(position.steps[0]?.option.label).toBe(branch!.option.label);
    expect(position.answers).toHaveLength(1);
  });

  it('stays at the root when given nothing', () => {
    const position = advance(TREE, []);

    expect(position.node).toBe(TREE);
    expect(position.steps).toStrictEqual([]);
  });

  it('stops at an answer to a question it is not being asked', () => {
    const first = TREE.kind === 'question' ? TREE : undefined;
    const other = KEY_TRAITS.find((trait) => trait.id !== first?.trait.id);
    const position = advance(TREE, [{ trait: other!.id, value: other!.options[0]!.value }]);

    // A link built against an older collection can name a real trait and a
    // real state and still not answer the question at that point in the tree.
    expect(position.node).toBe(TREE);
    expect(position.answers).toStrictEqual([]);
  });

  it('stops at a state no remaining species has, and drops what follows', () => {
    const first = TREE.kind === 'question' ? TREE : undefined;
    const offered = new Set(first?.branches.map((branch) => branch.option.value));
    const deadEnd = first?.trait.options.find((option) => !offered.has(option.value));

    expect(deadEnd, 'the first question offers every state, so pick another case').toBeDefined();

    const position = advance(TREE, [
      { trait: first!.trait.id, value: deadEnd!.value },
      { trait: first!.trait.id, value: first!.branches[0]!.option.value },
    ]);

    expect(position.node).toBe(TREE);
    expect(position.answers).toStrictEqual([]);
  });

  it('ignores answers past the leaf', () => {
    // Walk to a leaf, then hand it one more answer.
    let position = advance(TREE, []);

    while (position.node.kind === 'question') {
      const node = position.node;
      const branch = node.branches[0]!;

      position = advance(TREE, [
        ...position.answers,
        { trait: node.trait.id, value: branch.option.value },
      ]);
    }

    const overrun = advance(TREE, [...position.answers, { trait: 'colourFamily', value: 'grey' }]);

    expect(overrun.node).toBe(position.node);
    expect(overrun.answers).toHaveLength(position.answers.length);
  });
});
