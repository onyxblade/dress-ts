import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import { Verbatim, compose, createCtx, createMemoryProgram } from '../../src/core'
import { nodeLibs, programFor, renderText } from '../../src/core/testing'

describe('createMemoryProgram', () => {
  it('binds the file against the compiler libs, with nothing on disk', () => {
    const program = programFor('const s = new Set<string>()')
    const checker = program.getTypeChecker()
    const decl = (program.getSourceFile('x.ts')!.statements[0] as ts.VariableStatement).declarationList.declarations[0]
    expect(checker.typeToString(checker.getTypeAtLocation(decl.name))).toBe('Set<string>')
  })

  it('types an unresolved import as any and reports it, instead of failing', () => {
    const program = createMemoryProgram({ 'x.ts': "import { f } from 'nowhere'\nconst r = f()" }, nodeLibs)
    const checker = program.getTypeChecker()
    const sf = program.getSourceFile('x.ts')!
    const decl = (sf.statements[1] as ts.VariableStatement).declarationList.declarations[0]
    expect(checker.typeToString(checker.getTypeAtLocation(decl.name))).toBe('any')
    expect(ts.getPreEmitDiagnostics(program).map((d) => d.code)).toContain(2307)
  })

  it('sees across the files it is given', () => {
    const program = createMemoryProgram({ 'a.ts': 'export const n = 1', 'b.ts': "import { n } from './a'\nconst m = n" }, nodeLibs)
    const checker = program.getTypeChecker()
    const decl = (program.getSourceFile('b.ts')!.statements[1] as ts.VariableStatement).declarationList.declarations[0]
    expect(checker.typeToString(checker.getTypeAtLocation(decl.name))).toBe('1')
  })
})

describe('createCtx', () => {
  it("hands components the program's own SourceFile and its checker", () => {
    const program = programFor('let x = 1')
    const ctx = createCtx(program, 'x.ts', compose(() => Verbatim, []))
    expect(ctx.sourceFile).toBe(program.getSourceFile('x.ts'))
    expect(ctx.checker).toBe(program.getTypeChecker())
  })

  it('refuses a file the program does not know', () => {
    expect(() => createCtx(programFor(''), 'y.ts', () => Verbatim)).toThrow(/y\.ts/)
  })

  it('still renders a file to itself with no transforms', () => {
    const src = 'const a: number = 1 // one\nfunction f() {}\n'
    expect(renderText(src)).toBe(src)
  })
})
