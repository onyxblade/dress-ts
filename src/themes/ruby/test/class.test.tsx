import { describe, expect, it } from 'vitest'
import { renderText } from '../../../core/testing'
import { rubyClass } from '../class'

const show = (text: string) => renderText(text, [rubyClass])

describe('rubyClass', () => {
  it('replaces the class braces', () => {
    expect(show('class A {\n  x = 1\n}')).toBe('class A\n  x = 1\nend')
  })

  it('keeps heritage clauses and type parameters', () => {
    expect(show('export class A<T> extends B implements C {}')).toBe('export class A<T> extends B implements C end')
  })

  it('leaves member bodies alone', () => {
    expect(show('class A {\n  m() { return {} }\n}')).toBe('class A\n  m() { return {} }\nend')
  })

  it('applies to class expressions', () => {
    expect(show('const A = class {}')).toBe('const A = class end')
  })
})
