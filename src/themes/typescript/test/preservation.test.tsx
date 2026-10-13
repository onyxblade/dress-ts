import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { allComments, childNodes, isStaticImport } from '../../../core'
import { htmlToText, lostComments, programFor, renderHtml, renderText, samples } from '../../../core/testing'
import { typescript } from '..'
import { typescriptSwitchLayout } from '../switch'

const examples = [
  ...samples(),
  'function f() {\n  // empty body\n}\nclass C {\n  // empty class\n}\ninterface I { /* empty interface */ }\nenum E { /* empty enum */ }',
  'function f() {\n  a(); // statement\n\n  // dangling\n}\n// file end',
  'if (/* condition */ x) /* then */ { a() } // after then\nelse if (y) { b() } // after else-if\nelse /* else */ { c() }',
  'while (/* while */ x) /* body */ { f() }\ndo /* do */ { f() } // before while\nwhile (/* test */ x);',
  'for (/* initial */ let i = 0; /* condition */ i < 2; /* step */ i++) /* body */ { f(i); }',
  'for /* for */ await /* await */ (const x /* binding */ of /* of */ xs) { f(x); }',
  'switch (/* switch */ x) {\n  // first\n  case 1: // label\n  case 2: { f(); /* scoped */ }\n  // next\n  default: /* default */ break; // break\n  // end\n}',
  'switch (x) { /* empty switch */ }\nswitch (x) { case 1: /* empty case */ }',
  'try /* try */ { a(); } // between\ncatch /* catch */ (/* binding */ e) /* block */ { throw e; } // before finally\nfinally /* finally */ { b(); }',
  'try { a(); } catch { /* empty catch */ } finally { /* empty finally */ }',
  'enum E { A = 1, // first\n B, /* second */\n // last\n}',
  'export /* export */ async /* async */ function* /* star */ f<T /* generic */>(x: T /* parameter */): Generator<T> { yield x; }',
  'const f = function /* anonymous */ (/* parameters */) { /* body */ }; const g = (/* arrow parameters */) /* arrow */ => /* arrow body */ { /* content */ };',
  'class C<T /* type */> extends B<T> /* extends */ implements I { @dec private readonly x = 1; constructor(public readonly y: T) {} get value() { return this.x; } set value(x: number) { this.x = x; } static { f(); } }',
  'function f(\n  // first parameter\n  a: number, // after parameter\n  b: number,\n) { return a + b; }',
  'function f<T, // first type\n U>(x: T, y: U) { return x; }',
  'const f = (x: number // parameter\n) => { return x; };',
  'if (x) if (y) f(); else g();\nlabel: for (;;) { if (x) continue label; break label; }',
  'const C = class extends Base { #value = 1; get value() { return this.#value; } };\nconst o = { async *m<T>(x: T) { yield x; }, get x() { return 1; } };',
  'declare function f(x: string): void;\nfunction g(x: number): number;\nfunction g(x: number) { return x; }\nabstract class A { abstract m(): void; }',
  'namespace N { export function f() { return 1; } }\ntype F = <T>(x: T) => T;\ntype C<T> = T extends infer U extends object ? U : never;',
]

/** Apart from hidden file imports, syntax, literal values, and declaration kinds stay the same. */
function shape(node: ts.Node): unknown {
  const fields = Object.fromEntries(
    ['text', 'escapedText', 'operator', 'token', 'isTypeOnly', 'isExportEquals'].flatMap((key) =>
      key in node ? [[key, (node as unknown as Record<string, unknown>)[key]]] : [],
    ),
  )
  if (ts.isSourceFile(node)) delete fields.text
  if (ts.isVariableDeclarationList(node)) fields.declarationFlags = node.flags & ts.NodeFlags.BlockScoped
  const children = childNodes(node).filter((child) => !ts.isSourceFile(node) || !isStaticImport(child))
  return [node.kind, fields, children.map(shape)]
}

describe('typescript preservation', () => {
  it.each(examples.map((source, i) => ({ source, name: `example ${i + 1}` })))('keeps syntax and comments in $name', ({ source }) => {
    // Switch arms are a reading, not executable TS. Check the other layout
    // decisions with switches expanded; check comments with the full theme.
    const shown = renderText(source, [typescriptSwitchLayout, ...typescript.transforms])
    const original = programFor(source)
    const rendered = programFor(shown)
    expect(original.getSyntacticDiagnostics()).toEqual([])
    expect(rendered.getSyntacticDiagnostics()).toEqual([])
    expect(shape(rendered.getSourceFile('x.ts')!)).toEqual(shape(original.getSourceFile('x.ts')!))
    expect(lostComments(source, typescript.transforms)).toEqual([])
    const html = renderHtml(source, typescript.transforms)
    const comments = [...html.matchAll(/<span class="comment">([\s\S]*?)<\/span>/g)].map((match) => htmlToText(match[1]))
    expect(comments).toEqual(allComments(original.getSourceFile('x.ts')!).map((c) => c.text))
  })
})
