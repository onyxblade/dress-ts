import { describe, expect, it } from 'vitest'
import { renderText } from '../../../core/testing'
import { rubyFallback } from '../fallback'
import { rubySourceFile } from '../sourceFile'
import { rubyClass } from '../class'
import { rubyIf } from '../if'

const show = (text: string) => renderText(text, [rubySourceFile, rubyClass, rubyIf, rubyFallback])

describe('closingSemicolon', () => {
  it('drops the semicolon of a statement that owns its line', () => {
    expect(show('import a from "a";\nconst x = 1;\nf();')).toBe('import a from "a"\nconst x = 1\nf()\n')
  })

  it('drops it before a trailing comment', () => {
    expect(show('const x = 1; // why')).toBe('const x = 1 // why\n')
  })

  it('drops it from class members laid out one per line', () => {
    expect(show('class A { x = 1; m(): void; }')).toBe('class A\n  x = 1\n  m(): void\nend\n')
  })

  it('drops it from verbatim members that end their source line', () => {
    expect(show('interface A {\n  a: string;\n  b: number; // n\n}')).toBe('interface A {\n  a: string\n  b: number // n\n}\n')
  })

  it('keeps separators inside a one-line type literal', () => {
    expect(show('type T = { a: string; b: number };')).toBe('type T = { a: string; b: number }\n')
  })

  it('drops it from a guard body, which shares the if line', () => {
    expect(show('if (x) return 0;')).toBe('return 0 if x\n')
  })

  it('leaves a semicolon-free source alone', () => {
    expect(show('const x = 1\nf()')).toBe('const x = 1\nf()\n')
  })
})
