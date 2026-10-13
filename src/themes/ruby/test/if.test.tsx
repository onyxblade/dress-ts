import { describe, expect, it } from 'vitest'
import { renderText } from '../../../core/testing'
import { rubyIf } from '../if'

const show = (text: string) => renderText(text, [rubyIf])

describe('rubyIf', () => {
  it('lays out an if as if ... end, condition without parens', () => {
    expect(show('if (x) {\n  y\n}')).toBe('if x\n  y\nend\n')
  })

  it('reads a braceless guard in modifier form', () => {
    expect(show('if (x) return 0')).toBe('return 0 if x')
    expect(show('if (!x) throw new Error()')).toBe('throw new Error() if !x')
    expect(show('if (x) f()')).toBe('f() if x')
  })

  it('keeps the block form when the author wrote braces, even around one statement', () => {
    expect(show('if (x) { return 0 }')).toBe('if x\n  return 0\nend\n')
  })

  it('keeps the block form when there is an else or the body is not guard-like', () => {
    expect(show('if (x) return 0\nelse return 1')).toBe('if x\n  return 0\nelse\n  return 1\nend\n')
    expect(show('if (a) if (b) x')).toBe('if a\n  x if b\nend\n')
  })

  it('keeps a trailing comment after the guard', () => {
    expect(show('if (x) return 0 // why')).toBe('return 0 if x // why')
  })

  it('flattens else-if chains into elsif', () => {
    expect(show('if (a) {\n  x\n} else if (b) {\n  y\n} else {\n  z\n}')).toBe(
      'if a\n  x\nelsif b\n  y\nelse\n  z\nend\n',
    )
  })

  it('handles else with a lone statement', () => {
    expect(show('if (a) x\nelse y')).toBe('if a\n  x\nelse\n  y\nend\n')
  })

  it('keeps comments and blank-line groups inside branches', () => {
    expect(show('if (a) {\n  // one\n  x() // two\n\n  y()\n}')).toBe(
      'if a\n  // one\n  x() // two\n\n  y()\nend\n',
    )
  })

  it('nests designed ifs, guards included', () => {
    expect(show('if (a) {\n  if (b) {\n    x\n  }\n  if (c) return\n}')).toBe(
      'if a\n  if b\n    x\n  end\n  return if c\nend\n',
    )
  })

  it('does not look at the original layout', () => {
    expect(show('if (\n  a\n) { x }')).toBe('if a\n  x\nend\n')
  })
})
