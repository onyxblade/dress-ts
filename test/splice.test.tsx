import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { render } from 'preact-render-to-string'
import { Render, Splice, compose, createCtx } from '../src/core'

function parse(text: string) {
  return ts.createSourceFile('x.ts', text, ts.ScriptTarget.Latest, true)
}

function renderFaithful(text: string) {
  const sf = parse(text)
  const ctx = createCtx(sf, compose(() => Splice, []))
  return render(<Render node={sf} ctx={ctx} />)
}

function stripTags(html: string) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

describe('Splice', () => {
  it('reproduces the sample file verbatim', () => {
    const text = readFileSync(new URL('../src/sample.ts', import.meta.url), 'utf8')
    expect(stripTags(renderFaithful(text))).toBe(text)
  })

  it('reproduces tricky syntax verbatim', () => {
    const text = [
      '@dec() class A { @prop() x = 1; #priv?: string; static { A.x } }',
      'const t = `a ${1 + 2} b ${`nested ${3}`}`',
      'type F = <T,>(x: T) => T extends infer U ? U : never',
      'enum E { A = 1 << 0, B = A | 2 }',
      'label: for (const [k, v] of Object.entries({})) { continue label }',
      'export default abstract class {}',
      'declare module "m" { export function f(): void }',
      'let x = a satisfies B as unknown as C!',
      '',
    ].join('\n')
    expect(stripTags(renderFaithful(text))).toBe(text)
  })

  it('tags every node with its SyntaxKind', () => {
    const html = renderFaithful('const a = 1')
    expect(html).toContain('data-kind="SourceFile"')
    expect(html).toContain('data-kind="VariableStatement"')
    expect(html).toContain('data-kind="NumericLiteral"')
  })
})
