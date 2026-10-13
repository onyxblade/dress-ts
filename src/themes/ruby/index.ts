import { semanticIdentifiers, type Theme } from '../../core'
import { rubySourceFile } from './sourceFile'
import { rubyFunction } from './function'
import { rubyClass } from './class'
import { rubyIf } from './if'
import { rubyNew } from './new'
import { rubyFallback } from './fallback'

/**
 * TypeScript read with Ruby's eyes. Identifiers carry their role from the
 * checker; the theme's own fallback takes whatever is left.
 */
export const ruby: Theme = {
  name: 'ruby',
  transforms: [rubySourceFile, rubyFunction, rubyClass, rubyIf, rubyNew, semanticIdentifiers, rubyFallback],
}
