import { describe, expect, it } from 'vitest'
import { renderText } from '../../../core/testing'
import { rubyDoWhile, rubyFor, rubyForEach, rubyWhile } from '../loop'
import { rubyVariables } from '../variables'
import { rubyIf } from '../if'
import { rubyFallback } from '../fallback'

const show = (text: string) => renderText(text, [rubyWhile, rubyDoWhile, rubyForEach, rubyFor, rubyVariables, rubyIf, rubyFallback])

describe('rubyWhile', () => {
  it('lays out a while as while ... end, condition without parens', () => {
    expect(show('while (x) {\n  y()\n}')).toBe('while x\n  y()\nend\n')
  })

  it('reads a braceless one-statement body in modifier form', () => {
    expect(show('while (i < n) i++')).toBe('i++ while i < n')
    expect(show('while (x) continue;')).toBe('continue while x')
  })

  it('keeps the block form when the author wrote braces, or the body is not guard-like', () => {
    expect(show('while (x) { y() }')).toBe('while x\n  y()\nend\n')
    expect(show('while (a) if (b) x()')).toBe('while a\n  x() if b\nend\n')
  })

  it('keeps comments and blank-line groups inside the body', () => {
    expect(show('while (x) { // c\n  y() // t\n\n  z()\n}')).toBe('while x\n  // c\n  y() // t\n\n  z()\nend\n')
  })
})

describe('rubyDoWhile', () => {
  it('lays out a do-while as begin ... end while x', () => {
    expect(show('do {\n  y()\n} while (x);')).toBe('begin\n  y()\nend while x\n')
  })

  it('keeps a comment between the body and the while on the end line', () => {
    expect(show('do { y() } // c\nwhile (x)')).toBe('begin\n  y()\nend while x // c\n')
  })
})

describe('rubyForEach', () => {
  it('lays out a for-of as for x of xs ... end, the keyword gone with the parens', () => {
    expect(show('for (const x of xs) {\n  f(x)\n}')).toBe('for x of xs\n  f(x)\nend\n')
    expect(show('for (let [k, v] of m) {}')).toBe('for [k, v] of m\nend\n')
  })

  it('keeps in, await and an expression initializer as written', () => {
    expect(show('for (const k in o) {}')).toBe('for k in o\nend\n')
    expect(show('for await (const x of xs) {}')).toBe('for await x of xs\nend\n')
    expect(show('for (x of xs) {}')).toBe('for x of xs\nend\n')
  })

  it('gives a braceless body its own line', () => {
    expect(show('for (const x of xs) f(x);')).toBe('for x of xs\n  f(x)\nend\n')
  })
})

describe('rubyFor', () => {
  it('reads a clauseless for as loop do ... end', () => {
    expect(show('for (;;) {\n  x()\n}')).toBe('loop do\n  x()\nend\n')
  })

  it('keeps the header of a three-clause for, parens and all, the let gone', () => {
    expect(show('for (let i = 0; i < n; i++) {\n  f(i)\n}')).toBe('for (i = 0; i < n; i++)\n  f(i)\nend\n')
    expect(show('for (i = 0, j = n; i < j; i++, j--) {}')).toBe('for (i = 0, j = n; i < j; i++, j--)\nend\n')
  })

  it('writes an empty clause as nothing', () => {
    expect(show('for (; i < n;) {}')).toBe('for (; i < n;)\nend\n')
    expect(show('for (;; i++) {}')).toBe('for (;; i++)\nend\n')
  })

  it('nests loops and an if', () => {
    expect(show('while (a) {\n  for (const x of xs) {\n    if (x) break\n  }\n}')).toBe(
      'while a\n  for x of xs\n    break if x\n  end\nend\n',
    )
  })
})
