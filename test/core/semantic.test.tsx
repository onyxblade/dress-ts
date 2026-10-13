import { describe, expect, it } from 'vitest'
import { semanticIdentifiers } from '../../src/core'
import { renderHtml, renderText } from '../../src/core/testing'

const html = (text: string) => renderHtml(text, [semanticIdentifiers])
const roles = (text: string) => [...html(text).matchAll(/data-role="(\w+)">(\w+)</g)].map((m) => `${m[2]}:${m[1]}`)

describe('semanticIdentifiers', () => {
  it('tells type names from value names, at declaration and at use', () => {
    const src = 'interface O { n: number }\ntype A = O\nconst o: O = { n: 1 }\nfunction f<T>(t: T) { return o }\nf(o)'
    expect(roles(src)).toEqual([
      'O:type',
      'n:value',
      'A:type',
      'O:type',
      'o:value',
      'O:type',
      'n:value',
      'f:function',
      'T:type',
      't:value',
      'T:type',
      'o:value',
      'f:function',
      'o:value',
    ])
  })

  it('classes, namespaces and methods have roles of their own', () => {
    expect(roles('class C { m() {} }\nnamespace N {}\nnew C().m()')).toEqual([
      'C:class',
      'm:function',
      'N:namespace',
      'C:class',
      'm:function',
    ])
  })

  it('an import names what it imports, or is unresolved', () => {
    expect(roles("import { x } from 'nowhere'\nx")).toEqual(['x:unresolved', 'x:unresolved'])
  })

  it('changes nothing a reader sees', () => {
    const src = 'const f = (a: number) => a > 0 // "quoted" <b>\n'
    expect(renderText(src, [semanticIdentifiers])).toBe(src)
  })
})
