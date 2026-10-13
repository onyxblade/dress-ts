import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { lostComments, renderText } from '../../../core/testing'
import { ruby } from '..'

const show = (text: string) => renderText(text, ruby.transforms)

/**
 * The theme keeps every comment. The attachment is core's; these pin down
 * where the theme's components put the ones around tokens they do not
 * write, and that nothing is lost over the inputs the theme is shown on.
 */
describe('ruby theme keeps comments', () => {
  it('shows the comment of an otherwise empty function body', () => {
    expect(show('function f() {\n  // Must call cleanup before leaving\n}')).toBe(
      'def f()\n  // Must call cleanup before leaving\nend\n',
    )
  })

  it('shows comments after the last statement of a body, with their gap', () => {
    expect(show('function f() {\n  a();\n\n  // dangling\n}')).toBe('def f()\n  a()\n\n  // dangling\n  return undefined\nend\n')
  })

  it('shows comments in every branch of an if', () => {
    const src = 'if (x) {\n  // only a comment\n} else {\n  b(); // trailing\n  // dangling\n}'
    expect(show(src)).toBe('if x\n  // only a comment\nelse\n  b() // trailing\n  // dangling\nend\n')
  })

  it('puts comments around the braces between branches on the keyword line', () => {
    const src = 'if (x) { a() } // t1\nelse if (y) { b() } // t2\nelse /* t3 */ { c() }'
    expect(show(src)).toBe('if x\n  a()\nelsif y // t1\n  b()\nelse // t2 /* t3 */\n  c()\nend\n')
  })

  it('keeps comments inside a guard inline', () => {
    expect(show('if (/* c */ x) /* d */ return')).toBe('return if /* c */ x /* d */\n')
  })

  it('shows the comment after the last class member', () => {
    expect(show('class C {\n  m() {}\n  // last\n}')).toBe('class C\n  def m()\n  end\n  // last\nend\n')
  })

  it('shows comments after the last statement of the file', () => {
    expect(show('a()\n// bye')).toBe('a()\n// bye\n')
  })

  it('keeps parameter comments inline', () => {
    expect(show('function f(a, /* b */ b) {}')).toBe('def f(a /* b */, b)\nend\n')
  })

  it('loses nothing from the sample', () => {
    expect(lostComments(readFileSync(new URL('../../../sample.ts', import.meta.url), 'utf8'), ruby.transforms)).toEqual([])
  })
})
