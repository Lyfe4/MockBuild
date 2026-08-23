import type { Species } from '@/types';

import type { KeyAnswer } from './answers';
import { KEY_TRAITS, traitValue, type KeyOption, type KeyTrait, type KeyTraitId } from './traits';

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
 * Gain on its own is not enough, and the first version of this file shipped
 * with the reason: gain favours breadth, colour has more states than anything
 * else, and the key therefore opened by asking a reader to pick their animal's
 * colour out of seven and then keyed most of them out in one more question. Two
 * questions is a wonderfully short key and it did not read as a key at all — it
 * read as a colour menu, which is the one thing an identification key must not
 * be. Colour is also the character a reader is most likely to get wrong: a rose
 * chafer is green, bronze or coppery depending on the beetle and the light, and
 * the animal's *shape* is not a matter of opinion.
 *
 * So gain is weighted by `TRAIT_PRIORITY` — structure ahead of surface — and
 * colour is held back by `LAST_RESORT` until the key genuinely needs it. See
 * both for what each one is doing and why they are two mechanisms rather than
 * one. Gain *ratio* was the other candidate and it fixes only half of this: it
 * would stop colour winning on breadth alone, and would still let it win on a
 * node where it happens to separate cleanly, which is exactly the first screen
 * the old key produced.
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

/**
 * What a trait's gain is worth, relative to the others.
 *
 * A multiplier on information gain, not a sort order: two questions that
 * separate the same species equally well should be decided by which one a
 * visitor can answer more reliably, and a question that separates *much* better
 * should still win. So this is a thumb on the scale rather than a veto.
 *
 * Structure first, in the order a person actually looks at an animal. What
 * covers the back is the character that separates the orders and the one nobody
 * mistakes — hard cases, scaled wings and clear membrane are not a judgement
 * call. Shape and antennae come next because they are properties of the
 * silhouette. Markings and size are further down: a marking can be worn off a
 * specimen, and size needs a comparison a reader in a field does not have.
 *
 * Colour is last and is barely on the scale, because it is the character most
 * likely to be answered wrongly and the one most likely to change under a
 * different light. It also has ten states, which gain rewards on breadth alone;
 * a fifth of the credit is roughly what it takes to stop that. It is held back
 * further by `LAST_RESORT`, and the two do different jobs — see there.
 *
 * Written as a `Record<KeyTraitId, number>` so a new trait fails the build here
 * until somebody has decided how much it is worth. A default would quietly make
 * that decision as "as good as the wing cases".
 */
export const TRAIT_PRIORITY: Record<KeyTraitId, number> = {
  wingCover: 1,
  bodyShape: 0.92,
  antennae: 0.84,
  markings: 0.72,
  sizeClass: 0.6,
  colourFamily: 0.2,
};

/**
 * Traits the key will not ask early, however well they would separate.
 *
 * `TRAIT_PRIORITY` alone cannot make this promise. A weight is a ratio, and
 * there is always some node where colour separates six species cleanly and
 * every structural character separates two — at which point a fifth of a large
 * number beats all of a small one and the reader is asked their animal's colour
 * on the second screen. That is the behaviour the weights were introduced to
 * remove, so it is removed here instead, as a rule rather than a coefficient:
 * below `LAST_RESORT_DEPTH`, a last-resort trait is considered only when no
 * other trait separates anything at all.
 *
 * The escape clause matters as much as the rule. Two species that differ *only*
 * in colour have to be told apart on colour, and a key that refused would
 * either loop or hand back a leaf holding both — a worse answer, and a false
 * one, because the records do distinguish them.
 */
export const LAST_RESORT: readonly KeyTraitId[] = ['colourFamily'];

/**
 * The first depth at which a last-resort trait may be asked by preference.
 *
 * Zero-based, so 2 means "not the first question and not the second, but the
 * third is allowed". Chosen rather than derived: two structural questions is
 * enough for the key to read as a key, and holding colour back further starts
 * costing depth for nothing — a reader would answer four questions about shape
 * to avoid one about colour.
 */
export const LAST_RESORT_DEPTH = 2;

const isLastResort = (trait: KeyTrait): boolean => LAST_RESORT.includes(trait.id);

/**
 * The best question to ask, or nothing when no question separates anything.
 *
 * Two passes rather than one weighted comparison over everything: the
 * structural traits are asked first, and the last-resort ones only get a look in
 * when the first pass came back empty or the walk is already deep enough. See
 * `LAST_RESORT` for why that is a rule and not a bigger penalty.
 */
function chooseTrait(
  species: readonly Species[],
  available: readonly KeyTrait[],
  depth: number,
): KeyTrait | undefined {
  const structural = available.filter((trait) => !isLastResort(trait));
  const early = depth < LAST_RESORT_DEPTH;
  const preferred = best(species, early ? structural : available);

  // Deep enough to ask anything, or something structural still separates them.
  if (!early || preferred !== undefined) return preferred;

  // Nothing structural is left that says anything. Colour it is — this is the
  // case the rule exists to allow rather than to forbid.
  return best(species, available);
}

/** The highest weighted gain among these traits, or nothing if none separates. */
function best(species: readonly Species[], traits: readonly KeyTrait[]): KeyTrait | undefined {
  let winner: KeyTrait | undefined;
  let bestValue = 0;

  for (const trait of traits) {
    const gain = informationGain(species, trait);

    // A question with no gain is not asked whatever it is worth, so the
    // priority is applied to a gain that is already known to be positive.
    if (gain <= 0) continue;

    const value = gain * TRAIT_PRIORITY[trait.id];

    // Strictly greater, so a tie leaves the earlier trait in place. This is
    // where the tree's determinism comes from.
    if (value > bestValue) {
      winner = trait;
      bestValue = value;
    }
  }

  return winner;
}

function build(
  species: readonly Species[],
  available: readonly KeyTrait[],
  depth: number,
): KeyNode {
  if (species.length <= 1) return { kind: 'leaf', species };

  const trait = chooseTrait(species, available, depth);

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

      return group === undefined ? [] : [{ option, node: build(group, rest, depth + 1) }];
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
  return build(species, traits, 0);
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
