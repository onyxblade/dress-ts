import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import { render } from 'preact-render-to-string'
import { QuickInfo, createMemoryService, quickInfoAt } from '../../src/core'
import { nodeLibs } from '../../src/core/testing'

const FILE = 'x.ts'
const serviceFor = (text: string) => createMemoryService({ [FILE]: text }, nodeLibs)
const shown = (info: ts.QuickInfo | undefined) => info && ts.displayPartsToString(info.displayParts)
/**
 * The range of the token `at` begins with, found in `src`, with the space
 * before it, when there is one, as leading trivia the way a node's range has.
 */
const tokenAt = (src: string, at: string, from = 0) => {
  const start = src.indexOf(at, from)
  return { pos: src[start - 1] === ' ' ? start - 1 : start, end: start + /^\w+/.exec(at)![0].length }
}

describe('quickInfoAt', () => {
  it('describes the token that ends at the position, in declaration form', () => {
    const src = 'const f = (a: number) => a > 0'
    expect(shown(quickInfoAt(serviceFor(src), FILE, tokenAt(src, 'f')))).toBe('const f: (a: number) => boolean')
  })

  it('shows the narrowed type at the point of use', () => {
    const src = 'function g(x: number | null) {\n  if (x === null) return 0\n  return x\n}'
    const service = serviceFor(src)
    expect(shown(quickInfoAt(service, FILE, tokenAt(src, 'x ===')))).toBe('(parameter) x: number | null')
    expect(shown(quickInfoAt(service, FILE, tokenAt(src, 'x', src.lastIndexOf('x'))))).toBe('(parameter) x: number')
  })

  it('answers for keywords that name something, not for punctuation', () => {
    const src = 'class C { m() { return this } }'
    const service = serviceFor(src)
    expect(shown(quickInfoAt(service, FILE, tokenAt(src, 'this')))).toBe('this: this')
    expect(quickInfoAt(service, FILE, { pos: src.length - 1, end: src.length })).toBeUndefined()
  })

  it('is about a token filling the range, not a token the range ends with', () => {
    const src = 'function g(x: number) {\n  return x\n}'
    const service = serviceFor(src)
    const stmt = { pos: src.indexOf('{') + 1, end: src.lastIndexOf('x') + 1 }
    expect(quickInfoAt(service, FILE, stmt)).toBeUndefined()
    expect(shown(quickInfoAt(service, FILE, { pos: stmt.end - 2, end: stmt.end }))).toBe('(parameter) x: number')
  })

  it('carries the documentation and its tags', () => {
    const src = '/** Doubles. @param n the number */\nfunction d(n: number) { return n * 2 }'
    const info = quickInfoAt(serviceFor(src), FILE, tokenAt(src, 'd(n'))!
    expect(ts.displayPartsToString(info.documentation)).toBe('Doubles.')
    expect(info.tags?.map((t) => `${t.name}: ${ts.displayPartsToString(t.text)}`)).toEqual(['param: n the number'])
  })
})

describe('QuickInfo', () => {
  it('lays the parts out tagged by kind, with the documentation', () => {
    const src = '/** Doubles. */\nfunction d(n: number) { return n * 2 }'
    const html = render(<QuickInfo info={quickInfoAt(serviceFor(src), FILE, tokenAt(src, 'd(n'))!} />)
    expect(html).toContain('<span data-part="keyword">function</span>')
    expect(html).toContain('<span data-part="functionName">d</span>')
    expect(html).toContain('<span data-part="parameterName">n</span>')
    expect(html).toContain('<p class="doc">Doubles.</p>')
  })
})
