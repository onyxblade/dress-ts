import { describe, expect, it } from 'vitest'
import { renderText } from '../../../core/testing'
import { rubyIf } from '../if'

const show = (text: string) => renderText(text, [rubyIf])

describe('rubyIf', () => {
  it('lays out an if as if ... end, condition without parens', () => {
    expect(show('if (x) {\n  y\n}')).toBe('if x\n  y\nend\n')
  })

  it('indents a single-statement body the same as a block', () => {
    expect(show('if (x) return 0')).toBe('if x\n  return 0\nend\n')
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

  it('nests designed ifs', () => {
    expect(show('if (a) {\n  if (b) {\n    x\n  }\n}')).toBe('if a\n  if b\n    x\n  end\nend\n')
  })

  it('does not look at the original layout', () => {
    expect(show('if (\n  a\n) { x }')).toBe('if a\n  x\nend\n')
  })
})
