import { describe, expect, it } from 'vitest'
import { lostComments, renderHtml, renderText } from '../../../core/testing'
import { rubyModifier } from '../modifiers'
import { rubyFunction } from '../function'
import { rubyClass } from '../class'
import { rubyFallback } from '../fallback'

const transforms = [rubyClass, rubyFunction, rubyModifier, rubyFallback]
const show = (text: string) => renderText(text, transforms)

describe('noise modifiers', () => {
  it('leaves visibility and readonly out of a node shown verbatim', () => {
    expect(show('interface A {\n  readonly root: string\n}')).toBe('interface A {\n  root: string\n}')
    expect(show('type A = { readonly a: 1; readonly b: 2 }')).toBe('type A = { a: 1; b: 2 }')
    expect(show('class A {\n  private static x = 1\n}')).toBe('class A\n  static x = 1\nend\n')
    expect(show('class A {\n  constructor(public readonly o: object, private p = 1) {}\n}')).toBe(
      'class A\n  def constructor(o: object, p = 1)\n  end\nend\n',
    )
    expect(show('class A {\n  private constructor() {}\n  protected get x() { return 1 }\n}')).toBe(
      'class A\n  def constructor()\n  end\n  get x() { return 1 }\nend\n',
    )
  })

  it('leaves them out of a designed component too', () => {
    expect(show('class A {\n  private m() {}\n  public static async n() {}\n}')).toBe(
      'class A\n  def m()\n  end\n  static async def n()\n  end\nend\n',
    )
    expect(show('export abstract class A {}')).toBe('export abstract class A\nend\n')
  })

  it('keeps the readonly type operator, which is not a modifier', () => {
    expect(show('let x: readonly string[]')).toBe('let x: readonly string[]')
  })

  it('keeps a comment after the modifier', () => {
    expect(show('interface A {\n  readonly /* c */ root: string\n}')).toBe('interface A {\n  /* c */ root: string\n}')
    expect(show('class A {\n  private /* c */ m() {}\n}')).toBe('class A\n  /* c */ def m()\n  end\nend\n')
    expect(lostComments('class A {\n  private // c\n  m() {}\n}', transforms)).toEqual([])
    expect(lostComments('class A {\n  constructor(private // c\n  p = 1) {}\n}', transforms)).toEqual([])
  })

  it('marks the node the modifier was left out of', () => {
    expect(renderHtml('interface A {\n  readonly root: string\n}', transforms)).toContain(
      'data-reading="`private readonly x` reads as `x`" data-node="PropertySignature@13-37">',
    )
  })
})
