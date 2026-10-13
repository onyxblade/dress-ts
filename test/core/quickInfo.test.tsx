import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import { render } from 'preact-render-to-string'
import { QuickInfo, createMemoryService, quickInfoAt } from '../../src/core'
import { nodeLibs } from '../../src/core/testing'

const FILE = 'x.ts'
const serviceFor = (text: string) => createMemoryService({ [FILE]: text }, nodeLibs)
const shown = (info: ts.QuickInfo | undefined) => info && ts.displayPartsToString(info.displayParts)

describe('quickInfoAt', () => {
  it('describes the token that ends at the position, in declaration form', () => {
    const src = 'const f = (a: number) => a > 0'
    expect(shown(quickInfoAt(serviceFor(src), FILE, 7))).toBe('const f: (a: number) => boolean')
  })

  it('shows the narrowed type at the point of use', () => {
    const src = 'function g(x: number | null) {\n  if (x === null) return 0\n  return x\n}'
    const service = serviceFor(src)
    expect(shown(quickInfoAt(service, FILE, src.indexOf('x ===') + 1))).toBe('(parameter) x: number | null')
    expect(shown(quickInfoAt(service, FILE, src.lastIndexOf('x') + 1))).toBe('(parameter) x: number')
  })

  it('answers for keywords that name something, not for punctuation', () => {
    const src = 'class C { m() { return this } }'
    const service = serviceFor(src)
    expect(shown(quickInfoAt(service, FILE, src.indexOf('this') + 4))).toBe('this: this')
    expect(quickInfoAt(service, FILE, src.length)).toBeUndefined()
  })

  it('is about the whole token, not a token that merely ends there', () => {
    // The call `f()` ends at `)`; the range of the call is not the range of any token.
    expect(quickInfoAt(serviceFor('function f() {}\nf()'), FILE, 19)).toBeUndefined()
  })

  it('carries the documentation and its tags', () => {
    const src = '/** Doubles. @param n the number */\nfunction d(n: number) { return n * 2 }'
    const info = quickInfoAt(serviceFor(src), FILE, src.indexOf('d(n') + 1)!
    expect(ts.displayPartsToString(info.documentation)).toBe('Doubles.')
    expect(info.tags?.map((t) => `${t.name}: ${ts.displayPartsToString(t.text)}`)).toEqual(['param: n the number'])
  })
})

describe('QuickInfo', () => {
  it('lays the parts out tagged by kind, with the documentation', () => {
    const src = '/** Doubles. */\nfunction d(n: number) { return n * 2 }'
    const html = render(<QuickInfo info={quickInfoAt(serviceFor(src), FILE, src.indexOf('d(n') + 1)!} />)
    expect(html).toContain('<span data-part="keyword">function</span>')
    expect(html).toContain('<span data-part="functionName">d</span>')
    expect(html).toContain('<span data-part="parameterName">n</span>')
    expect(html).toContain('<p class="doc">Doubles.</p>')
  })
})
