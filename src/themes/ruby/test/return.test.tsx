import { describe, expect, it } from 'vitest'
import { lostComments, renderHtml, renderText } from '../../../core/testing'
import { rubyFunction } from '../function'
import { rubyLastReturn } from '../return'
import { rubyClass } from '../class'
import { rubyIf } from '../if'

describe('rubyLastReturn', () => {
  const transforms = [rubyFunction, rubyLastReturn]
  const show = (text: string) => renderText(text, transforms)

  it('reads the last return x of a function as x', () => {
    expect(show('function f() {\n  a()\n  return x\n}')).toBe('def f()\n  a()\n  x\nend\n')
  })

  it('keeps an earlier return, one inside a block and a bare one', () => {
    expect(show('function f() {\n  if (x) return 1\n  if (y) { return 2 }\n  return 3\n}')).toBe(
      'def f()\n  if (x) return 1\n  if (y) { return 2 }\n  3\nend\n',
    )
    expect(show('function f() {\n  a()\n  return\n}')).toBe('def f()\n  a()\n  return\nend\n')
  })

  it('reads a method and a function expression the same way, not an arrow function', () => {
    expect(renderText('class A {\n  m() {\n    return 1\n  }\n}', [...transforms, rubyClass])).toBe(
      'class A\n  def m()\n    1\n  end\nend\n',
    )
    expect(show('const f = function () {\n  return 1\n}')).toBe('const f = def ()\n  1\nend\n')
    expect(show('const f = () => {\n  return 1\n}')).toBe('const f = () => {\n  return 1\n}')
  })

  it('keeps comments around the keyword', () => {
    const src = 'function f() {\n  // above\n  return /* c */ x // t\n}'
    expect(show(src)).toBe('def f()\n  // above\n  /* c */ x // t\nend\n')
    expect(lostComments(src, transforms)).toEqual([])
  })

  it('marks the return statement', () => {
    expect(renderHtml('function f() {\n  return x\n}', transforms)).toContain(
      'data-reading="`return x` as the last line reads as `x`, the value of the line" data-node="ReturnStatement@14-25"',
    )
  })
})

describe('UndefinedReturn', () => {
  const show = (text: string) => renderText(text, [rubyFunction, rubyLastReturn, rubyIf])

  it('follows a last line that is not a return with undefined', () => {
    expect(show('function f() {\n  a()\n  b()\n}')).toBe('def f()\n  a()\n  b()\n  undefined\nend\n')
  })

  it('adds nothing to an empty body, a constructor or a last throw', () => {
    expect(show('function f() {}')).toBe('def f()\nend\n')
    expect(show('function f() {\n  // only a comment\n}')).toBe('def f()\n  // only a comment\nend\n')
    expect(show('function f() {\n  throw new Error()\n}')).toBe('def f()\n  throw new Error()\nend\n')
    expect(renderText('class A {\n  constructor() {\n    a()\n  }\n}', [rubyFunction, rubyLastReturn, rubyClass])).toBe(
      'class A\n  def constructor()\n    a()\n  end\nend\n',
    )
  })

  it('adds nothing after an if whose branches all leave, but does after a guard', () => {
    expect(show('function f() {\n  if (x) {\n    return 1\n  } else {\n    throw e\n  }\n}')).toBe(
      'def f()\n  if x\n    return 1\n  else\n    throw e\n  end\nend\n',
    )
    expect(show('function f() {\n  if (x) return 1\n}')).toBe('def f()\n  return 1 if x\n  undefined\nend\n')
  })

  it('comes after the comments that close the body', () => {
    expect(show('function f() {\n  a()\n\n  // dangling\n}')).toBe('def f()\n  a()\n\n  // dangling\n  undefined\nend\n')
  })

  it('marks the line with the last statement', () => {
    expect(renderHtml('function f() {\n  a()\n}', [rubyFunction])).toContain(
      'data-reading="a last line that is not a `return` gets `undefined` after it: the function returns that, where Ruby would return the line" data-node="ExpressionStatement@14-20"',
    )
  })
})
