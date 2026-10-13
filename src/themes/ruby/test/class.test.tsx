import { describe, expect, it } from 'vitest'
import { renderText } from '../../../core/testing'
import { rubyClass, rubyInterface } from '../class'

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
