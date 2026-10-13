import { render } from 'preact-render-to-string'
import { describe, expect, it } from 'vitest'
import { Render, Verbatim, compose, createCtx } from '../../../core'
import { htmlToText, lostComments, programFor, renderHtml, renderText } from '../../../core/testing'
import { typescript } from '..'

const show = (source: string) => renderText(source, typescript.transforms)
const html = (source: string) => renderHtml(source, typescript.transforms)
const marks = (source: string) => [...html(source).matchAll(/<span class="ts-binding" data-folded-modifiers="([^"]+)"><span[^>]*>([^<]*)<\/span><\/span>/g)]
  .map((match) => [match[1], htmlToText(match[2])])

describe('typescript declaration name readings', () => {
  it('folds const, let, and var into the same name mark, leaving references plain', () => {
    const source = 'export const x = 1, y = x; let z = x; var legacy = y; use(x, y, z, legacy);'
    expect(show(source)).toBe('x = 1, y = x;\nz = x;\nlegacy = y;\nuse(x, y, z, legacy);\n')
    expect(marks(source)).toEqual([['export const', 'x'], ['export const', 'y'], ['let', 'z'], ['var', 'legacy']])
    expect(html(source)).not.toContain('data-binding-kind')
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

  it('retains the declaration kind and modifiers when there is no bound name', () => {
    const source = 'export const {} = object;\nconst [,] = array;\nlet [] = array;\nvar {} = object;'
    expect(show(source)).toBe(source + '\n')
    expect(marks(source)).toEqual([])
  })

  it('keeps resource management, const assertions, and const type parameters', () => {
    const source = 'using resource = acquire();\nawait using asyncResource = acquireAsync();\nlet value = { x: 1 } as const;\nfunction f<const T>(x: T) { return x; }\nconst enum E { A }'
    expect(show(source)).toContain('using resource = acquire();\nawait using asyncResource = acquireAsync();')
    expect(show(source)).toContain('as const;')
    expect(show(source)).toContain('function f<const T>')
    expect(show(source)).toContain('enum E')
    expect(marks(source)).toEqual([['let', 'value'], ['const', 'E']])
  })

  it('merges property modifiers into one mark, preserving decorators and references', () => {
    const source = 'class C { @dec private readonly field!: number; static readonly #secret = 1; readonly "label"?: string; readonly 0 = 0; method() { return this.field; } }\ninterface I { readonly value: number; mutable: number; }'
    expect(marks(source)).toEqual([
      ['private readonly', 'field'], ['static readonly', '#secret'],
      ['readonly', '"label"'], ['readonly', '0'], ['readonly', 'value'],
    ])
    expect(show(source)).toContain('@dec field!: number;')
    expect(show(source)).toContain('#secret = 1;')
    expect(show(source)).toContain('return this.field;')
    expect(show(source)).not.toContain('readonly')
  })

  it('keeps the constructor parameter property meaning in the name hover', () => {
    const source = 'class C { constructor(readonly x: number, private readonly y = x, public z: number, ordinary = z) {} }'
    expect(show(source)).toContain('constructor(x: number, y = x, z: number, ordinary = z) {}')
    expect(marks(source)).toEqual([['readonly', 'x'], ['private readonly', 'y'], ['public', 'z']])
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
    expect(shown).toMatch(/data-reading="Folded declaration: const\.[^"]+" data-reading-detail(?:="")? data-node="VariableStatement@/)
    expect(shown).toMatch(/data-folded-modifiers="const"><span data-kind="Identifier" data-node="Identifier@5-7" data-role="value">f<\/span>/)
    expect(marks(source)).toEqual([['const', 'f']])
  })

  it('leaves the original AST, text, and other views unchanged', () => {
    const source = 'export const value = 1; let x; var y; class C { private static readonly field = value; }'
    const program = programFor(source)
    const ctx = createCtx(program, 'x.ts', compose(() => Verbatim, typescript.transforms))
    render(<Render node={ctx.sourceFile} ctx={ctx} />)
    expect(ctx.sourceFile.text).toBe(source)
    const original = createCtx(program, 'x.ts', () => Verbatim)
    expect(htmlToText(render(<Render node={original.sourceFile} ctx={original} />))).toBe(source)
  })

  it('retains ordered metadata for every modifier without stacking marks', () => {
    const source = 'class C { private static readonly cache = new Map(); protected override method() {} }\nexport declare const x: number, y: number;'
    expect(marks(source)).toEqual([
      ['private static readonly', 'cache'], ['protected override', 'method'],
      ['export declare const', 'x'], ['export declare const', 'y'],
    ])
    expect(html(source).match(/class="ts-binding"/g)).toHaveLength(4)
    expect(html(source)).toContain('Folded declaration: private static readonly.')
    expect(html(source)).toContain('Folded declaration: export declare const.')
    expect(show(source)).toContain('cache = new Map();')
    expect(show(source)).toContain('x: number, y: number;')
  })

  it('marks named declarations and signatures while keeping their syntax and type colors', () => {
    const source = 'export default abstract class C { abstract method(): void; public get size() { return 0; } }\nexport async function f() {}\ndeclare function g(): void;\nexport interface I {}\nexport type T = string;\nexport const enum E { A }\nexport namespace N {}'
    expect(marks(source)).toEqual([
      ['export default abstract', 'C'], ['abstract', 'method'], ['public', 'size'],
      ['export async', 'f'], ['declare', 'g'], ['export', 'I'], ['export', 'T'],
      ['export const', 'E'], ['export', 'N'],
    ])
    expect(show(source)).toContain('class C {\n  method(): void;\n  get size()')
    expect(show(source)).toContain('function g(): void;')
    expect(html(source)).toMatch(/data-folded-modifiers="export default abstract"><span[^>]+data-role="class">C/)
    expect(html(source)).toMatch(/data-folded-modifiers="export async"><span[^>]+data-role="function">f/)
  })

  it('keeps modifiers without an unambiguous declaration name and does not fold keyword-like names', () => {
    const source = 'export default class { private constructor() {} static [key]() {} static {} readonly = 1; static = 2; }\nconst f = async () => 1;\nconst g = async function () {};\nfunction identity<const T>(value: T) { return value; }'
    expect(show(source)).toContain('export default class {')
    expect(show(source)).toContain('private constructor() {}')
    expect(show(source)).toContain('static [key]() {}')
    expect(show(source)).toContain('static {}')
    expect(show(source)).toContain('readonly = 1;')
    expect(show(source)).toContain('static = 2;')
    expect(show(source)).toContain('f = async () => 1;')
    expect(show(source)).toContain('g = async function () {};')
    expect(marks(source)).toEqual([['const', 'f'], ['const', 'g']])
  })

  it('distinguishes let and var declarations from assignments, including uninitialized bindings and loops', () => {
    const source = 'let count: number; var legacy; count = 0; legacy = count; for (let i = 0; i < 2; i++) {} for (var key in object) use(key);'
    expect(show(source)).toBe('count: number;\nlegacy;\ncount = 0;\nlegacy = count;\nfor (i = 0; i < 2; i++) {}\nfor (key in object) use(key);\n')
    expect(marks(source)).toEqual([['let', 'count'], ['var', 'legacy'], ['let', 'i'], ['var', 'key']])
    expect(html(source)).toContain('block-scoped binding')
    expect(html(source)).toContain('hoisted binding')
  })

  it.each([
    'export /* a */ declare /* b */ const /* c */ value = 1;',
    'export // a\nasync /* b */ function /* c */ f() {}',
    'export /* a */ abstract /* b */ class C { protected /* c */ abstract /* d */ m(): void; }',
    'class C { private /* a */ static /* b */ readonly /* c */ field = 1; }',
    'class C { public /* a */ get /* b */ size() { return 0; } }',
    'export /* a */ type /* b */ T = { readonly /* c */ value: number };',
  ])('preserves comments while merging modifier lists: %s', (source) => {
    expect(lostComments(source, typescript.transforms)).toEqual([])
    const comments = (text: string) => text.match(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g) ?? []
    expect(comments(show(source))).toEqual(comments(source))
  })
})
