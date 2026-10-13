import { describe, expect, it } from 'vitest'
import { lostComments, renderHtml, renderText } from '../../../core/testing'
import { rubyField, rubyParameterProperty } from '../field'
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

  it('reads a public or protected field the same way', () => {
    expect(show(cls('public x = 1'))).toBe(cls('@x = 1'))
    expect(show(cls('protected readonly x = 1'))).toBe(cls('@x = 1'))
  })

  it('leaves a field with any other modifier, a #private or a computed name as written', () => {
    for (const member of [
      'static x = 1',
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

describe('rubyParameterProperty', () => {
  const show = (text: string) => renderText(text, [rubyParameterProperty, rubyFallback])
  const ctor = (params: string) => `class A {\n  constructor(${params}) {}\n}`

  it('reads a parameter property as a field in the signature', () => {
    expect(show(ctor('private readonly tokens: Token[]'))).toBe(ctor('@tokens: Token[]'))
    expect(show(ctor('public state: State = initial'))).toBe(ctor('@state: State = initial'))
    expect(show(ctor('readonly x?: number'))).toBe(ctor('@x?: number'))
    expect(show(ctor('protected a: number, private b = 1'))).toBe(ctor('@a: number, @b = 1'))
  })

  it('keeps an override, and leaves a plain parameter alone', () => {
    expect(show(ctor('override x: number'))).toBe(ctor('override @x: number'))
    expect(show(ctor('public override x: number'))).toBe(ctor('override @x: number'))
    expect(show(ctor('x: number, private y: number'))).toBe(ctor('x: number, @y: number'))
  })

  it('keeps a comment on a modifier', () => {
    expect(show(ctor('private /* c */ readonly x: number'))).toBe(ctor('/* c */ @x: number'))
    expect(lostComments(ctor('private // c\n  x = 1'), [rubyParameterProperty, rubyFallback])).toEqual([])
  })

  it('marks the reading', () => {
    expect(renderHtml(ctor('private x: T'), [rubyParameterProperty, rubyFallback])).toContain(
      'data-reading="`constructor(private x: T)` reads as `constructor(@x: T)`, a field declared in the signature" data-node="Parameter@24-36">@<span',
    )
  })
})
