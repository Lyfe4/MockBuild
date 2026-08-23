export {
  answerCode,
  answerCodes,
  ANSWER_CODE_LENGTH,
  ANSWER_VOCABULARY_SIZE,
  decodeAnswers,
  encodeAnswers,
  KEY_PARAM,
} from './answers';
export type { KeyAnswer } from './answers';
export { findTrait, KEY_TRAIT_IDS, KEY_TRAITS, traitValue } from './traits';
export type { KeyOption, KeyTrait, KeyTraitId } from './traits';
export {
  advance,
  buildKey,
  keyDepth,
  LAST_RESORT,
  LAST_RESORT_DEPTH,
  TRAIT_PRIORITY,
} from './tree';
export type { KeyBranch, KeyLeaf, KeyNode, KeyPosition, KeyQuestion, KeyStep } from './tree';
