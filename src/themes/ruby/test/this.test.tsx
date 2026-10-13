import { describe, expect, it } from 'vitest'
import { lostComments, renderHtml, renderText } from '../../../core/testing'
import { rubyInstanceVariable, rubyThis } from '../this'
import { rubyModifier } from '../modifiers'
import { rubyFallback } from '../fallback'

const show = (text: string) => renderText(text, [rubyInstanceVariable, rubyThis, rubyModifier, rubyFallback])

const cls = (body: string) => `class A {\n  x = 1\n  get size() { return 0 }\n  m() {\n    ${body}\n  }\n}`

describe('rubyThis', () => {
  it('reads this as self', () => {
    expect(show(cls('return this'))).toBe(cls('return self'))
  })

  it('leaves the this type and a parameter named this alone', () => {
    expect(show('class A {\n  f(): this { return this }\n}')).toBe('class A {\n  f(): this { return self }\n}')
    expect(show('function f(this: A) { return this }')).toBe('function f(this: A) { return self }')
  })
})

describe('rubyInstanceVariable', () => {
  it('reads a field of the receiver as an instance variable', () => {
    expect(show(cls('return this.x'))).toBe(cls('return @x'))
    expect(show(cls('this.x = 2'))).toBe(cls('@x = 2'))
    expect(show(cls('return this.x.y'))).toBe(cls('return @x.y'))
    expect(show(cls('this.x.add(1)'))).toBe(cls('@x.add(1)'))
  })

  it('reads a parameter property as a field', () => {
    const src = 'class A {\n  constructor(public readonly o: object) {}\n  m() { return this.o }\n}'
    expect(show(src)).toBe(src.replace('this.o', '@o').replace('public readonly ', ''))
  })

  it('keeps a method or an accessor on self, since @m() is not a call', () => {
    expect(show(cls('this.m()'))).toBe(cls('self.m()'))
    expect(show(cls('return this.size'))).toBe(cls('return self.size'))
  })

  it('keeps a this the checker cannot place on self', () => {
    expect(show('function f() { return this.x }')).toBe('function f() { return self.x }')
  })

  it('keeps an optional chain and a private name on self', () => {
    expect(show(cls('return this?.x'))).toBe(cls('return self?.x'))
    expect(show('class A {\n  #p = 1\n  m() { return this.#p }\n}')).toBe('class A {\n  #p = 1\n  m() { return self.#p }\n}')
  })

  it('keeps a comment inside the access', () => {
    expect(show(cls('return this./* c */x'))).toBe(cls('return /* c */ @x'))
    expect(show(cls('return this/* c */.x'))).toBe(cls('return /* c */ @x'))
    expect(lostComments(cls('return this. // c\n    x'), [rubyInstanceVariable, rubyThis, rubyFallback])).toEqual([])
  })

  it('marks the access as a reading, the @ as the theme\'s word', () => {
    const html = renderHtml('class A {\n  x = 1\n  m() { return this.x }\n}', [rubyInstanceVariable])
    expect(html).toContain('data-reading="`this.x` reads as `@x`" data-node="PropertyAccessExpression@32-39">@<span')
  })
})
