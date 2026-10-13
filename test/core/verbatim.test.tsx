import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderHtml, renderText } from '../../src/core/testing'

describe('Verbatim', () => {
  it('reproduces the sample file verbatim', () => {
    const text = readFileSync(new URL('../../src/sample.ts', import.meta.url), 'utf8')
    expect(renderText(text)).toBe(text)
  })

  it('reproduces tricky syntax verbatim', () => {
    const text = [
      '/** leading doc */',
      '@dec() class A { @prop() x = 1; #priv?: string; static { A.x } }',
      'const t = `a ${1 + 2} b ${`nested ${3}`}`',
      'type F = <T,>(x: T) => T extends infer U ? U : never',
      'enum E { A = 1 << 0, B = A | 2 }',
      'label: for (const [k, v] of Object.entries({})) { continue label }',
      'export default abstract class {}',
      'declare module "m" { export function f(): void }',
      'let x = a satisfies B as unknown as C! // trailing',
      '',
    ].join('\n')
    expect(renderText(text)).toBe(text)
  })

  it('tags every node with its SyntaxKind', () => {
    const html = renderHtml('const a = 1')
    expect(html).toContain('data-kind="SourceFile"')
    expect(html).toContain('data-kind="VariableStatement"')
    expect(html).toContain('data-kind="NumericLiteral"')
  })
})
