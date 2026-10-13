import { describe, expect, it } from 'vitest'
import { renderText } from '../../../core/testing'
import { rubyFunction } from '../function'
import { rubyClass } from '../class'

const show = (text: string) => renderText(text, [rubyFunction])

describe('rubyFunction', () => {
  it('lays out a function as def ... end', () => {
    expect(show('function f() {\n  return 1\n}')).toBe('def f()\n  return 1\nend\n')
  })

  it('keeps modifiers, generator star, type parameters and return type', () => {
    expect(show('export async function* g<T, U>(a: T, b?: U): void {}')).toBe(
      'export async def *g<T, U>(a: T, b?: U): void\nend\n',
    )
  })

  it('does not look at the original layout of the header', () => {
    expect(show('function f(\n  a,\n  b\n) {}')).toBe('def f(a, b)\nend\n')
  })

  it('keeps comments in the body', () => {
    expect(show('function f() {\n  // one\n  a() // two\n\n  b()\n}')).toBe(
      'def f()\n  // one\n  a() // two\n\n  b()\nend\n',
    )
  })

  it('shows undesigned nested statements verbatim, re-indented', () => {
    expect(show('function f() {\n    if (x) {\n      y\n    }\n}')).toBe('def f()\n  if (x) {\n    y\n  }\nend\n')
  })

  it('renders an overload signature without end', () => {
    expect(show('function f(): void;')).toBe('def f(): void')
  })

  it('continues the line as an expression', () => {
    expect(show('const f = function () {}')).toBe('const f = def ()\nend\n')
  })

  it('leaves identifiers named function-ish alone', () => {
    expect(show('const functional = 1')).toBe('const functional = 1')
  })
})

describe('rubyFunction on class methods', () => {
  // Inside a designed class, so the method's `end` has an Indent to sit in.
  const inClass = (text: string) => renderText(text, [rubyFunction, rubyClass])

  it('lays out a method as def ... end', () => {
    expect(inClass('class A {\n  m() {\n    return 1\n  }\n}')).toBe('class A\n  def m()\n    return 1\n  end\nend\n')
  })

  it('keeps modifiers, generator star, optional marker, type parameters and return type', () => {
    expect(inClass('class A {\n  static async *m?<T>(a: T): void {}\n}')).toBe(
      'class A\n  static async def *m?<T>(a: T): void\n  end\nend\n',
    )
  })

  it('renders an abstract or overload method without end', () => {
    expect(inClass('abstract class A {\n  abstract m(): void\n}')).toBe('abstract class A\n  abstract def m(): void\nend\n')
  })

  it('leaves constructors and accessors alone', () => {
    expect(inClass('class A {\n  constructor() {}\n  get x() { return 1 }\n}')).toBe(
      'class A\n  constructor() {}\n  get x() { return 1 }\nend\n',
    )
  })
})
