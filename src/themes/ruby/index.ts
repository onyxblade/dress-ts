import { semanticIdentifiers, type Theme } from '../../core'
import { rubySourceFile } from './sourceFile'
import { rubyFunction } from './function'
import { rubyClass, rubyExtends, rubyInterface } from './class'
import { rubyIf } from './if'
import { rubyNew } from './new'
import { rubyInstanceVariable, rubyThis } from './this'
import { rubyField } from './field'
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
  transforms: [rubySourceFile, rubyFunction, rubyClass, rubyInterface, rubyExtends, rubyIf, rubyNew, rubyVariables, rubyField, rubyInstanceVariable, rubyThis, rubyModifier, rubyTypeParameter, rubyEquality, semanticIdentifiers, rubyFallback],
}
