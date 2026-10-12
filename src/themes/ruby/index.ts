import type { Theme } from '../../core'
import { rubyFunction } from './function'

/** TypeScript read with Ruby's eyes. */
export const ruby: Theme = {
  name: 'ruby',
  transforms: [rubyFunction],
}
