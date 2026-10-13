import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import { renderHtml, renderText } from '../../src/core/testing'
import { Indent, Line, Lines, claim, type NodeProps } from '../../src/core'

// A block laid out semantically: statements as lines inside an indent.
function LaidOutBlock({ node, ctx }: NodeProps<ts.Block>) {
  return (
    <>
      <Line>{'{'}</Line>
      <Indent>
        <Lines nodes={node.statements} ctx={ctx} />
      </Indent>
      <Line>{'}'}</Line>
    </>
  )
}
const blocks = [claim(ts.isBlock, LaidOutBlock)]

describe('layout', () => {
  it('re-indents verbatim text relative to its first line', () => {
    const src = '{\n      a({\n        b: 1,\n      })\n}'
    expect(renderText(src, blocks)).toBe('{\n  a({\n    b: 1,\n  })\n}\n')
  })

  it('nests layouts', () => {
    expect(renderText('{ { a } }', blocks)).toBe('{\n  {\n    a\n  }\n}\n')
  })

  it('gives a line the identity of the node it is laid out for', () => {
    const html = renderHtml('{ a }', blocks)
    expect(html).toContain('<div class="line" data-node="ExpressionStatement@1-3">')
    expect(html).toContain('<div class="line">{</div>')
  })
})
