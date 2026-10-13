import ts from 'typescript'
import { Line, Reading, Render, claim, type Ctx, type NodeProps } from '../../core'

/**
 * Ruby reads a method's value off its last line. The kinds of function
 * the theme reads that way: a declaration, a function expression, a
 * method. Not a constructor, whose `new` returns the object whatever the
 * body says; not an arrow function or an accessor, which the theme shows
 * as written, braces and all.
 */
const readsLastLine = (n: ts.Node): n is ts.FunctionDeclaration | ts.FunctionExpression | ts.MethodDeclaration =>
  ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isMethodDeclaration(n)

const lastOf = (block: ts.Block): ts.Statement | undefined => block.statements[block.statements.length - 1]

/** The body this statement closes, when it is the last statement of one Ruby reads the value off. */
function bodyClosedBy(statement: ts.Statement): ts.Block | undefined {
  const block = statement.parent
  return ts.isBlock(block) && readsLastLine(block.parent) && lastOf(block) === statement ? block : undefined
}

const isLastReturn = (n: ts.Node): n is ts.ReturnStatement & { expression: ts.Expression } =>
  ts.isReturnStatement(n) && n.expression !== undefined && bodyClosedBy(n) !== undefined

/**
 * The last `return x` of a body reads as `x`: Ruby returns the value of
 * the last line, so the keyword is noise there. Only there. A `return`
 * earlier in the body, or inside an `if` block, leaves early and keeps
 * its word; a bare `return` has no value to leave behind and stays too.
 */
export function RubyLastReturn({ node, ctx }: NodeProps<ts.ReturnStatement & { expression: ts.Expression }>) {
  return <Render node={node.expression} ctx={ctx} />
}

export const rubyLastReturn = claim(isLastReturn, RubyLastReturn, '`return x` as the last line reads as `x`, the value of the line')

/**
 * Whether a statement leaves the function on every path through it: a
 * jump, a block ending in one, an `if` whose both branches do. The
 * syntax alone says this much; the checker's flow analysis is not public.
 */
function leaves(s: ts.Statement): boolean {
  if (ts.isReturnStatement(s) || ts.isThrowStatement(s)) return true
  if (ts.isBlock(s)) {
    const last = lastOf(s)
    return last !== undefined && leaves(last)
  }
  if (ts.isIfStatement(s)) return s.elseStatement !== undefined && leaves(s.thenStatement) && leaves(s.elseStatement)
  return false
}

const NOTE = 'a last line that is not a `return` gets `return undefined` after it: the function returns that, where Ruby would return the line'

/**
 * The line a body needs after its last statement when that statement is
 * not a `return`: Ruby would read the statement's value as the
 * function's, and the function returns `undefined` instead, so the theme
 * says so, in words of its own. The mark is the last statement's, since
 * that is the line the reader would have misread.
 *
 * An empty body gets no line: Ruby's `nil` and this `undefined` say the
 * same nothing. A body whose last statement leaves on every path (see
 * `leaves`) gets none either, since the end is never reached.
 */
export function UndefinedReturn({ fn, ctx }: { fn: ts.SignatureDeclaration; ctx: Ctx }) {
  const body = readsLastLine(fn) ? fn.body : undefined
  const last = body && lastOf(body)
  if (!last || leaves(last)) return null
  return (
    <Line>
      <Reading node={last} note={NOTE}>
        return undefined
      </Reading>
    </Line>
  )
}
