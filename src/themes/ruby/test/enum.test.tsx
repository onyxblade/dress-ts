import { describe, expect, it } from 'vitest'
import { renderText } from '../../../core/testing'
import { rubyEnum } from '../enum'

const show = (text: string) => renderText(text, [rubyEnum])

describe('rubyEnum', () => {
  it('lays out an enum as enum ... end, a member per line and no commas', () => {
    expect(show('enum E {\n  A = 1,\n  B,\n  C = "c",\n}')).toBe('enum E\n  A = 1\n  B\n  C = "c"\nend\n')
  })

  it('keeps export, declare and const', () => {
    expect(show('export const enum E { A }')).toBe('export const enum E\n  A\nend\n')
    expect(show('declare enum E {}')).toBe('declare enum E\nend\n')
  })

  it('keeps comments, after a comma included, and blank-line groups', () => {
    expect(show('enum E {\n  // first\n  A = 1, // one\n\n  B, // two\n  // last\n}')).toBe(
      'enum E\n  // first\n  A = 1 // one\n\n  B // two\n  // last\nend\n',
    )
  })
})
