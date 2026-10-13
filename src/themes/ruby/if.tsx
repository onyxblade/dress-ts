import ts from 'typescript'
import { Indent, Line, Lines, Render, claim, type Ctx, type NodeProps } from '../../core'

/**
 * The branch body: a block's statements, or a lone statement, one per line
 * under an Indent. Ruby has no single-statement form that skips `end`, so
 * `if (x) y` and `if (x) { y }` read the same.
 */
function Branch({ statement, ctx }: { statement: ts.Statement; ctx: Ctx }) {
  const nodes = ts.isBlock(statement) ? statement.statements : [statement]
  return (
    <Indent>
      <Lines nodes={nodes} ctx={ctx} />
    </Indent>
  )
}

/**
 * The else part of an if. An `else if` is not a nested statement with its
 * own `end` but an `elsif` line of the same construct, so the chain is
 * flattened here rather than handed to the resolver.
 */
function Else({ statement, ctx }: { statement: ts.Statement; ctx: Ctx }) {
  if (ts.isIfStatement(statement)) {
    return (
      <>
        <Line>
          elsif <Render node={statement.expression} ctx={ctx} />
        </Line>
        <Branch statement={statement.thenStatement} ctx={ctx} />
        {statement.elseStatement && <Else statement={statement.elseStatement} ctx={ctx} />}
      </>
    )
  }
  return (
    <>
      <Line>else</Line>
      <Branch statement={statement} ctx={ctx} />
    </>
  )
}

/**
 * An if laid out from its fields: `if` plus the condition without parens,
 * the branches in Indents, `elsif`/`else` lines, `end`. The header is
 * inline, like RubyFunction's, since the parent's `Lines` gives it its line.
 */
export function RubyIf({ node, ctx }: NodeProps<ts.IfStatement>) {
  return (
    <>
      <span class="header">
        if <Render node={node.expression} ctx={ctx} />
      </span>
      <Branch statement={node.thenStatement} ctx={ctx} />
      {node.elseStatement && <Else statement={node.elseStatement} ctx={ctx} />}
      <Line>end</Line>
    </>
  )
}

/** `if (x) { ... } else if (y) { ... } else { ... }` reads as `if x ... elsif y ... else ... end`. */
export const rubyIf = claim(ts.isIfStatement, RubyIf)
