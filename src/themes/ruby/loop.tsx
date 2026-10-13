import ts from 'typescript'
import { CommentText, Line, Render, claim, type NodeProps } from '../../core'
import { Branch, isGuardBody } from './if'

/**
 * A while laid out from its fields: `while` plus the condition without
 * parens, the body in an Indent, `end`. A braceless one-statement body
 * reads in Ruby's modifier form, `j++ while j < n`, under the same rule
 * as an `if` guard (see if.tsx): the braces are the author's signal, and
 * only a jump or a plain expression goes before the `while`.
 */
export function RubyWhile({ node, ctx }: NodeProps<ts.WhileStatement>) {
  if (!ts.isBlock(node.statement) && isGuardBody(node.statement)) {
    return (
      <span class="guard">
        <Render node={node.statement} ctx={ctx} /> while <Render node={node.expression} ctx={ctx} />
      </span>
    )
  }
  return (
    <>
      <span class="header">
        while <Render node={node.expression} ctx={ctx} />
      </span>
      <Branch statement={node.statement} ctx={ctx} />
      <Line>end</Line>
    </>
  )
}

/**
 * `do { ... } while (x)` is Ruby's `begin ... end while x`, the one loop
 * whose condition comes after the body. The body block is never rendered
 * as a node, so a comment trailing its `}`, before the `while`, goes on
 * the `end while` line.
 */
export function RubyDoWhile({ node, ctx }: NodeProps<ts.DoStatement>) {
  return (
    <>
      <span class="header">begin</span>
      <Branch statement={node.statement} ctx={ctx} />
      <Line>
        end while <Render node={node.expression} ctx={ctx} />
        {ctx.comments.of(node.statement).trailing.map((c) => (
          <>
            {' '}
            <CommentText key={c.pos} comment={c} ctx={ctx} />
          </>
        ))}
      </Line>
    </>
  )
}

/**
 * `for (const x of xs)` and `for (const k in o)` read as `for x of xs`
 * and `for k in o`, the parens gone as from an `if`, the keyword gone by
 * `rubyVariables` (see variables.tsx), which claims the declaration list
 * the initializer is. The `of` and `in` are kept as written, since they
 * say different things and Ruby's `in` would hide which one it was.
 */
export function RubyForEach({ node, ctx }: NodeProps<ts.ForOfStatement | ts.ForInStatement>) {
  return (
    <>
      <span class="header">
        for {ts.isForOfStatement(node) && node.awaitModifier && 'await '}
        <Render node={node.initializer} ctx={ctx} /> {ts.isForOfStatement(node) ? 'of' : 'in'}{' '}
        <Render node={node.expression} ctx={ctx} />
      </span>
      <Branch statement={node.statement} ctx={ctx} />
      <Line>end</Line>
    </>
  )
}

/**
 * The three-clause for has no Ruby form, so its header stays as written,
 * parens and all, `for (i = 0; i < n; i++)`, only the braces giving way
 * to the Indent and `end`; the `let` goes the way every `let` does. The
 * one Ruby does have is the clauseless `for (;;)`, which reads as `loop
 * do`.
 */
export function RubyFor({ node, ctx }: NodeProps<ts.ForStatement>) {
  const clauses = [node.initializer, node.condition, node.incrementor]
  return (
    <>
      <span class="header">
        {clauses.every((c) => c === undefined) ? (
          'loop do'
        ) : (
          <>
            for ({clauses.map((c, i) => (
              <>
                {i > 0 && ';'}
                {c && (
                  <>
                    {i > 0 && ' '}
                    <Render key={c.pos} node={c} ctx={ctx} />
                  </>
                )}
              </>
            ))}
            )
          </>
        )}
      </span>
      <Branch statement={node.statement} ctx={ctx} />
      <Line>end</Line>
    </>
  )
}

const isForEach = (n: ts.Node): n is ts.ForOfStatement | ts.ForInStatement => ts.isForOfStatement(n) || ts.isForInStatement(n)

export const rubyWhile = claim(ts.isWhileStatement, RubyWhile, '`while (x) { ... }` reads as `while x ... end`; `while (x) f()` as `f() while x`')
export const rubyDoWhile = claim(ts.isDoStatement, RubyDoWhile, '`do { ... } while (x)` reads as `begin ... end while x`')
export const rubyForEach = claim(isForEach, RubyForEach, '`for (const x of xs) { ... }` reads as `for x of xs ... end`')
export const rubyFor = claim(ts.isForStatement, RubyFor, '`for (;;) { ... }` reads as `loop do ... end`; `for (i = 0; i < n; i++) { ... }` keeps its header and reads `... end`')
