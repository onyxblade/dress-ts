import { describe, expect, it } from 'vitest'
import { renderText } from '../../../core/testing'
import { rubyFunction } from '../function'

const show = (text: string) => renderText(text, [rubyFunction])

describe('rubyFunction', () => {
  it('lays out a function as def ... end', () => {
    expect(show('function f() {\n  return 1\n}')).toBe('def f()\n  return 1\nend\n')
  })

  it('keeps modifiers, generator star, type parameters and return type', () => {
    expect(show('export async function* g<T, U>(a: T, b?: U): void {}')).toBe(
      'export async def *g<T, U>(a: T, b?: U): void\nend\n',
    )
  })

  it('does not look at the original layout of the header', () => {
    expect(show('function f(\n  a,\n  b\n) {}')).toBe('def f(a, b)\nend\n')
  })

  it('keeps comments in the body', () => {
    expect(show('function f() {\n  // one\n  a() // two\n\n  b()\n}')).toBe(
      'def f()\n  // one\n  a() // two\n\n  b()\nend\n',
    )
  })

  it('shows undesigned nested statements verbatim, re-indented', () => {
    expect(show('function f() {\n    if (x) {\n      y\n    }\n}')).toBe('def f()\n  if (x) {\n    y\n  }\nend\n')
  })

  it('renders an overload signature without end', () => {
    expect(show('function f(): void;')).toBe('def f(): void')
  })

  it('continues the line as an expression', () => {
    expect(show('const f = function () {}')).toBe('const f = def ()\nend\n')
  })

  it('leaves identifiers named function-ish alone', () => {
    expect(show('const functional = 1')).toBe('const functional = 1')
  })
})
