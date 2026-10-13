import { describe, expect, it } from 'vitest'
import { lostComments, renderHtml, renderText } from '../../../core/testing'
import { rubyNew } from '../new'
import { rubyIf } from '../if'

const show = (text: string) => renderText(text, [rubyNew])

describe('rubyNew', () => {
  it('reads construction as a message to the class', () => {
    expect(show('new Foo(a, b)')).toBe('Foo.new(a, b)')
    expect(show('new Foo()')).toBe('Foo.new()')
  })

  it('leaves the parens out when the source has none', () => {
    expect(show('new Foo')).toBe('Foo.new')
  })

  it('keeps type arguments on the class', () => {
    expect(show('new Set<string>()')).toBe('Set<string>.new()')
    expect(show('new Map<string, number>(entries)')).toBe('Map<string, number>.new(entries)')
  })

  it('keeps a qualified or parenthesized class expression', () => {
    expect(show('new a.b.C(1)')).toBe('a.b.C.new(1)')
    expect(show('new (f())(1)')).toBe('(f()).new(1)')
  })

  it('nests, in arguments and in other designed components', () => {
    expect(show('new Foo(new Bar())')).toBe('Foo.new(Bar.new())')
    expect(renderText('if (!x) throw new Error("no")', [rubyIf, rubyNew])).toBe('throw Error.new("no") if !x')
  })

  it('keeps comments on the arguments inline', () => {
    expect(show('new Foo(a /* a */, b /* b */)')).toBe('Foo.new(a /* a */, b /* b */)')
    expect(lostComments('new Foo(/* a */ a, // b\n  b)', [rubyNew])).toEqual([])
  })

  it('does not look at the original layout', () => {
    expect(show('new Foo(\n  a,\n  b,\n)')).toBe('Foo.new(a, b)')
  })

  it('carries the identity of the expression it was laid out for', () => {
    expect(renderHtml('new Foo()', [rubyNew])).toContain('data-node="NewExpression@0-9"')
  })
})
