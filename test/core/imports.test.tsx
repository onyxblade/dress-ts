import ts from 'typescript'
import { render } from 'preact-render-to-string'
import { describe, expect, it } from 'vitest'
import { ImportInfo, createMemoryProgram, importOf, importsOf } from '../../src/core'
import { nodeLibs } from '../../src/core/testing'

const library = 'export default class Default {}\nexport function run() {}\nexport interface Item { value: number }\nexport const nested = { run };'

function origin(source: string, name: string): string | undefined {
  const program = createMemoryProgram({ 'x.ts': source, 'lib.ts': library }, nodeLibs)
  const file = program.getSourceFile('x.ts')!
  let found: ts.Identifier | undefined
  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node) && node.text === name) found = node
    ts.forEachChild(node, visit)
  }
  visit(file)
  return found && importOf(found, program.getTypeChecker())?.getText(file)
}

describe('importOf', () => {
  it('finds the original named import, including its alias', () => {
    const declaration = "import { run as execute } from './lib'"
    expect(origin(`${declaration}\nexecute()`, 'execute')).toBe(declaration)
  })

  it('finds default imports and preserves import attributes', () => {
    const declaration = 'import data from "./data.json" with { type: "json" };'
    expect(origin(`${declaration}\ndata`, 'data')).toBe(declaration)
  })

  it('keeps both forms of type-only imports', () => {
    for (const declaration of ["import type { Item } from './lib'", "import { type Item } from './lib'"]) {
      expect(origin(`${declaration}\nconst x: Item = { value: 1 }`, 'Item')).toBe(declaration)
    }
  })

  it('finds namespace imports on the qualifier, a member, and a qualified type', () => {
    const declaration = "import * as lib from './lib'"
    expect(origin(`${declaration}\nlib.run()`, 'lib')).toBe(declaration)
    expect(origin(`${declaration}\nlib.run()`, 'run')).toBe(declaration)
    expect(origin(`${declaration}\nlib.nested.run()`, 'run')).toBe(declaration)
    expect(origin(`${declaration}\nlet item: lib.Item`, 'Item')).toBe(declaration)
  })

  it('finds import-equals declarations', () => {
    const declaration = "import lib = require('./lib')"
    expect(origin(`${declaration}\nlib.run()`, 'run')).toBe(declaration)
  })

  it('still knows the source of an unresolved module', () => {
    const declaration = "import { readFile } from 'node:fs/promises'"
    expect(origin(`${declaration}\nreadFile('x')`, 'readFile')).toBe(declaration)
  })

  it('uses the value symbol for shorthand properties and local re-exports', () => {
    const declaration = "import { run } from './lib'"
    expect(origin(`${declaration}\nconst actions = { run }`, 'run')).toBe(declaration)
    expect(origin(`${declaration}\nexport { run as execute }`, 'execute')).toBe(declaration)
  })

  it('does not mistake shadowed names or unrelated properties for imported symbols', () => {
    const declaration = "import { run } from './lib'"
    expect(origin(`${declaration}\nfunction local(run: number) { return run }`, 'run')).toBeUndefined()
    expect(origin(`${declaration}\nconst local = { run: 1 }; local.run`, 'run')).toBeUndefined()
    expect(origin("import * as lib from './lib'; function f(lib: { run: number }) { return lib.run }", 'run')).toBeUndefined()
  })

  it('reports the module imported by this file instead of following a re-export to another source', () => {
    const declaration = "import { run } from './barrel'"
    const program = createMemoryProgram({ 'x.ts': `${declaration}\nrun()`, 'barrel.ts': "export { run } from './lib'", 'lib.ts': library }, nodeLibs)
    const file = program.getSourceFile('x.ts')!
    const use = file.statements[1] as ts.ExpressionStatement
    expect(importOf((use.expression as ts.CallExpression).expression, program.getTypeChecker())?.getText(file)).toBe(declaration)
  })
})

describe('import overview', () => {
  it('includes side effects, empty bindings, and unused imports in source order, excluding dynamic imports and re-exports', () => {
    const source = "import './setup';\nimport {} from './register';\nimport unused from './lib';\nimport lib = require('./lib');\nexport { run } from './lib';\nconst lazy = import('./lib');\ntype Item = import('./lib').Item"
    const file = ts.createSourceFile('x.ts', source, ts.ScriptTarget.Latest, true)
    expect(importsOf(file).map((node) => node.getText(file))).toEqual([
      "import './setup';", "import {} from './register';", "import unused from './lib';", "import lib = require('./lib');",
    ])
  })

  it('shows complete original declarations as escaped text', () => {
    const source = 'import {\n  run as execute, // reason\n  type Item\n} from "<module>";'
    const file = ts.createSourceFile('x.ts', source, ts.ScriptTarget.Latest, true)
    const html = render(<ImportInfo imports={importsOf(file)} />)
    expect(html).toContain('run as execute, // reason\n  type Item')
    expect(html).toContain('&lt;module')
    expect(html).not.toContain('<module>')
    expect(html).toContain('class="import-declaration"')
  })
})
