import { describe, expect, it } from 'vitest'
import { renderHtml, renderText } from '../../../core/testing'
import { rubySwitch } from '../switch'
import { rubyIf } from '../if'
import { rubyFunction } from '../function'
import { rubyLastReturn } from '../return'
import { rubyWhile } from '../loop'

const show = (text: string) => renderText(text, [rubySwitch, rubyIf, rubyWhile])

describe('rubySwitch', () => {
  it('lays out a switch as case ... when ... else ... end, the closing breaks not written', () => {
    expect(show('switch (x) {\n  case 1:\n    a()\n    break\n  case 2:\n    b()\n    break\n  default:\n    c()\n}')).toBe(
      'case x\nwhen 1\n  a()\nwhen 2\n  b()\nelse\n  c()\nend\n',
    )
  })

  it('joins a run of labels into one when', () => {
    expect(show("switch (c) {\n  case ' ':\n  case '\\t':\n    i++\n    break\n  case '+':\n    f()\n}")).toBe(
      "case c\nwhen ' ', '\\t'\n  i++\nwhen '+'\n  f()\nend\n",
    )
  })

  it('reads a run with a default in it as else, and a trailing run of empty labels as an empty when', () => {
    expect(show('switch (x) {\n  case 1:\n  default:\n    a()\n}')).toBe('case x\nelse\n  a()\nend\n')
    expect(show('switch (x) {\n  case 1:\n    a()\n    break\n  case 2:\n  case 3:\n}')).toBe('case x\nwhen 1\n  a()\nwhen 2, 3\nend\n')
  })

  it('takes the statements of a body that is one block', () => {
    expect(show('switch (x) {\n  case 1: {\n    const y = 1\n    f(y)\n    break\n  }\n  default: {\n    g()\n  }\n}')).toBe(
      'case x\nwhen 1\n  const y = 1\n  f(y)\nelse\n  g()\nend\n',
    )
  })

  it('writes fallthrough after a body that runs on into the next clause', () => {
    expect(show('switch (x) {\n  case 1:\n    a()\n  case 2:\n    b()\n    break\n  case 3:\n    return\n  case 4:\n    throw e\n}')).toBe(
      'case x\nwhen 1\n  a()\n  fallthrough\nwhen 2\n  b()\nwhen 3\n  return\nwhen 4\n  throw e\nend\n',
    )
    expect(show('switch (x) {\n  case 1:\n    if (y) return\n    else throw e\n  case 2:\n    if (y) a()\n  default:\n    b()\n}')).toBe(
      'case x\nwhen 1\n  if y\n    return\n  else\n    throw e\n  end\nwhen 2\n  a() if y\n  fallthrough\nelse\n  b()\nend\n',
    )
  })

  it('marks fallthrough as a reading of the clause', () => {
    const html = renderHtml('switch (x) {\n  case 1:\n    a()\n  case 2:\n    b()\n}', [rubySwitch])
    expect(html).toContain('<div class="line"><span class="reading" data-reading="the body runs on into the next clause, as a Ruby `when` never does" data-node="CaseClause@12-30">fallthrough</span></div></div>')
  })

  it('keeps a break that leaves the switch early, marked as a caution', () => {
    expect(show('switch (x) {\n  case 1:\n    if (y) break\n    a()\n    break\n  default:\n    b()\n}')).toBe(
      'case x\nwhen 1\n  break if y\n  a()\nelse\n  b()\nend\n',
    )
    const html = renderHtml('switch (x) {\n  case 1:\n    if (y) break;\n    a()\n}', [rubySwitch, rubyIf])
    expect(html).toContain('<span class="reading" data-reading="this `break` leaves the `switch`; in a Ruby `case` it would leave the loop around it" data-node="BreakStatement@33-40"><span class="caution">break</span></span>')
  })

  it('leaves a break of a loop or a switch nested in a body alone', () => {
    expect(show('switch (x) {\n  case 1:\n    while (y) {\n      break\n    }\n    break\n}')).toBe(
      'case x\nwhen 1\n  while y\n    break\n  end\nend\n',
    )
    expect(show('switch (x) {\n  case 1:\n    switch (y) {\n      case 2:\n        a()\n        break\n    }\n    break\n}')).toBe(
      'case x\nwhen 1\n  case y\n  when 2\n    a()\n  end\nend\n',
    )
  })

  it('keeps comments on the labels, in the body, on a dropped break and after the last clause, and blank-line groups', () => {
    const src = [
      'switch (x) {',
      '  // one',
      '  case 1: // on one',
      '  // two',
      '  case 2:',
      '    a() // t',
      '',
      '    b()',
      '    break // done',
      '    // dangling',
      '',
      '  default:',
      '    c()',
      '  // last',
      '}',
    ].join('\n')
    expect(show(src)).toBe(
      'case x\n// one\n// two\nwhen 1, 2 // on one\n  a() // t\n\n  b()\n  // done\n// dangling\n\nelse\n  c()\n// last\nend\n',
    )
  })

  it('keeps a comment after the last statement of a clause on that line', () => {
    expect(show('switch (x) {\n  case 1:\n    return a // why\n  default:\n    b() // t\n}')).toBe(
      'case x\nwhen 1\n  return a // why\nelse\n  b() // t\nend\n',
    )
  })

  it('does not count the lines a run of labels took as a gap', () => {
    expect(show('switch (x) {\n  case 1:\n  case 2:\n  case 3:\n    a()\n    break\n  case 4:\n    b()\n}')).toBe(
      'case x\nwhen 1, 2, 3\n  a()\nwhen 4\n  b()\nend\n',
    )
  })
})

describe('a last switch and the value of the body', () => {
  const show = (text: string) => renderText(text, [rubyFunction, rubyLastReturn, rubySwitch, rubyIf])

  it('gets no undefined when it has a default, its last clause leaves and no break leaves it', () => {
    expect(show('function f() {\n  switch (x) {\n    case 1:\n      return 1\n    default:\n      throw e\n  }\n}')).toBe(
      'def f()\n  case x\n  when 1\n    return 1\n  else\n    throw e\n  end\nend\n',
    )
  })

  it('gets undefined without a default, or with a break', () => {
    expect(show('function f() {\n  switch (x) {\n    case 1:\n      return 1\n  }\n}')).toBe(
      'def f()\n  case x\n  when 1\n    return 1\n  end\n  undefined\nend\n',
    )
    expect(show('function f() {\n  switch (x) {\n    case 1:\n      break\n    default:\n      return 1\n  }\n}')).toBe(
      'def f()\n  case x\n  when 1\n  else\n    return 1\n  end\n  undefined\nend\n',
    )
  })
})
