import { describe, expect, it } from 'vitest'
import { lostComments, renderHtml, renderText } from '../../../core/testing'
import { rubyFallback } from '../fallback'
import { rubyFunction } from '../function'
import { rubyClass } from '../class'
import { rubyNew } from '../new'
import { rubySourceFile } from '../sourceFile'

const show = (text: string) => renderText(text, [rubySourceFile, rubyFunction, rubyClass, rubyNew, rubyFallback])

describe('squareTypeLists', () => {
  it('writes the lists of designed components in square brackets', () => {
    expect(show('function f<T, U>(a: T): U {}')).toBe('def f[T, U](a: T): U\nend\n')
    expect(show('class A<T> extends B<T> {}')).toBe('class A[T] extends B[T]\nend\n')
    expect(show('new Map<string, number>()')).toBe('Map[string, number].new()\n')
  })

  it('respells the delimiters of a verbatim type reference, nested lists each on their own', () => {
    expect(show('let s: Set<string>')).toBe('let s: Set[string]\n')
    expect(show('let m: Map<string, Set<string>>')).toBe('let m: Map[string, Set[string]]\n')
    expect(show('let p: Pick<Options, K | "a">')).toBe('let p: Pick[Options, K | "a"]\n')
  })

  it('respells type parameters on kinds nobody has designed', () => {
    expect(show('type Pair<T> = [T, T]')).toBe('type Pair[T] = [T, T]\n')
    expect(show('interface I<T extends object = {}> {\n  m<U>(x: U): T;\n}')).toBe('interface I[T extends object = {}] {\n  m[U](x: U): T\n}\n')
    expect(show('const id = <T,>(x: T) => x')).toBe('const id = [T,](x: T) => x\n')
    expect(show('type F = <T>(x: T) => T')).toBe('type F = [T](x: T) => T\n')
  })

  it('respells the type arguments of a call', () => {
    expect(show('f<string>(x)')).toBe('f[string](x)\n')
    expect(show('a?.f<string>(x)')).toBe('a?.f[string](x)\n')
  })

  it('composes with the dropped semicolon on one node', () => {
    expect(show('type Pair<T> = [T, T];')).toBe('type Pair[T] = [T, T]\n')
  })

  it('keeps comments and the original layout inside a verbatim list', () => {
    expect(show('let s: Set</* c */ string /* d */>')).toBe('let s: Set[/* c */ string /* d */]\n')
    expect(show('let m: Map<\n  string,\n  number\n>')).toBe('let m: Map[\n  string,\n  number\n]\n')
    expect(lostComments('let s: Set</* c */ string // d\n>', [rubyFallback])).toEqual([])
  })

  it('marks a respelled node as a reading, its brackets as the theme\'s words', () => {
    const html = renderHtml('let s: Set<string>', [rubyFallback])
    expect(html).toContain('data-reading="`Set&lt;string>` reads as `Set[string]`" data-node="TypeReference@6-18"')
    expect(html).toContain('<span class="edit">[</span>')
    expect(html).toContain('<span class="edit">]</span>')
  })

  it('leaves other angle brackets alone', () => {
    expect(show('const b = a < b && c > d')).toBe('const b = a < b && c > d\n')
    expect(show('const n = x as unknown as T')).toBe('const n = x as unknown as T\n')
  })
})
