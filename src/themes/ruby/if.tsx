import ts from 'typescript'
import { Indent, Line, Lines, Render, claim, type Ctx, type NodeProps } from '../../core'

/**
 * The branch body: a block's statements, or a lone statement, one per line
 * under an Indent. A lone statement that is not a guard (see below) reads
 * the same as a one-statement block.
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

/** Statements that read naturally before a trailing `if`: jumps and plain expressions. */
const isGuardBody = (s: ts.Statement) =>
  ts.isReturnStatement(s) ||
  ts.isThrowStatement(s) ||
  ts.isBreakStatement(s) ||
  ts.isContinueStatement(s) ||
  ts.isExpressionStatement(s)

/**
 * `if (x) return 0`: no else, no braces, one guard-like statement. The
 * braces are the author's signal; `if (x) { return 0 }` keeps the block form.
 */
const isGuard = (node: ts.IfStatement) => !node.elseStatement && isGuardBody(node.thenStatement)

/**
 * An if laid out from its fields. A guard reads in Ruby's modifier form,
 * `return 0 if x`, on the one line the parent's `Lines` gives it. Anything
 * else is `if` plus the condition without parens, the branches in Indents,
 * `elsif`/`else` lines, `end`. Either way the header is inline, like
 * RubyFunction's.
 */
export function RubyIf({ node, ctx }: NodeProps<ts.IfStatement>) {
  if (isGuard(node)) {
    return (
      <span class="guard">
        <Render node={node.thenStatement} ctx={ctx} /> if <Render node={node.expression} ctx={ctx} />
      </span>
    )
  }
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

/** `if (x) { ... } else if (y) { ... } else { ... }` reads as `if x ... elsif y ... else ... end`; `if (x) return` as `return if x`. */
export const rubyIf = claim(ts.isIfStatement, RubyIf)
