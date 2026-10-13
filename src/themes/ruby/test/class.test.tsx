import { describe, expect, it } from 'vitest'
import { renderText } from '../../../core/testing'
import { rubyClass, rubyExtends, rubyInterface } from '../class'

const show = (text: string) => renderText(text, [rubyClass])

describe('rubyClass', () => {
  it('lays out a class as class ... end', () => {
    expect(show('class A {\n  x = 1\n}')).toBe('class A\n  x = 1\nend\n')
  })

  it('keeps modifiers, type parameters and heritage clauses', () => {
    expect(show('export abstract class A<T> extends B<T> implements C, D {}')).toBe(
      'export abstract class A[T] extends B<T> implements C, D\nend\n',
    )
  })

  it('shows undesigned members verbatim and keeps blank-line groups', () => {
    expect(show('class A {\n  x = 1\n\n  m() {\n    return {}\n  }\n}')).toBe(
      'class A\n  x = 1\n\n  m() {\n    return {}\n  }\nend\n',
    )
  })

  it('handles an anonymous class expression', () => {
    expect(show('const A = class {}')).toBe('const A = class\nend\n')
  })
})

describe('rubyExtends', () => {
  const show = (text: string) => renderText(text, [rubyClass, rubyInterface, rubyExtends])

  it('writes the superclass after <', () => {
    expect(show('class A extends B {}')).toBe('class A < B\nend\n')
  })

  it('keeps type arguments and leaves implements alone', () => {
    expect(show('class A extends B<T> implements C, D {}')).toBe('class A < B<T> implements C, D\nend\n')
  })

  it('takes an interface\'s extends list too', () => {
    expect(show('interface A extends B, C {}')).toBe('interface A < B, C\nend\n')
  })

  it('does not touch a type parameter constraint', () => {
    expect(show('class A<T extends B> {}')).toBe('class A[T extends B]\nend\n')
  })
})

describe('rubyInterface', () => {
  const show = (text: string) => renderText(text, [rubyInterface])

  it('lays out an interface as interface ... end', () => {
    expect(show('interface A {\n  x: number\n}')).toBe('interface A\n  x: number\nend\n')
  })

  it('keeps modifiers, type parameters and heritage clauses', () => {
    expect(show('export interface A<T extends object = {}> extends B<T>, C {}')).toBe(
      'export interface A[T extends object = {}] extends B<T>, C\nend\n',
    )
  })

  it('shows members verbatim and keeps blank-line groups', () => {
    expect(show('interface A {\n  x: number\n\n  m<U>(x: U): T\n  (): void\n}')).toBe(
      'interface A\n  x: number\n\n  m<U>(x: U): T\n  (): void\nend\n',
    )
  })
})
