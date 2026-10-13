import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import { renderHtml, renderText } from '../../src/core/testing'
import { Indent, Line, Lines, Render, claim, withTransforms, type NodeProps } from '../../src/core'

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

// A switch whose clauses are laid out in runs: the empty labels and the clause after them share a line.
function RunsOfClauses({ node, ctx }: NodeProps<ts.SwitchStatement>) {
  const runs: ts.CaseOrDefaultClause[][] = []
  let run: ts.CaseOrDefaultClause[] = []
  for (const clause of node.caseBlock.clauses) {
    run.push(clause)
    if (clause.statements.length > 0) {
      runs.push(run)
      run = []
    }
  }
  const heads = new Set<ts.Node>(runs.map((r) => r[0]))
  const Run = ({ node, ctx }: NodeProps<ts.CaseOrDefaultClause>) => {
    const own = runs.find((r) => r[0] === node)!
    return (
      <>
        when {own.map((c, i) => (ts.isCaseClause(c) ? <>{i > 0 && ', '}<Render node={c.expression} ctx={ctx} /></> : null))}
        {own.flatMap((c) => ctx.comments.of(c).trailing).map((c) => ` ${c.text}`)}
        <Indent>
          <Lines nodes={own[own.length - 1].statements} ctx={ctx} />
        </Indent>
      </>
    )
  }
  const scoped = withTransforms(ctx, [claim((n): n is ts.CaseOrDefaultClause => heads.has(n), Run)])
  return (
    <>
      <Line>case</Line>
      <Lines nodes={runs} ctx={scoped} />
      <Line>end</Line>
    </>
  )
}
const runs = [claim(ts.isSwitchStatement, RunsOfClauses)]

describe('layout', () => {
  it('re-indents verbatim text relative to its first line', () => {
    const src = '{\n      a({\n        b: 1,\n      })\n}'
    expect(renderText(src, blocks)).toBe('{\n  a({\n    b: 1,\n  })\n}\n')
  })

  it('nests layouts', () => {
    expect(renderText('{ { a } }', blocks)).toBe('{\n  {\n    a\n  }\n}\n')
  })

  it('lays a group of nodes out as one line, its comments and its gaps those of the whole run', () => {
    const src = 'switch (x) {\n  // one\n  case 1: // on one\n\n  // two\n  case 2:\n    a()\n\n  case 3:\n    b()\n  case 4:\n  case 5:\n    c()\n}'
    expect(renderText(src, runs)).toBe('case\n// one\n\n// two\nwhen 1, 2 // on one\n  a()\n\nwhen 3\n  b()\nwhen 4, 5\n  c()\nend\n')
    expect(renderHtml('switch (x) { case 1: case 2: a() }', runs)).toContain('<div class="line" data-node="CaseClause@12-20">')
  })

  it('gives a line the identity of the node it is laid out for', () => {
    const html = renderHtml('{ a }', blocks)
    expect(html).toContain('<div class="line" data-node="ExpressionStatement@1-3">')
    expect(html).toContain('<div class="line">{</div>')
  })
})
