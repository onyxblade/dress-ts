import { describe, expect, it } from 'vitest'
import { lostComments, renderHtml, renderText } from '../../../core/testing'
import { rubyField } from '../field'
import { rubyFallback } from '../fallback'

const show = (text: string) => renderText(text, [rubyField, rubyFallback])

const cls = (member: string) => `class A {\n  ${member}\n}`

describe('rubyField', () => {
  it('reads a private readonly field as an instance variable', () => {
    expect(show(cls('private readonly seen = new Set<string>()'))).toBe(cls('@seen = new Set[string]()'))
    expect(show(cls('private x = 1;'))).toBe(cls('@x = 1'))
    expect(show(cls('readonly x = 1'))).toBe(cls('@x = 1'))
    expect(show(cls('x = 1'))).toBe(cls('@x = 1'))
  })

  it('keeps the type, the ? and the !', () => {
    expect(show(cls('private x: number'))).toBe(cls('@x: number'))
    expect(show(cls('private x?: number'))).toBe(cls('@x?: number'))
    expect(show(cls('private x!: number'))).toBe(cls('@x!: number'))
    expect(show(cls('private x: number = 1'))).toBe(cls('@x: number = 1'))
  })

  it('leaves a field with any other modifier, a #private or a computed name as written', () => {
    for (const member of [
      'public x = 1',
      'protected x = 1',
      'static x = 1',
      'private static x = 1',
      'declare x: number',
      'abstract x: number',
      'accessor x = 1',
      '@d x = 1',
      '#x = 1',
      '[k] = 1',
      '"x" = 1',
    ]) {
      expect(show(cls(member))).toBe(cls(member))
    }
  })

  it('keeps a comment on a modifier', () => {
    expect(show(cls('private /* c */ readonly x = 1'))).toBe(cls('/* c */ @x = 1'))
    expect(show(cls('private readonly /* c */ x = 1'))).toBe(cls('/* c */ @x = 1'))
    expect(lostComments(cls('private // c\n  x = 1'), [rubyField, rubyFallback])).toEqual([])
  })

  it('marks the reading', () => {
    expect(renderHtml(cls('private x = 1'), [rubyField, rubyFallback])).toContain(
      'data-reading="`private readonly x = v` reads as `@x = v`" data-node="PropertyDeclaration@9-25">@<span',
    )
  })
})
