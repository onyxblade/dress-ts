import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import { Verbatim, claim, type Edit, type NodeProps } from '../../src/core'
import { renderHtml, renderText, samples } from '../../src/core/testing'

describe('Verbatim', () => {
  it('reproduces every sample verbatim', () => {
    for (const text of samples()) expect(renderText(text)).toBe(text)
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

  it('tags each node with an identity that survives a different reading', () => {
    const html = renderHtml('const a = 1')
    expect(html).toContain('data-node="VariableStatement@0-11"')
    expect(html).toContain('data-node="NumericLiteral@9-11"')
  })

  describe('edits', () => {
    const withEdits = <N extends ts.Node>(is: (n: ts.Node) => n is N, edits: (node: N) => Edit[]) =>
      claim(is, (p: NodeProps<N>) => <Verbatim {...p} edits={edits(p.node)} />)
    const gapBefore = (child: ts.Node, text: string) => ({ from: child.getStart() - 3, to: child.getStart(), text, note: 'walrus' })

    it('replace source ranges between children, in position order', () => {
      const declaration = withEdits(ts.isVariableDeclaration, (n) => [gapBefore(n.initializer!, ' := ')])
      const statement = withEdits(ts.isVariableStatement, (n) => [{ from: n.end - 1, to: n.end, text: '', note: 'no `;`' }])
      expect(renderText('const a = 1, b = 2;', [declaration, statement])).toBe('const a := 1, b := 2')
    })

    it('leave an edit that reaches into a child unapplied', () => {
      // `const a = 1` is the declaration list, a child of the statement; an edit over its `const` is not the statement's to make.
      const statement = withEdits(ts.isVariableStatement, (n) => [{ from: n.getStart(), to: n.getStart() + 5, text: 'let', note: 'let' }])
      expect(renderText('const a = 1', [statement])).toBe('const a = 1')
      expect(renderHtml('const a = 1', [statement])).not.toContain('data-reading')
    })

    it('mark the node as a Reading with the notes of the edits applied, and tint the text they wrote', () => {
      const edits = (n: ts.VariableStatement) => [
        { from: n.end - 1, to: n.end, text: '', note: 'no `;`' },
        { from: n.getStart() + 6, to: n.getStart() + 7, text: ' ', note: 'spaced' },
        { from: n.getStart() + 7, to: n.getStart() + 8, text: ' ', note: 'spaced' },
      ]
      const html = renderHtml('export  const a = 1;', [withEdits(ts.isVariableStatement, edits)])
      expect(html).toContain('<span class="reading" data-reading="spaced; no `;`" data-node="VariableStatement@0-20">')
      expect(html).toContain('<span class="edit"> </span>')
    })
  })
})
