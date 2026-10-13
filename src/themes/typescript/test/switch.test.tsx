import ts from 'typescript'
import { TSESLint } from '@typescript-eslint/utils'
import { describe, expect, it } from 'vitest'
import { allComments, nodeId } from '../../../core'
import { htmlToText, lostComments, renderHtml, renderText, samples } from '../../../core/testing'
import { typescript } from '..'
import { analyzeSwitch, type SwitchIssue } from '../switchAnalysis'
import { switchReadingConfig } from '../eslint'

const show = (source: string) => renderText(source, typescript.transforms)

const accepted = [
  'switch (x) {}',
  'switch (x) { case 1: f(); break; default: g(); }',
  'switch (x) { case 1: case 2: f(); break; case 3: case 4: }',
  'switch (x) { case 1: { const x = 1; f(x); break; } default: { let x = 2; g(x); } }',
  'switch (x) { case 1: return a; default: throw e; }',
  'switch (x) { case 1: if (a) { return b; } else { throw c; } default: f(); }',
  'while (x) { switch (x) { case 1: continue; default: break; } }',
  'outer: while (x) { switch (x) { case 1: continue outer; default: break; } }',
  'switch (x) { case 1: while (y) { if (z) break; } break; default: f(); }',
  'switch (x) { case 1: switch (y) { case 2: f(); break; } break; default: g(); }',
  'switch (x) { case 1: run(() => { while (y) { break; } }); break; default: f(); }',
  'switch (x) { case -1: case +2: case -3n: case true: case false: case null: case `a`: case ("b"): f(); }',
  'switch (x) { case 1: try { f(); } finally { g(); } break; default: h(); }',
  'switch (x) { case 1: { type T = number; class C {} enum E { A } } break; default: f(); }',
  'switch (x) { default: }',
]

const rejected: { source: string; kind: SwitchIssue['kind'] }[] = [
  { source: 'switch (x) { case 1: f(); case 2: g(); }', kind: 'fallthrough' },
  { source: 'switch (x) { case 1: f(); /* falls through */ case 2: g(); }', kind: 'fallthrough' },
  { source: 'switch (x) { case 1: if (a) return b; default: f(); }', kind: 'fallthrough' },
  { source: 'switch (x) { case 1: if (a) return b; else f(); default: g(); }', kind: 'fallthrough' },
  { source: 'switch (x) { case 1: while (a) { break; } default: g(); }', kind: 'fallthrough' },
  { source: 'switch (x) { case 1: try { return a; } catch { f(); } default: g(); }', kind: 'fallthrough' },
  { source: 'switch (x) { case 1: switch (y) { case 2: return a; } default: g(); }', kind: 'fallthrough' },
  { source: 'switch (x) { case f(): break; }', kind: 'label' },
  { source: 'switch (x) { case E.A: break; }', kind: 'label' },
  { source: 'switch (x) { case undefined: break; }', kind: 'label' },
  { source: 'switch (x) { case /a/: break; }', kind: 'label' },
  { source: 'switch (x) { case `a${x}`: break; }', kind: 'label' },
  { source: 'switch (x) { default: f(); break; case 1: g(); }', kind: 'defaultPosition' },
  { source: 'switch (x) { case 1: default: f(); }', kind: 'defaultGroup' },
  { source: 'switch (x) { case 1: const y = 1; break; default: f(y); }', kind: 'declaration' },
  { source: 'switch (x) { case 1: class C {} break; }', kind: 'declaration' },
  { source: 'switch (x) { case 1: function f() {} break; }', kind: 'declaration' },
  { source: 'switch (x) { case 1: type T = number; break; }', kind: 'declaration' },
  { source: 'switch (x) { case 1: var y = 1; break; }', kind: 'declaration' },
  { source: 'switch (x) { case 1: if (a) break; f(); break; default: g(); }', kind: 'break' },
  { source: 'switch (x) { case 1: { if (a) break; f(); break; } default: g(); }', kind: 'break' },
  { source: 'switch (x) { case 1: try { f(); } finally { break; } default: g(); }', kind: 'break' },
  { source: 'outer: while (x) { switch (x) { case 1: break outer; default: f(); } }', kind: 'break' },
]

function firstSwitch(source: string): ts.SwitchStatement {
  const file = ts.createSourceFile('x.ts', source, ts.ScriptTarget.Latest, true)
  function find(node: ts.Node): ts.SwitchStatement | undefined {
    return ts.isSwitchStatement(node) ? node : ts.forEachChild(node, find)
  }
  return find(file)!
}

describe('switch reading contract', () => {
  it.each(accepted)('accepts %s', (source) => {
    const node = firstSwitch(source)
    const clauses = node.caseBlock.clauses
    const statements = clauses.map((clause) => clause.statements)
    expect(analyzeSwitch(node).supported).toBe(true)
    expect(node.caseBlock.clauses).toBe(clauses)
    clauses.forEach((clause, index) => expect(clause.statements).toBe(statements[index]))
    expect(node.getSourceFile().text).toBe(source)
  })

  it.each(rejected)('rejects $kind: $source', ({ source, kind }) => {
    const analysis = analyzeSwitch(firstSwitch(source))
    expect(analysis.supported).toBe(false)
    if (!analysis.supported) expect(analysis.issues.map((issue) => issue.kind)).toContain(kind)
    expect(show(source)).toContain('case ')
    const html = renderHtml(source, typescript.transforms)
    const readings = [...html.matchAll(/<span class="reading"[^>]*data-node="([^"]+)"/g)].map((match) => match[1])
    expect(readings).not.toContain(nodeId(firstSwitch(source)))
  })
})

describe('dress/switch-reading ESLint rule', () => {
  const linter = new TSESLint.Linter()
  const config = [{ ...switchReadingConfig, files: ['**/*.ts'] }]
  const lint = (source: string) => linter.verify(source, config, { filename: 'example.ts' })

  it.each(accepted)('agrees with the renderer on supported syntax: %s', (source) => {
    expect(lint(source)).toEqual([])
  })

  it.each(rejected)('reports $kind at the unsupported node', ({ source, kind }) => {
    const diagnostics = lint(source)
    expect(diagnostics.some((diagnostic) => diagnostic.messageId === kind)).toBe(true)
    expect(diagnostics.every((diagnostic) => diagnostic.ruleId === 'dress/switch-reading')).toBe(true)
    const analysis = analyzeSwitch(firstSwitch(source))
    if (!analysis.supported) {
      const issues = [...analysis.issues].sort((a, b) => a.node.getStart() - b.node.getStart())
      expect(diagnostics.map((diagnostic) => diagnostic.messageId)).toEqual(issues.map((issue) => issue.kind))
      issues.forEach((issue, index) => {
        const start = issue.node.getSourceFile().getLineAndCharacterOfPosition(issue.node.getStart())
        expect(diagnostics[index].line).toBe(start.line + 1)
        expect(diagnostics[index].column).toBe(start.character + 1)
      })
    }
  })

  it('does not auto-fix fallthrough by changing program behavior', () => {
    const source = rejected[0].source
    const result = linter.verifyAndFix(source, config, { filename: 'example.ts' })
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    expect(result.messages[0].messageId).toBe('fallthrough')
  })

  it('still falls back when lint is disabled', () => {
    const source = '/* eslint-disable dress/switch-reading */\n' + rejected[0].source
    expect(lint(source)).toEqual([])
    expect(show(source)).toContain('case 1:')
    expect(show(source)).not.toContain(' => ')
  })

  it.each(samples())('accepts the opted-in demo samples', (source) => {
    expect(lint(source)).toEqual([])
  })
})

describe('typescript switch arms', () => {
  it('groups labels and omits only the final break', () => {
    expect(show("switch (x) { case 'a': case 'b': f(); break; default: g(); }")).toBe(
      "switch (x) {\n  'a' | 'b' => f();\n  default => g();\n}\n",
    )
  })

  it('keeps return and throw explicit and default spelled out', () => {
    expect(show("switch (x) { case 'a': return 1; default: throw e; }")).toBe(
      "switch (x) {\n  'a' => return 1;\n  default => throw e;\n}\n",
    )
  })

  it('uses the arm braces for a scoped body and keeps declarations', () => {
    expect(show('switch (x) { case 1: { const y = 2; f(y); break; } default: { let y = 3; g(y); } }')).toBe(
      'switch (x) {\n  1 => {\n    y = 2;\n    f(y);\n  }\n  default => {\n    y = 3;\n    g(y);\n  }\n}\n',
    )
  })

  it('keeps empty arms, trailing empty labels, and an empty switch', () => {
    expect(show('switch (x) { case 1: break; case 2: case 3: }')).toBe(
      'switch (x) {\n  1 => {}\n  2 | 3 => {}\n}\n',
    )
    expect(show('switch (x) {}')).toBe('switch (x) {}\n')
  })

  it('keeps nested loop breaks and continues, and can simplify a nested switch independently', () => {
    const shown = show('while (x) { switch (x) { case 1: while (y) { break; } break; default: continue; } }')
    expect(shown.match(/break;/g)).toHaveLength(1)
    expect(shown).toContain('default => continue;')
    const nested = show('switch (f()) { case g(): switch (y) { case 1: return 1; } break; }')
    expect(nested).toContain('case g():')
    expect(nested).toContain('1 => return 1;')
    expect(nested).toContain('break;')
  })

  it('marks the new reading for hover and keeps labels, block identity, and semantic children', () => {
    const source = 'switch (x) { case 1: case 2: { const y = 3; f(y); break; } }'
    const html = renderHtml(source, typescript.transforms)
    const node = firstSwitch(source)
    expect(html).toContain('data-reading="Independent switch arms:')
    expect(html).toContain(`data-node="${nodeId(node)}"`)
    for (const clause of node.caseBlock.clauses) expect(html).toContain(`data-node="${nodeId(clause)}"`)
    expect(html).toContain('data-kind="Block"')
    expect(html).toContain('data-role="value"')
  })

  const commented = [
    ...samples(),
    'switch (/* selector */ x) {\n// one\ncase 1: // first label\n// two\ncase /* before value */ 2: /* second label */\n// body\nf(); // after call\n// before break\nbreak /* in break */; // after break\n// next\ndefault: /* default label */ { /* block start */ g(); /* block end */ } // after block\n// end\n}',
    'switch (x) { case 1: case 2: /* before block */ { /* before f */ f(); /* before break */ break; /* dangling */ } /* after block */ }',
    'switch (x) { case 1: // empty label\ncase 2: // empty arm\n}',
    'switch (x) { default: // empty default\n}',
    'switch (x) { case 1: /* before break */ break /* after break */; }',
    'switch (x) { case 1: // before block\n{ f(); break; } // after block\n}',
    'switch (x) {\ncase 1:\nf();\nbreak;\n\ncase 2:\ng();\n}',
  ]

  it.each(commented.map((source, index) => ({ source, index })))('preserves every comment once and in order: $index', ({ source }) => {
    expect(lostComments(source, typescript.transforms)).toEqual([])
    const html = renderHtml(source, typescript.transforms)
    const comments = [...html.matchAll(/<span class="comment">([\s\S]*?)<\/span>/g)].map((match) => htmlToText(match[1]))
    const file = ts.createSourceFile('x.ts', source, ts.ScriptTarget.Latest, true)
    expect(comments).toEqual(allComments(file).map((comment) => comment.text))
  })
})
