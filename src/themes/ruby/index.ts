import { semanticIdentifiers, type Theme } from '../../core'
import { rubySourceFile } from './sourceFile'
import { rubyFunction } from './function'
import { rubyLastReturn } from './return'
import { rubyClass, rubyExtends, rubyInterface } from './class'
import { rubyIf } from './if'
import { rubyDoWhile, rubyFor, rubyForEach, rubyWhile } from './loop'
import { rubyEnum } from './enum'
import { rubyNew } from './new'
import { rubyInstanceVariable, rubyThis, rubyThisType } from './this'
import { rubyField, rubyParameterProperty } from './field'
import { rubyModifier } from './modifiers'
import { rubyVariables } from './variables'
import { rubyTypeParameter } from './generics'
import { rubyEquality } from './equality'
import { rubyFallback } from './fallback'

/**
 * TypeScript read with Ruby's eyes. Identifiers carry their role from the
 * checker; the theme's own fallback takes whatever is left.
 */
export const ruby: Theme = {
  name: 'ruby',
  transforms: [rubySourceFile, rubyFunction, rubyLastReturn, rubyClass, rubyInterface, rubyExtends, rubyIf, rubyWhile, rubyDoWhile, rubyForEach, rubyFor, rubyEnum, rubyNew, rubyVariables, rubyField, rubyParameterProperty, rubyInstanceVariable, rubyThis, rubyThisType, rubyModifier, rubyTypeParameter, rubyEquality, semanticIdentifiers, rubyFallback],
}
