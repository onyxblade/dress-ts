import { describe, expect, it } from 'vitest'
import { renderText } from '../../../core/testing'
import { rubyFunction } from '../function'

const show = (text: string) => renderText(text, [rubyFunction])

describe('rubyFunction', () => {
  it('replaces the function keyword and the braces', () => {
    expect(show('function f() {\n  return 1\n}')).toBe('def f()\n  return 1\nend')
  })

  it('keeps modifiers, comments and spacing around the keyword', () => {
    expect(show('// hi\nexport async function* g() {\n}')).toBe('// hi\nexport async def* g()\nend')
  })

  it('separates end from an empty body', () => {
    expect(show('function f() {}')).toBe('def f() end')
  })

  it('keeps a comment that sat before the opening brace', () => {
    expect(show('function f() /* c */ {}')).toBe('def f() /* c */ end')
  })

  it('leaves nested blocks and object literals alone', () => {
    expect(show('function f() {\n  if (x) { y }\n  return { a: 1 }\n}')).toBe(
      'def f()\n  if (x) { y }\n  return { a: 1 }\nend',
    )
  })

  it('applies to function expressions too', () => {
    expect(show('const f = function () {}')).toBe('const f = def () end')
  })

  it('leaves overload signatures without a body alone', () => {
    expect(show('function f(): void;')).toBe('def f(): void;')
  })

  it('leaves identifiers named function-ish alone', () => {
    expect(show('const functional = 1')).toBe('const functional = 1')
  })
})
