import { TSESLint } from '@typescript-eslint/utils'
import { render } from 'preact-render-to-string'
import { describe, expect, it } from 'vitest'
import { Render, Verbatim, compose, createCtx, createMemoryProgram } from '../../../core'
import { htmlToText, lostComments, nodeLibs, renderHtml, renderText, samples } from '../../../core/testing'
import { typescript } from '..'
import { typescriptEquality } from '../equality'
import { typescriptReadingConfig } from '../eslint'

const show = (source: string) => renderText(source, typescript.transforms)

describe('typescript strict equality reading', () => {
  it('shortens both strict operators, including null and undefined comparisons', () => {
    expect(show('a === b && c !== d;\nx === null || y !== undefined;')).toBe(
      'a == b && c != d;\nx == null || y != undefined;\n',
    )
  })

  it.each(['==', '!='])('preserves every comparison when the file contains %s', (operator) => {
    const source = `a === b;\nx ${operator} null;\nc !== d;`
    expect(show(source)).toBe(source + '\n')
    expect(renderHtml(source, typescript.transforms)).not.toContain('data-reading=')
  })

  it.each([
    'function later() { return x == null; }',
    'const later = () => x != y;',
    'class C { method() { return x == y; } }',
    'if (false) { x != y; }',
    'const template = `${x == y}`;',
  ])('checks nested and later code before simplifying earlier operators: %s', (later) => {
    const source = `a === b;\n${later}\nc !== d;`
    // Use only the equality transform to keep the assertion independent of layout.
    expect(renderText(source, [typescriptEquality])).toBe(source)
  })

  it('ignores operator-like text in comments, strings, templates, and regex literals', () => {
    const source = '// == !=\n/* === !== */\nconst text = "== !=";\nconst template = `== !=`;\nconst pattern = /==|!=/;\na === b;'
    expect(renderText(source, [typescriptEquality])).toBe(source.replace('a === b;', 'a == b;'))
    expect(lostComments(source, typescript.transforms)).toEqual([])
  })

  it('simplifies comparisons inside template expressions', () => {
    expect(show('const text = `${a === b} ${c !== d}`;')).toBe('text = `${a == b} ${c != d}`;\n')
  })

  it('preserves comments beside either operator', () => {
    const source = 'a /* left */ === /* right */ b;\nc // before\n!== // after\nd;'
    expect(show(source)).toBe('a /* left */ == /* right */ b;\nc // before\n!= // after\nd;\n')
    expect(lostComments(source, typescript.transforms)).toEqual([])
  })

  it('marks the strict operator for hover with its original identity', () => {
    const html = renderHtml('a === b', typescript.transforms)
    expect(html).toContain('data-reading="Strict comparison:')
    expect(html).toContain('data-node="EqualsEqualsEqualsToken@1-5">==</span>')
    expect(renderHtml('a !== b', typescript.transforms)).toContain('data-node="ExclamationEqualsEqualsToken@1-5">!=</span>')
  })

  it('keeps the file guard separate from imports, switch layout, and other operators', () => {
    const source = "import { f } from 'pkg';\na === b && x == y;\nswitch (x) { case 1: f(); break; }\na <= b; c >= d; e = f;"
    expect(show(source)).toBe('a === b && x == y;\nswitch (x) {\n  1 => f();\n}\na <= b;\nc >= d;\ne = f;\n')
  })

  it('decides per source file in a shared program and leaves the source AST intact', () => {
    const files = { 'strict.ts': 'a === b; c !== d;', 'loose.ts': 'a === b; c != d;' }
    const program = createMemoryProgram(files, nodeLibs)
    const resolve = compose(() => Verbatim, [typescriptEquality])
    const renderFile = (name: string) => {
      const ctx = createCtx(program, name, resolve)
      return htmlToText(render(<Render node={ctx.sourceFile} ctx={ctx} />))
    }
    expect(renderFile('strict.ts')).toBe('a == b; c != d;')
    expect(renderFile('loose.ts')).toBe(files['loose.ts'])
    expect(renderFile('strict.ts')).toBe('a == b; c != d;')
    expect(renderText('a === b;', [typescriptEquality])).toBe('a == b;')
    expect(renderText('a === b; c == d;', [typescriptEquality])).toBe('a === b; c == d;')
    for (const [name, source] of Object.entries(files)) {
      const file = program.getSourceFile(name)!
      expect(file.text).toBe(source)
      const ctx = createCtx(program, name, () => Verbatim)
      expect(htmlToText(render(<Render node={file} ctx={ctx} />))).toBe(source)
    }
  })
})

describe('typescript reading ESLint preset', () => {
  const linter = new TSESLint.Linter()
  const config = [{ ...typescriptReadingConfig, files: ['**/*.ts'] }]
  const lint = (source: string) => linter.verify(source, config, { filename: 'example.ts' })

  it.each(['a == b;', 'a != b;', 'x == null;', 'x != null;', 'x == undefined;', "typeof x == 'string';", '1 == 1;'])('forbids loose equality without exceptions: %s', (source) => {
    expect(lint(source)).toEqual([expect.objectContaining({ ruleId: 'eqeqeq', severity: 2 })])
    const mixed = `a === b;\n${source}\nc !== d;`
    expect(show(mixed)).toBe(mixed + '\n')
  })

  it('accepts strict comparisons and keeps the switch rule enabled', () => {
    expect(lint('a === b; c !== d; x === null; y !== null;')).toEqual([])
    expect(lint('switch (x) { case 1: f(); default: g(); }')).toEqual([
      expect.objectContaining({ ruleId: 'dress/switch-reading' }),
    ])
  })

  it('retains original comparison spellings even when lint is disabled', () => {
    const source = '/* eslint-disable eqeqeq */\na === b;\nx == null;\nc !== d;'
    expect(lint(source)).toEqual([])
    expect(show(source)).toBe(source + '\n')
  })

  it.each(samples())('accepts the demo samples under the combined contract', (source) => {
    expect(lint(source)).toEqual([])
  })
})
