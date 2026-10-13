import { Verbatim, semanticIdentifiers, type Theme } from '../../core'
import { typescriptSourceFile } from './sourceFile'
import { typescriptBlock } from './block'
import { typescriptArrow, typescriptFunction } from './function'
import { typescriptClass } from './class'
import { typescriptIf } from './if'
import { typescriptDoWhile, typescriptFor, typescriptForEach, typescriptWhile } from './loop'
import { typescriptCase, typescriptCaseBlock, typescriptSwitch } from './switch'
import { typescriptCatch, typescriptTry } from './try'
import { typescriptEnum, typescriptEnumMember } from './enum'

/** TypeScript laid out for reading, with top-level imports available on hover. */
export const typescript: Theme = {
  name: 'typescript',
  transforms: [
    typescriptSourceFile,
    typescriptFunction,
    typescriptArrow,
    typescriptClass,
    typescriptIf,
    typescriptWhile,
    typescriptDoWhile,
    typescriptForEach,
    typescriptFor,
    typescriptSwitch,
    typescriptCaseBlock,
    typescriptCase,
    typescriptTry,
    typescriptCatch,
    typescriptEnum,
    typescriptEnumMember,
    typescriptBlock,
    semanticIdentifiers,
    () => () => Verbatim,
  ],
}
