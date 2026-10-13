import type { Theme } from '../../core'
import { rubySourceFile } from './sourceFile'
import { rubyFunction } from './function'
import { rubyClass } from './class'
import { rubyIf } from './if'
import { rubySemicolons } from './semicolon'

/** TypeScript read with Ruby's eyes. */
export const ruby: Theme = {
  name: 'ruby',
  transforms: [rubySourceFile, rubyFunction, rubyClass, rubyIf, rubySemicolons],
}
