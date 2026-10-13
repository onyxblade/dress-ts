import { describe, expect, it } from 'vitest'
import { renderHtml, renderText } from '../../../core/testing'
import { typescript } from '..'

const show = (text: string) => renderText(text, typescript.transforms)

describe('typescript layout', () => {
  it('lays out functions and branches without removing syntax', () => {
    expect(show('export function f(x: number): number { if (x === 0) { return 1; } else { return x; } }')).toBe(
      'export function f(x: number): number {\n  if (x === 0) {\n    return 1;\n  } else {\n    return x;\n  }\n}\n',
    )
  })

  it('keeps modifiers, generic constraints, methods, accessors, and parameter properties', () => {
    expect(show('export class A<T extends object> extends B<T> implements C { private readonly x = 1; constructor(public value: T) {} get size(): number { return this.x } set size(x: number) { this.x = x } static async *m<U>(a: U): AsyncGenerator<U> { yield a } }')).toBe(
      'export class A<T extends object> extends B<T> implements C {\n  private readonly x = 1;\n  constructor(public value: T) {}\n  get size(): number {\n    return this.x\n  }\n  set size(x: number) {\n    this.x = x\n  }\n  static async *m<U>(a: U): AsyncGenerator<U> {\n    yield a\n  }\n}\n',
    )
  })

  it('keeps function expressions, generators, arrows, and their surrounding expressions together', () => {
    expect(show('const f = function* named<T>(x: T) { yield x; }; const g = async <T,>(x: T): Promise<T> => { return x; }; run(() => { work(); });')).toBe(
      'const f = function* named<T>(x: T) {\n  yield x;\n};\nconst g = async <T,>(x: T): Promise<T> => {\n  return x;\n};\nrun(() => {\n  work();\n});\n',
    )
  })

  it('keeps expression arrow bodies and normalizes parameter parentheses', () => {
    expect(show('const f = x => ({ value: x });')).toBe('const f = (x) => ({ value: x });\n')
  })

  it('keeps overloads and abstract signatures as written', () => {
    expect(show('function f(x: string): void;\nfunction f(x: unknown) {}\nabstract class A { abstract m(): void; }')).toBe(
      'function f(x: string): void;\nfunction f(x: unknown) {}\nabstract class A {\n  abstract m(): void;\n}\n',
    )
  })

  it('keeps braceless guards and else-if chains', () => {
    expect(show('if (x) return 1; else if (y) { return 2; } else return 3;')).toBe(
      'if (x) return 1; else if (y) {\n  return 2;\n} else return 3;\n',
    )
  })

  it('lays out each loop without changing its binding or jump', () => {
    expect(show('while (x) { x--; } do { f(); } while (x); for (let i = 0; i < 2; i++) { f(i); } for (;;) break; for (const k in obj) f(k); for await (const x of xs) { yield x; }')).toBe(
      'while (x) {\n  x--;\n}\ndo {\n  f();\n} while (x);\nfor (let i = 0; i < 2; i++) {\n  f(i);\n}\nfor (;;) break;\nfor (const k in obj) f(k);\nfor await (const x of xs) {\n  yield x;\n}\n',
    )
  })

  it('keeps separate switch labels, fallthrough, breaks, and scoped case blocks', () => {
    expect(show('switch (x) { case 1: case 2: f(); break; case 3: g(); default: { let y = 1; h(y); } }')).toBe(
      'switch (x) {\n  case 1:\n  case 2:\n    f();\n    break;\n  case 3:\n    g();\n  default:\n    {\n      let y = 1;\n      h(y);\n    }\n}\n',
    )
  })

  it('lays out try, catch, and finally with and without catch bindings', () => {
    expect(show('try { f(); } catch (e) { throw e; } finally { cleanup(); }\ntry {} catch {}')).toBe(
      'try {\n  f();\n} catch (e) {\n  throw e;\n} finally {\n  cleanup();\n}\ntry {} catch {}\n',
    )
  })

  it('keeps interfaces, enum initializers, separators, and empty bodies', () => {
    expect(show('interface I<T> extends J<T> { readonly x: T; m(): T; } export const enum E { A = 1, B, } enum Empty {}')).toBe(
      'interface I<T> extends J<T> {\n  readonly x: T;\n  m(): T;\n}\nexport const enum E {\n  A = 1,\n  B,\n}\nenum Empty {}\n',
    )
    expect(show('enum E { A, B }')).toBe('enum E {\n  A,\n  B\n}\n')
  })

  it('keeps file comments, blank-line groups, and a shebang', () => {
    expect(show('#!/usr/bin/env node\n/** doc */\nfunction f() {}\n\n// next\nf();\n// end')).toBe(
      '#!/usr/bin/env node\n/** doc */\nfunction f() {}\n\n// next\nf();\n// end\n',
    )
  })

  it('keeps a line comment from swallowing or misaligning the next branch', () => {
    expect(show('if (x) { f(); } // then\nelse {}')).toBe('if (x) {\n  f();\n} // then\nelse {}\n')
    expect(show('try {} // try\ncatch {} // catch\nfinally {}')).toBe('try {} // try\ncatch {} // catch\nfinally {}\n')
  })

  it('uses source fallback for types, operators, and object literals', () => {
    const source = 'type M<T> = { readonly [K in keyof T]?: T[K] };\nconst x = { a: new Map<string, X>(), b: this?.value! } satisfies object;\nconst same = a === b && a != c;'
    expect(show(source)).toBe(source + '\n')
  })

  it('keeps identity and semantic roles without marking unchanged syntax as a translation', () => {
    const html = renderHtml('function f(x: number) { return x }', typescript.transforms)
    expect(html).toContain('data-kind="FunctionDeclaration"')
    expect(html).toContain('data-kind="Block"')
    expect(html).toContain('data-role="function"')
    expect(html).toContain('class="indent"')
    expect(html).not.toContain('data-reading=')
  })
})
