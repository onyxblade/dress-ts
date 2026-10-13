import { describe, expect, it } from 'vitest'
import { renderText } from '../../../core/testing'
import { rubyTry } from '../try'
import { rubyFunction } from '../function'
import { rubyLastReturn } from '../return'
import { rubyIf } from '../if'

const show = (text: string) => renderText(text, [rubyTry, rubyIf])

describe('rubyTry', () => {
  it('lays out try, catch and finally as begin, rescue => e, ensure, end', () => {
    expect(show('try {\n  a()\n} catch (e) {\n  b(e)\n} finally {\n  c()\n}')).toBe(
      'begin\n  a()\nrescue => e\n  b(e)\nensure\n  c()\nend\n',
    )
  })

  it('reads a catch without a binding as a bare rescue, and keeps a typed or destructured one as written', () => {
    expect(show('try { a() } catch { b() }')).toBe('begin\n  a()\nrescue\n  b()\nend\n')
    expect(show('try { a() } catch (e: unknown) { b() }')).toBe('begin\n  a()\nrescue => e: unknown\n  b()\nend\n')
    expect(show('try { a() } catch ({ message }) { b() }')).toBe('begin\n  a()\nrescue => { message }\n  b()\nend\n')
  })

  it('handles try with only a finally', () => {
    expect(show('try {\n  a()\n} finally {\n  c()\n}')).toBe('begin\n  a()\nensure\n  c()\nend\n')
  })

  it('puts comments around the braces between the parts on the keyword lines', () => {
    const src = 'try { a() } // t1\ncatch (e) { b() } // t2\nfinally /* t3 */ { c() }'
    expect(show(src)).toBe('begin\n  a()\nrescue => e // t1\n  b()\nensure // t2 /* t3 */\n  c()\nend\n')
  })

  it('keeps comments and blank-line groups inside each part', () => {
    expect(show('try {\n  // only a comment\n} catch (e) {\n  b() // t\n\n  // dangling\n}')).toBe(
      'begin\n  // only a comment\nrescue => e\n  b() // t\n\n  // dangling\nend\n',
    )
  })

  it('nests an if inside, guards included', () => {
    expect(show('try {\n  a()\n} catch (e) {\n  if (e instanceof E) return\n  throw e\n}')).toBe(
      'begin\n  a()\nrescue => e\n  return if e instanceof E\n  throw e\nend\n',
    )
  })
})

describe('a last try and the value of the body', () => {
  const show = (text: string) => renderText(text, [rubyFunction, rubyLastReturn, rubyTry, rubyIf])

  it('gets no undefined when its block and catch both leave, or its finally does', () => {
    expect(show('function f() {\n  try {\n    return a()\n  } catch (e) {\n    throw e\n  }\n}')).toBe(
      'def f()\n  begin\n    return a()\n  rescue => e\n    throw e\n  end\nend\n',
    )
    expect(show('function f() {\n  try {\n    a()\n  } finally {\n    return 1\n  }\n}')).toBe(
      'def f()\n  begin\n    a()\n  ensure\n    return 1\n  end\nend\n',
    )
  })

  it('gets undefined when a path falls through', () => {
    expect(show('function f() {\n  try {\n    return a()\n  } catch (e) {\n    log(e)\n  }\n}')).toBe(
      'def f()\n  begin\n    return a()\n  rescue => e\n    log(e)\n  end\n  undefined\nend\n',
    )
    expect(show('function f() {\n  try {\n    a()\n  } finally {\n    b()\n  }\n}')).toBe(
      'def f()\n  begin\n    a()\n  ensure\n    b()\n  end\n  undefined\nend\n',
    )
  })
})
