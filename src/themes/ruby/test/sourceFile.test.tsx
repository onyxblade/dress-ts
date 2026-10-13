import { describe, expect, it } from 'vitest'
import { renderText } from '../../../core/testing'
import { ruby } from '..'

const show = (text: string) => renderText(text, ruby.transforms)

describe('ruby theme', () => {
  it('keeps file-level comments and blank-line groups between statements', () => {
    expect(show('/** doc */\nimport a from "a" // why\n\n// about f\nexport function f() {}\n')).toBe(
      '/** doc */\nimport a from "a" // why\n\n// about f\nexport def f()\nend\n',
    )
  })

  it('composes class, method and if', () => {
    expect(show('class A {\n  m(x: number) {\n    if (x) {\n      return 1\n    } else {\n      return 2\n    }\n  }\n}\n')).toBe(
      'class A\n  def m(x: number)\n    if x\n      return 1\n    else\n      return 2\n    end\n  end\nend\n',
    )
  })
})
