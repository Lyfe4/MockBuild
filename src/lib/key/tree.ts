import type { Species } from '@/types';

import type { KeyAnswer } from './answers';
import { KEY_TRAITS, traitValue, type KeyOption, type KeyTrait } from './traits';

/**
 * Building a dichotomous key out of the records, rather than writing one.
 *
 * The archive holds eight species and will hold more, and every one of them
 * carries six machine-readable characters for exactly this. So the key is
 * *derived*: at each node it asks the question that best separates the species
 * still in play, and it keeps asking until one is left. Nothing here knows what
 * a stag beetle is.
 *
 * ## Which question to ask
 *
 * The one that tells you the most, measured as information gain — the entropy
 * of the species still in play, less the entropy left after the split, weighted
 * by how many species land in each answer. That is the textbook decision-tree
 * criterion and it does the obvious right thing: a question that separates
 * eight species into eight groups is worth more than one that separates them
 * into two of four, and a question every remaining species answers the same way
 * is worth nothing and is not asked.
 *
 * It has a known bias, and it is worth naming rather than working around: gain
 * favours questions with many answers, so a key built this way tends to open
 * with a wide question — colour, for the current collection — rather than the
 * two-way split the word "dichotomous" suggests. That is the honest consequence
 * of asking for the shortest key. Gain *ratio*, which penalises breadth, would
 * trade a shorter key for narrower screens, and if that is ever wanted it is a
 * change to `informationGain` and to nothing else.
 *
 * Ties go to the earliest trait in `KEY_TRAITS`. That is the whole of the
 * determinism guarantee: the same records in the same order always produce the
 * same tree, which is what lets a key in progress live in a URL.
 *
 * ## What a leaf is
 *
 * One species, normally. Two or more when they answer every question the same
 * way — which the collection is allowed to contain, and which the key has to
 * say out loud rather than pick a winner. A leaf with several species in it is a
 * true statement about the archive's characters, not a failure of the key.
 */

/** A question, and where each answer leads. */
export interface KeyQuestion {
  readonly kind: 'question';
  readonly trait: KeyTrait;
  /** The species still in play at this point. */
  readonly species: readonly Species[];
  /** One per answer that any remaining species gives. Others are omitted. */
  readonly branches: readonly KeyBranch[];
}

/** The end of the walk: one species, or several that cannot be told apart. */
export interface KeyLeaf {
  readonly kind: 'leaf';
  readonly species: readonly Species[];
}

export type KeyNode = KeyQuestion | KeyLeaf;

export interface KeyBranch {
  readonly option: KeyOption;
  readonly node: KeyNode;
}

/** One question answered, as the page reads it back out. */
export interface KeyStep {
  readonly trait: KeyTrait;
  readonly option: KeyOption;
}

/** Where a walk got to, and what it took to get there. */
export interface KeyPosition {
  readonly node: KeyNode;
  /** The questions answered, in order. `steps.length` is how far in we are. */
  readonly steps: readonly KeyStep[];
  /**
   * The answers actually used, which is what the URL should say.
   *
   * A prefix of what was passed in: an answer that does not fit the question at
   * its point in the walk ends it, and everything after it is dropped.
   */
  readonly answers: readonly KeyAnswer[];
}

/** The remaining species by the answer they give to one trait. */
function groupBy(species: readonly Species[], trait: KeyTrait): Map<string, Species[]> {
  const groups = new Map<string, Species[]>();

  for (const one of species) {
    const value = traitValue(one, trait.id);
    const group = groups.get(value);

    if (group === undefined) groups.set(value, [one]);
    else group.push(one);
  }

  return groups;
}

/**
 * How much this question tells you about these species.
 *
 * Zero when every remaining species answers it the same way, which is the case
 * that must never be asked: a question with one answer is a screen a reader has
 * to tap through to learn nothing.
 */
function informationGain(species: readonly Species[], trait: KeyTrait): number {
  const total = species.length;

  if (total === 0) return 0;

  const sizes = [...groupBy(species, trait).values()].map((group) => group.length);

  // Telling one species from n others is log2(n) bits of work, because every
  // species is its own outcome and they are equally likely — there is no prior
  // over the collection and inventing one would be a claim about which animal a
  // visitor is holding. After the split, a group of `size` still costs
  // log2(size), weighted by the chance of landing in it.
  const after = sizes.reduce((sum, size) => sum + (size / total) * Math.log2(size), 0);

  return Math.log2(total) - after;
}

/** The best question to ask, or nothing when no question separates anything. */
function chooseTrait(
  species: readonly Species[],
  available: readonly KeyTrait[],
): KeyTrait | undefined {
  let best: KeyTrait | undefined;
  let bestGain = 0;

  for (const trait of available) {
    const gain = informationGain(species, trait);

    // Strictly greater, so a tie leaves the earlier trait in place. This is
    // where the tree's determinism comes from.
    if (gain > bestGain) {
      best = trait;
      bestGain = gain;
    }
  }

  return best;
}

function build(species: readonly Species[], available: readonly KeyTrait[]): KeyNode {
  if (species.length <= 1) return { kind: 'leaf', species };

  const trait = chooseTrait(species, available);

  // Nothing left to ask that separates them: they share every character the key
  // knows about, and the leaf says so by holding both.
  if (trait === undefined) return { kind: 'leaf', species };

  const groups = groupBy(species, trait);
  const rest = available.filter((candidate) => candidate !== trait);

  return {
    kind: 'question',
    trait,
    species,
    // In the trait's own option order, and only the answers something gives:
    // offering "eyespots" when nothing left has any is offering a dead end.
    branches: trait.options.flatMap((option) => {
      const group = groups.get(option.value);

      return group === undefined ? [] : [{ option, node: build(group, rest) }];
    }),
  };
}

/**
 * The key for a collection.
 *
 * @param species Every species the key should be able to reach.
 * @param traits Which questions it may ask. Defaults to all of them; a subset
 *   is how a test asks what the key does with less to work with.
 */
export function buildKey(
  species: readonly Species[],
  traits: readonly KeyTrait[] = KEY_TRAITS,
): KeyNode {
  return build(species, traits);
}

/**
 * Walking a key with a list of answers.
 *
 * Every answer is checked against the question actually being asked, not just
 * against the vocabulary: a link built against an older collection can name a
 * real trait and a real value and still not answer the question at that point
 * in the tree. Where that happens the walk stops there and the rest of the
 * answers are dropped, so a stale link lands a reader on a real question rather
 * than at a leaf reached by a path the key no longer contains.
 */
export function advance(tree: KeyNode, answers: readonly KeyAnswer[]): KeyPosition {
  const steps: KeyStep[] = [];
  const used: KeyAnswer[] = [];
  let node = tree;

  for (const answer of answers) {
    if (node.kind !== 'question') break;
    if (node.trait.id !== answer.trait) break;

    const branch = node.branches.find(({ option }) => option.value === answer.value);

    if (branch === undefined) break;

    steps.push({ trait: node.trait, option: branch.option });
    used.push(answer);
    node = branch.node;
  }

  return { node, steps, answers: used };
}

/**
 * The most questions this key can ask before it reaches a leaf.
 *
 * The number that says whether the key is usable: a reader will answer four
 * questions and not eight. Pinned by a test, which prints it, so a species that
 * makes the key deeper says so at the moment it is added.
 */
export function keyDepth(node: KeyNode): number {
  if (node.kind === 'leaf') return 0;

  return 1 + Math.max(...node.branches.map((branch) => keyDepth(branch.node)));
}
