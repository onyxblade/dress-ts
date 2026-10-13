import type { Theme } from '../core'
import { ruby } from './ruby'
import { typescript } from './typescript'

/** Every theme the demo page can show. A new theme folder registers itself here. */
export const themes: Theme[] = [ruby, typescript]
