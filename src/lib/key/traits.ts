import {
  ANTENNA_FORMS,
  BODY_SHAPES,
  COLOUR_FAMILIES,
  MARKING_FORMS,
  SIZE_CLASSES,
  WING_COVERS,
  type AntennaForm,
  type BodyShape,
  type ColourFamily,
  type MarkingForm,
  type Morphology,
  type SizeClass,
  type Species,
  type WingCover,
} from '@/types';

/**
 * The questions an identification key can ask, and the words it asks them in.
 *
 * One trait per `Morphology` field, and nothing else: the whole point of the
 * key is that it is *derived*, so a species is reachable the moment its record
 * exists and no branch is written per animal. A hand-written key is a second
 * description of the collection, and the one that drifts is always the one
 * nobody re-reads.
 *
 * ## Two vocabularies
 *
 * The record speaks in character states — `lamellate`, `hemelytra` — because a
 * closed union is what a filter and a validator can work with. A visitor
 * holding a beetle does not know what a lamella is, and asking them is asking
 * them to already know the answer. So every state carries a label written for
 * somebody looking at the animal: what they would *see*, not what it is called.
 *
 * The labels are `Record<Union, string>` rather than a lookup with a fallback,
 * so adding a character state to `src/types/species.ts` fails the build here
 * until it has been given words. That is the same trick `describePlate` uses,
 * and for the same reason: an unlabelled state would otherwise reach a reader
 * as a raw slug.
 *
 * ## Order
 *
 * `KEY_TRAITS` is in the order `Morphology` declares its fields, which is also
 * the order the specimen sheet lists them. It is load-bearing in one narrow
 * way: `buildKey` breaks a tie in information gain by taking the earliest trait
 * in this list, so the array's order is what makes the tree deterministic.
 * Reordering it is allowed and will silently produce a different — equally
 * valid — key.
 */

/** Which morphology fields the key may ask about: all of them. */
export const KEY_TRAIT_IDS = [
  'wingCover',
  'antennae',
  'markings',
  'bodyShape',
  'sizeClass',
  'colourFamily',
] as const satisfies readonly (keyof Morphology)[];

export type KeyTraitId = (typeof KEY_TRAIT_IDS)[number];

/** One answer a reader can give: the state, and how it is offered to them. */
export interface KeyOption {
  /** The `Morphology` value this answer means. */
  readonly value: string;
  /** What the reader is shown. Written for somebody looking at the animal. */
  readonly label: string;
}

/** One question, with every answer the collection's vocabulary allows. */
export interface KeyTrait {
  readonly id: KeyTraitId;
  /** Asked as a question, in the second person, about what can be seen. */
  readonly question: string;
  /** In the declaring order of the union, which is what makes a key stable. */
  readonly options: readonly KeyOption[];
}

const WING_COVER_LABELS: Record<WingCover, string> = {
  elytra: 'Hard cases meeting in a line',
  hemelytra: 'Part-hardened, tips clear',
  scaled: 'Scaled, patterned wings',
  membranous: 'Clear membrane wings',
  absent: 'No wings visible',
};

const ANTENNA_LABELS: Record<AntennaForm, string> = {
  filiform: 'Plain threads, the same all the way',
  clavate: 'Thickening to a club at the tip',
  lamellate: 'Ending in a stack of flat plates',
  serrate: 'Saw-toothed along one edge',
  bipectinate: 'Feathered, combed on both sides',
  setaceous: 'Two short bristles, easily missed',
};

const MARKING_LABELS: Record<MarkingForm, string> = {
  none: 'Nothing — one plain colour',
  spots: 'Round spots',
  bands: 'Bands across the body',
  stripes: 'Stripes running head to tail',
  eyespots: 'Eyespots, ringed like an eye',
};

const BODY_SHAPE_LABELS: Record<BodyShape, string> = {
  elongate: 'Long, with roughly parallel sides',
  oval: 'Oval, like an egg from above',
  round: 'Almost circular, domed',
  slender: 'Slender and narrow-bodied',
};

/**
 * The brackets, with something to hold them against.
 *
 * The millimetres are in the label because "medium" is not a size anybody can
 * check, and the everyday comparison is there because a reader with the animal
 * in front of them has no ruler either.
 */
const SIZE_CLASS_LABELS: Record<SizeClass, string> = {
  tiny: 'Under 5 mm — a grain of rice or less',
  small: '5 to 15 mm — up to a fingernail',
  medium: '15 to 30 mm — up to a thumb joint',
  large: 'Over 30 mm — longer than a thumb joint',
};

const COLOUR_LABELS: Record<ColourFamily, string> = {
  black: 'Black',
  'dark brown': 'Dark brown',
  'reddish brown': 'Reddish or chestnut brown',
  red: 'Red',
  tan: 'Tan or straw',
  yellow: 'Yellow',
  cream: 'Cream or off-white',
  green: 'Green',
  grey: 'Grey',
  metallic: 'Metallic, with a green or bronze sheen',
};

function trait<T extends string>(
  id: KeyTraitId,
  question: string,
  values: readonly T[],
  labels: Record<T, string>,
): KeyTrait {
  return {
    id,
    question,
    options: values.map((value) => ({ value, label: labels[value] })),
  };
}

export const KEY_TRAITS: readonly KeyTrait[] = [
  trait('wingCover', 'What covers the back?', WING_COVERS, WING_COVER_LABELS),
  trait('antennae', 'What do the antennae look like?', ANTENNA_FORMS, ANTENNA_LABELS),
  trait('markings', 'What pattern is on the back?', MARKING_FORMS, MARKING_LABELS),
  trait('bodyShape', 'What shape is it, seen from above?', BODY_SHAPES, BODY_SHAPE_LABELS),
  trait('sizeClass', 'How long is the body?', SIZE_CLASSES, SIZE_CLASS_LABELS),
  trait('colourFamily', 'What colour is it, overall?', COLOUR_FAMILIES, COLOUR_LABELS),
];

/** One trait by id, or `undefined` if the key does not ask about it. */
export function findTrait(id: string): KeyTrait | undefined {
  return KEY_TRAITS.find((candidate) => candidate.id === id);
}

/**
 * What this species answers to this question.
 *
 * A read straight off the record — the key never stores a species' answers, so
 * editing a record changes the key and cannot leave a stale copy behind.
 */
export function traitValue(species: Species, id: KeyTraitId): string {
  return species.morphology[id];
}
