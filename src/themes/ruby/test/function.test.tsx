import { describe, expect, it } from 'vitest'
import { renderText } from '../../../core/testing'
import { rubyFunction } from '../function'

const show = (text: string) => renderText(text, [rubyFunction])

describe('rubyFunction', () => {
  it('replaces the function keyword', () => {
    expect(show('function f() {}')).toBe('def f() {}')
  })

  it('keeps modifiers, comments and spacing around the keyword', () => {
    expect(show('// hi\nexport async function* g() {}')).toBe('// hi\nexport async def* g() {}')
  })

  it('applies to function expressions too', () => {
    expect(show('const f = function () {}')).toBe('const f = def () {}')
  })

  it('leaves identifiers named function-ish alone', () => {
    expect(show('const functional = 1')).toBe('const functional = 1')
  })
})
