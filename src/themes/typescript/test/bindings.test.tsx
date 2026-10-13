import { render } from 'preact-render-to-string'
import { describe, expect, it } from 'vitest'
import { Render, Verbatim, compose, createCtx } from '../../../core'
import { htmlToText, lostComments, programFor, renderHtml, renderText } from '../../../core/testing'
import { typescript } from '..'

const show = (source: string) => renderText(source, typescript.transforms)
const html = (source: string) => renderHtml(source, typescript.transforms)
const marks = (source: string) => [...html(source).matchAll(/<span class="ts-binding" data-binding-kind="([^"]+)"><span[^>]*>([^<]*)<\/span><\/span>/g)]
  .map((match) => [match[1], htmlToText(match[2])])

describe('typescript declaration name readings', () => {
  it('folds const into declaration names while keeping let, var, and references plain', () => {
    const source = 'export const x = 1, y = x; let z = x; var legacy = y; use(x, y, z, legacy);'
    expect(show(source)).toBe('export x = 1, y = x;\nlet z = x;\nvar legacy = y;\nuse(x, y, z, legacy);\n')
    expect(marks(source)).toEqual([['const', 'x'], ['const', 'y']])
  })

  it('marks nested local bindings, not destructuring keys, defaults, or references', () => {
    const source = 'const { key: local = fallback, nested: { value }, ...rest } = input;\nconst [first, , [second = first], ...tail] = rest;\nuse(local, value, rest, first, second, tail);'
    expect(marks(source)).toEqual(['local', 'value', 'rest', 'first', 'second', 'tail'].map((name) => ['const', name]))
    expect(show(source)).toBe(source.replaceAll('const ', '') + '\n')
  })

  it('folds loop declarations without marking their use sites', () => {
    const source = 'for (const key in object) use(key); for await (const [value] of stream) use(value); for (const start = 0; test(start); step()) {}'
    expect(show(source)).toBe('for (key in object) use(key);\nfor await ([value] of stream) use(value);\nfor (start = 0; test(start); step()) {}\n')
    expect(marks(source)).toEqual([['const', 'key'], ['const', 'value'], ['const', 'start']])
  })

  it('retains const when empty destructuring offers no name to mark', () => {
    const source = 'const {} = object;\nconst [,] = array;'
    expect(show(source)).toBe(source + '\n')
    expect(marks(source)).toEqual([])
  })

  it('keeps resource management and type-level const syntax', () => {
    const source = 'using resource = acquire();\nawait using asyncResource = acquireAsync();\nlet value = { x: 1 } as const;\nfunction f<const T>(x: T) { return x; }\nconst enum E { A }'
    expect(show(source)).toContain('using resource = acquire();\nawait using asyncResource = acquireAsync();')
    expect(show(source)).toContain('as const;')
    expect(show(source)).toContain('function f<const T>')
    expect(show(source)).toContain('const enum E')
    expect(marks(source)).toEqual([])
  })

  it('folds readonly into property names, preserving other modifiers and references', () => {
    const source = 'class C { @dec private readonly field!: number; static readonly #secret = 1; readonly "label"?: string; readonly 0 = 0; method() { return this.field; } }\ninterface I { readonly value: number; mutable: number; }'
    expect(marks(source)).toEqual(['field', '#secret', '"label"', '0', 'value'].map((name) => ['readonly', name]))
    expect(show(source)).toContain('@dec private field!: number;')
    expect(show(source)).toContain('static #secret = 1;')
    expect(show(source)).toContain('return this.field;')
    expect(show(source)).not.toContain('readonly')
  })

  it('keeps the constructor parameter property meaning in the name hover', () => {
    const source = 'class C { constructor(readonly x: number, private readonly y = x, z: number) {} }'
    expect(show(source)).toContain('constructor(x: number, private y = x, z: number) {}')
    expect(marks(source)).toEqual([['readonly', 'x'], ['readonly', 'y']])
    expect(html(source)).toContain('This constructor parameter also declares and initializes a property.')
    expect(html(source)).toMatch(/data-reading-detail(?:="")? data-node="Parameter@/)
  })

  it('retains readonly types and computed properties without marking expression names', () => {
    const source = 'type R<T> = { readonly [K in keyof T]: T[K] };\ntype M<T> = { -readonly [K in keyof T]: T[K] };\ntype A = readonly string[];\ntype B = readonly [string, number];\ninterface I { readonly [key]: number; readonly [index: number]: string; }'
    expect(show(source)).toContain('readonly [K in keyof T]')
    expect(show(source)).toContain('-readonly [K in keyof T]')
    expect(show(source)).toContain('readonly string[]')
    expect(show(source)).toContain('readonly [string, number]')
    expect(show(source)).toContain('readonly [key]: number;')
    expect(show(source)).toContain('readonly [index: number]: string;')
    expect(marks(source)).toEqual([])
  })

  it.each([
    'const /* before name */ x /* before equals */ = 1; // end',
    'const // before name\nx = 1, /* next */ y = x;',
    'const { /* key */ key: /* name */ local = /* default */ other, /* end */ } = input;',
    'class C { private /* before */ readonly /* after */ field = 1; }',
    'class C { readonly // after modifier\nfield = 1; constructor(readonly /* parameter */ value: number) {} }',
    'interface I { /* leading */ readonly value: number; /* trailing */ }',
  ])('keeps every comment once and in order: %s', (source) => {
    expect(lostComments(source, typescript.transforms)).toEqual([])
    const comments = (text: string) => text.match(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g) ?? []
    expect(comments(show(source))).toEqual(comments(source))
    for (const line of show(source).split('\n')) {
      if (line.includes('// before name')) expect(line.trim()).toBe('// before name')
      // A newline makes `readonly` itself a property name in TypeScript.
      if (line.includes('// after modifier')) expect(line.trim()).toBe('readonly // after modifier')
    }
  })

  it('keeps name identities, semantic colors, and an explicit hover detail', () => {
    const source = 'const f = () => 1; f();'
    const shown = html(source)
    expect(shown).toMatch(/data-reading="Solid underline: const binding;[^"]+" data-reading-detail(?:="")? data-node="VariableDeclarationList@/)
    expect(shown).toMatch(/data-binding-kind="const"><span data-kind="Identifier" data-node="Identifier@5-7" data-role="value">f<\/span>/)
    expect(marks(source)).toEqual([['const', 'f']])
  })

  it('leaves the original AST, text, and other views unchanged', () => {
    const source = 'const value = 1; class C { readonly field = value; }'
    const program = programFor(source)
    const ctx = createCtx(program, 'x.ts', compose(() => Verbatim, typescript.transforms))
    render(<Render node={ctx.sourceFile} ctx={ctx} />)
    expect(ctx.sourceFile.text).toBe(source)
    const original = createCtx(program, 'x.ts', () => Verbatim)
    expect(htmlToText(render(<Render node={original.sourceFile} ctx={original} />))).toBe(source)
  })
})
